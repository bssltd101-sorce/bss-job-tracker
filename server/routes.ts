import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertJobSchema, insertJobUpdateSchema } from "@shared/schema";
import { z } from "zod";

const MemStore = MemoryStore(session);

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

declare module "express-session" {
  interface SessionData {
    userId?: number;
    userRole?: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ error: "Unauthorised" });
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.userRole !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

export function registerRoutes(httpServer: Server, app: Express) {
  app.use(
    session({
      secret: "bss-job-tracker-secret-2024",
      resave: false,
      saveUninitialized: false,
      store: new MemStore({ checkPeriod: 86400000 }),
      cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: "lax" },
    })
  );

  // ─── Auth ──────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const user = storage.getUserByEmail(email.toLowerCase().trim());
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    req.session.userId = user.id;
    req.session.userRole = user.role;
    const { password: _pw, ...safeUser } = user;
    return res.json({ user: safeUser });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const user = storage.getUserById(req.session.userId!);
    if (!user) return res.status(401).json({ error: "Not found" });
    const { password: _pw, ...safeUser } = user;
    res.json(safeUser);
  });

  // ─── Users (admin) ────────────────────────────────────────────────────────
  app.get("/api/users", requireAdmin, (_req, res) => {
    const clients = storage.getAllClients();
    res.json(clients.map(({ password: _pw, ...u }) => u));
  });

  app.post("/api/users", requireAdmin, (req, res) => {
    const { email, password, name, company, phone } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "email, password and name required" });
    const existing = storage.getUserByEmail(email.toLowerCase().trim());
    if (existing) return res.status(409).json({ error: "Email already in use" });
    const user = storage.createUser({ email: email.toLowerCase().trim(), password, name, role: "client", company, phone, createdAt: "" });
    const { password: _pw, ...safe } = user;
    res.json(safe);
  });

  // ─── Jobs ─────────────────────────────────────────────────────────────────
  app.get("/api/jobs", requireAuth, (req, res) => {
    if (req.session.userRole === "admin") {
      const allJobs = storage.getAllJobs();
      // Attach client info
      const enriched = allJobs.map((j) => {
        const client = storage.getUserById(j.clientId);
        return { ...j, clientName: client?.name ?? "Unknown", clientEmail: client?.email ?? "" };
      });
      return res.json(enriched);
    }
    const myJobs = storage.getJobsByClientId(req.session.userId!);
    res.json(myJobs);
  });

  app.get("/api/jobs/:id", requireAuth, (req, res) => {
    const job = storage.getJobById(Number(req.params.id));
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (req.session.userRole !== "admin" && job.clientId !== req.session.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const client = storage.getUserById(job.clientId);
    res.json({ ...job, clientName: client?.name ?? "Unknown", clientEmail: client?.email ?? "" });
  });

  app.post("/api/jobs", requireAdmin, (req, res) => {
    try {
      const data = insertJobSchema.parse({ ...req.body, createdAt: "", updatedAt: "" });
      const job = storage.createJob(data);
      // Auto-notification to client
      storage.createNotification({
        userId: job.clientId,
        jobId: job.id,
        message: `New job ${job.reference} has been created for ${job.propertyAddress}.`,
        isRead: 0,
        createdAt: "",
      });
      res.json(job);
    } catch (e) {
      res.status(400).json({ error: "Invalid job data", details: String(e) });
    }
  });

  app.patch("/api/jobs/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const job = storage.getJobById(id);
    if (!job) return res.status(404).json({ error: "Not found" });
    const oldStatus = job.status;
    const updated = storage.updateJob(id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    // Status change notification
    if (req.body.status && req.body.status !== oldStatus) {
      storage.createNotification({
        userId: updated.clientId,
        jobId: updated.id,
        message: `Job ${updated.reference} status updated to "${updated.status}".`,
        isRead: 0,
        createdAt: "",
      });
    }
    res.json(updated);
  });

  app.delete("/api/jobs/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const job = storage.getJobById(id);
    if (!job) return res.status(404).json({ error: "Not found" });
    storage.deleteJob(id);
    res.json({ ok: true });
  });

  // ─── Job Updates (Timeline) ──────────────────────────────────────────────
  app.get("/api/jobs/:id/updates", requireAuth, (req, res) => {
    const jobId = Number(req.params.id);
    const job = storage.getJobById(jobId);
    if (!job) return res.status(404).json({ error: "Not found" });
    if (req.session.userRole !== "admin" && job.clientId !== req.session.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const isAdmin = req.session.userRole === "admin";
    const updates = storage.getJobUpdates(jobId, isAdmin);
    // Attach author names
    const enriched = updates.map((u) => {
      const author = storage.getUserById(u.authorId);
      return { ...u, authorName: author?.name ?? "Team", authorRole: author?.role ?? "admin" };
    });
    res.json(enriched);
  });

  app.post("/api/jobs/:id/updates", requireAuth, (req, res) => {
    const jobId = Number(req.params.id);
    const job = storage.getJobById(jobId);
    if (!job) return res.status(404).json({ error: "Not found" });
    if (req.session.userRole !== "admin" && job.clientId !== req.session.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const isInternal = req.session.userRole === "admin" && req.body.isInternal ? 1 : 0;
    const update = storage.createJobUpdate({
      jobId,
      authorId: req.session.userId!,
      message: req.body.message,
      isInternal,
      createdAt: "",
    });
    // Notify client of new public update
    if (!isInternal) {
      storage.createNotification({
        userId: job.clientId,
        jobId: job.id,
        message: `New update on job ${job.reference}: "${req.body.message.substring(0, 80)}..."`,
        isRead: 0,
        createdAt: "",
      });
    }
    const author = storage.getUserById(req.session.userId!);
    res.json({ ...update, authorName: author?.name ?? "Team", authorRole: author?.role ?? "admin" });
  });

  // ─── Files ────────────────────────────────────────────────────────────────
  app.get("/api/jobs/:id/files", requireAuth, (req, res) => {
    const jobId = Number(req.params.id);
    const job = storage.getJobById(jobId);
    if (!job) return res.status(404).json({ error: "Not found" });
    if (req.session.userRole !== "admin" && job.clientId !== req.session.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(storage.getJobFiles(jobId));
  });

  app.post("/api/jobs/:id/files", requireAdmin, upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const jobId = Number(req.params.id);
    const job = storage.getJobById(jobId);
    if (!job) return res.status(404).json({ error: "Not found" });
    const fileRecord = storage.createFile({
      jobId,
      uploadedById: req.session.userId!,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      category: req.body.category || "other",
      caption: req.body.caption || null,
      createdAt: "",
    });
    res.json(fileRecord);
  });

  app.delete("/api/files/:id", requireAdmin, (req, res) => {
    storage.deleteFile(Number(req.params.id));
    res.json({ ok: true });
  });

  // Serve uploaded files
  app.get("/api/uploads/:filename", requireAuth, (req, res) => {
    const filePath = path.join(UPLOADS_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
    res.sendFile(filePath);
  });

  // ─── Notifications ────────────────────────────────────────────────────────
  app.get("/api/notifications", requireAuth, (req, res) => {
    const notifs = storage.getNotificationsForUser(req.session.userId!);
    res.json(notifs);
  });

  app.get("/api/notifications/unread-count", requireAuth, (req, res) => {
    res.json({ count: storage.getUnreadCount(req.session.userId!) });
  });

  app.patch("/api/notifications/:id/read", requireAuth, (req, res) => {
    storage.markNotificationRead(Number(req.params.id));
    res.json({ ok: true });
  });

  app.patch("/api/notifications/read-all", requireAuth, (req, res) => {
    storage.markAllNotificationsRead(req.session.userId!);
    res.json({ ok: true });
  });

  // ─── Dashboard Stats (admin) ──────────────────────────────────────────────
  app.get("/api/stats", requireAdmin, (_req, res) => {
    const allJobs = storage.getAllJobs();
    const stats = {
      total: allJobs.length,
      active: allJobs.filter((j) => !["Completed"].includes(j.status)).length,
      completed: allJobs.filter((j) => j.status === "Completed").length,
      booked: allJobs.filter((j) => j.status === "Booked").length,
      inProgress: allJobs.filter((j) => j.status === "In Progress").length,
      awaitingParts: allJobs.filter((j) => j.status === "Awaiting Parts").length,
      clients: storage.getAllClients().length,
    };
    res.json(stats);
  });
}
