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

  // Client first-time setup — set password + mark consent given
  app.post("/api/auth/complete-setup", requireAuth, (req, res) => {
    const { newPassword, agreedToTerms, agreedToGdpr } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    if (!agreedToTerms || !agreedToGdpr) {
      return res.status(400).json({ error: "You must agree to the Terms and GDPR policy" });
    }
    const updated = storage.updateUser(req.session.userId!, {
      password: newPassword,
      hasCompletedSetup: 1,
    } as any);
    if (!updated) return res.status(404).json({ error: "User not found" });
    const { password: _pw, ...safe } = updated;
    res.json({ user: safe });
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

  // ─── Properties ───────────────────────────────────────────────────────────
  app.get("/api/properties", requireAuth, (req, res) => {
    if (req.session.userRole === "admin") {
      return res.json(storage.getAllProperties());
    }
    return res.json(storage.getPropertiesByClientId(req.session.userId!));
  });

  app.post("/api/properties", requireAdmin, (req, res) => {
    const { clientId, name, address, propertyType } = req.body;
    if (!clientId || !name || !address) return res.status(400).json({ error: "clientId, name and address required" });
    const prop = storage.createProperty({ clientId: Number(clientId), name, address, propertyType: propertyType || "Residential Block", createdAt: "" });
    res.json(prop);
  });

  app.get("/api/properties/:id", requireAuth, (req, res) => {
    const prop = storage.getPropertyById(Number(req.params.id));
    if (!prop) return res.status(404).json({ error: "Not found" });
    if (req.session.userRole !== "admin" && prop.clientId !== req.session.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(prop);
  });

  // ─── Cleaning Contracts ───────────────────────────────────────────────────
  app.get("/api/cleaning/contracts", requireAuth, (req, res) => {
    if (req.session.userRole === "admin") {
      const contracts = storage.getAllCleaningContracts();
      const enriched = contracts.map((c) => {
        const prop = storage.getPropertyById(c.propertyId);
        const client = storage.getUserById(c.clientId);
        return { ...c, propertyName: prop?.name ?? "", propertyAddress: prop?.address ?? "", clientName: client?.name ?? "" };
      });
      return res.json(enriched);
    }
    const contracts = storage.getCleaningContractsByClientId(req.session.userId!);
    const enriched = contracts.map((c) => {
      const prop = storage.getPropertyById(c.propertyId);
      return { ...c, propertyName: prop?.name ?? "", propertyAddress: prop?.address ?? "" };
    });
    return res.json(enriched);
  });

  app.get("/api/cleaning/contracts/:id", requireAuth, (req, res) => {
    const contract = storage.getCleaningContractById(Number(req.params.id));
    if (!contract) return res.status(404).json({ error: "Not found" });
    if (req.session.userRole !== "admin" && contract.clientId !== req.session.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const prop = storage.getPropertyById(contract.propertyId);
    res.json({ ...contract, propertyName: prop?.name ?? "", propertyAddress: prop?.address ?? "" });
  });

  app.post("/api/cleaning/contracts", requireAdmin, (req, res) => {
    const { propertyId, clientId, contractRef, frequency, dayOfWeek, operativeName, areas, notes } = req.body;
    if (!propertyId || !clientId) return res.status(400).json({ error: "propertyId and clientId required" });
    const contract = storage.createCleaningContract({
      propertyId: Number(propertyId),
      clientId: Number(clientId),
      contractRef: contractRef || "",
      frequency: frequency || "Weekly",
      dayOfWeek: dayOfWeek || null,
      operativeName: operativeName || null,
      areas: Array.isArray(areas) ? JSON.stringify(areas) : (areas || "[]"),
      notes: notes || null,
      isActive: 1,
      createdAt: "",
    });
    res.json(contract);
  });

  app.patch("/api/cleaning/contracts/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const existing = storage.getCleaningContractById(id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const updated = storage.updateCleaningContract(id, req.body);
    res.json(updated);
  });

  // ─── Cleaning Logs ────────────────────────────────────────────────────────
  app.get("/api/cleaning/logs", requireAuth, (req, res) => {
    if (req.session.userRole === "admin") {
      const logs = storage.getAllCleaningLogs();
      const enriched = logs.map((l) => {
        const prop = storage.getPropertyById(l.propertyId);
        return { ...l, propertyName: prop?.name ?? "", propertyAddress: prop?.address ?? "" };
      });
      return res.json(enriched);
    }
    // Client: get logs for their properties
    const myProps = storage.getPropertiesByClientId(req.session.userId!);
    const logs: ReturnType<typeof storage.getCleaningLogsByPropertyId> = [];
    for (const p of myProps) {
      logs.push(...storage.getCleaningLogsByPropertyId(p.id));
    }
    logs.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
    const enriched = logs.map((l) => {
      const prop = storage.getPropertyById(l.propertyId);
      return { ...l, propertyName: prop?.name ?? "", propertyAddress: prop?.address ?? "" };
    });
    return res.json(enriched);
  });

  app.get("/api/cleaning/logs/:id", requireAuth, (req, res) => {
    const log = storage.getCleaningLogById(Number(req.params.id));
    if (!log) return res.status(404).json({ error: "Not found" });
    const prop = storage.getPropertyById(log.propertyId);
    if (req.session.userRole !== "admin" && prop?.clientId !== req.session.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json({ ...log, propertyName: prop?.name ?? "", propertyAddress: prop?.address ?? "", clientId: prop?.clientId });
  });

  app.post("/api/cleaning/logs", requireAdmin, (req, res) => {
    const { contractId, propertyId, operativeName, scheduledDate, completedDate, status, areasCompleted, notes, issueType, issueDescription } = req.body;
    if (!contractId || !propertyId || !operativeName || !scheduledDate) {
      return res.status(400).json({ error: "contractId, propertyId, operativeName and scheduledDate required" });
    }
    const log = storage.createCleaningLog({
      contractId: Number(contractId),
      propertyId: Number(propertyId),
      operativeName,
      scheduledDate,
      completedDate: completedDate || null,
      status: status || "Scheduled",
      areasCompleted: Array.isArray(areasCompleted) ? JSON.stringify(areasCompleted) : (areasCompleted || "[]"),
      notes: notes || null,
      issueType: issueType || null,
      issueDescription: issueDescription || null,
      createdAt: "",
    });
    res.json(log);
  });

  app.patch("/api/cleaning/logs/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const existing = storage.getCleaningLogById(id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const payload = { ...req.body };
    if (Array.isArray(payload.areasCompleted)) {
      payload.areasCompleted = JSON.stringify(payload.areasCompleted);
    }
    const updated = storage.updateCleaningLog(id, payload);
    res.json(updated);
  });

  app.post("/api/cleaning/logs/:id/files", requireAuth, upload.array("files", 20), (req, res) => {
    const logId = Number(req.params.id);
    const log = storage.getCleaningLogById(logId);
    if (!log) return res.status(404).json({ error: "Not found" });
    const uploadedFiles = req.files as Express.Multer.File[];
    if (!uploadedFiles || uploadedFiles.length === 0) return res.status(400).json({ error: "No files uploaded" });
    const saved = uploadedFiles.map((f) =>
      storage.createCleaningFile({
        logId,
        uploadedById: req.session.userId!,
        filename: f.filename,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        createdAt: "",
      })
    );
    res.json(saved);
  });

  app.get("/api/cleaning/logs/:id/files", requireAuth, (req, res) => {
    const logId = Number(req.params.id);
    const log = storage.getCleaningLogById(logId);
    if (!log) return res.status(404).json({ error: "Not found" });
    const prop = storage.getPropertyById(log.propertyId);
    if (req.session.userRole !== "admin" && prop?.clientId !== req.session.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(storage.getCleaningFiles(logId));
  });

  // ─── Messages ─────────────────────────────────────────────────────────────
  app.get("/api/messages/:threadType/:threadId", requireAuth, (req, res) => {
    const { threadType, threadId } = req.params;
    const isAdmin = req.session.userRole === "admin";
    // Verify access
    if (threadType === "job") {
      const job = storage.getJobById(Number(threadId));
      if (!job) return res.status(404).json({ error: "Not found" });
      if (!isAdmin && job.clientId !== req.session.userId) return res.status(403).json({ error: "Forbidden" });
    } else if (threadType === "cleaning") {
      const log = storage.getCleaningLogById(Number(threadId));
      if (!log) return res.status(404).json({ error: "Not found" });
      const prop = storage.getPropertyById(log.propertyId);
      if (!isAdmin && prop?.clientId !== req.session.userId) return res.status(403).json({ error: "Forbidden" });
    }
    const msgs = storage.getMessages(threadType, Number(threadId), isAdmin);
    const enriched = msgs.map((m) => {
      const author = storage.getUserById(m.authorId);
      return { ...m, authorName: author?.name ?? "Unknown", authorRole: author?.role ?? "client" };
    });
    res.json(enriched);
  });

  app.post("/api/messages/:threadType/:threadId", requireAuth, (req, res) => {
    const { threadType, threadId } = req.params;
    const isAdmin = req.session.userRole === "admin";
    const threadIdNum = Number(threadId);
    let clientId: number | null = null;

    if (threadType === "job") {
      const job = storage.getJobById(threadIdNum);
      if (!job) return res.status(404).json({ error: "Not found" });
      if (!isAdmin && job.clientId !== req.session.userId) return res.status(403).json({ error: "Forbidden" });
      clientId = job.clientId;
    } else if (threadType === "cleaning") {
      const log = storage.getCleaningLogById(threadIdNum);
      if (!log) return res.status(404).json({ error: "Not found" });
      const prop = storage.getPropertyById(log.propertyId);
      if (!isAdmin && prop?.clientId !== req.session.userId) return res.status(403).json({ error: "Forbidden" });
      clientId = prop?.clientId ?? null;
    }

    const isInternal = isAdmin && req.body.isInternal ? 1 : 0;
    const messageType = req.body.messageType || "message";

    const msg = storage.createMessage({
      threadType,
      threadId: threadIdNum,
      authorId: req.session.userId!,
      message: req.body.message,
      isInternal,
      messageType,
      createdAt: "",
    });

    // Notifications
    if (!isAdmin && clientId) {
      // Client messaging admin — notify admin (userId=1)
      storage.createNotification({
        userId: 1,
        jobId: threadType === "job" ? threadIdNum : undefined,
        message: `Client message on ${threadType} #${threadId}: "${req.body.message.substring(0, 80)}"`,
        isRead: 0,
        createdAt: "",
      });
    } else if (isAdmin && !isInternal && clientId) {
      // Admin messaging client — notify client
      storage.createNotification({
        userId: clientId,
        jobId: threadType === "job" ? threadIdNum : undefined,
        message: `New message on your ${threadType}: "${req.body.message.substring(0, 80)}"`,
        isRead: 0,
        createdAt: "",
      });
    }

    const author = storage.getUserById(req.session.userId!);
    res.json({ ...msg, authorName: author?.name ?? "Unknown", authorRole: author?.role ?? "client" });
  });

  // ─── Cleaners (admin) ──────────────────────────────────────────────────────────────
  // Get all cleaners
  app.get("/api/cleaners", requireAdmin, (_req, res) => {
    const cleaners = storage.getAllCleaners();
    res.json(cleaners.map(({ password: _pw, ...u }) => u));
  });

  // Create cleaner account
  app.post("/api/cleaners", requireAdmin, (req, res) => {
    const { email, name, phone } = req.body;
    if (!email || !name) return res.status(400).json({ error: "email and name required" });
    const existing = storage.getUserByEmail(email.toLowerCase().trim());
    if (existing) return res.status(409).json({ error: "Email already in use" });
    const user = storage.createUser({
      email: email.toLowerCase().trim(),
      password: "changeme123",
      name,
      role: "cleaner",
      company: "BSS Ltd",
      phone: phone || "",
      hasCompletedSetup: 0,
    });
    const { password: _pw, ...safe } = user;
    res.json(safe);
  });

  // Assign cleaner to contract
  app.post("/api/cleaners/:id/assignments", requireAdmin, (req, res) => {
    const cleanerId = Number(req.params.id);
    const { contractId } = req.body;
    if (!contractId) return res.status(400).json({ error: "contractId required" });
    const assignment = storage.createCleanerAssignment({ cleanerId, contractId, createdAt: "" });
    res.json(assignment);
  });

  // Get assignments for a cleaner
  app.get("/api/cleaners/:id/assignments", requireAdmin, (req, res) => {
    const assignments = storage.getCleanerAssignments(Number(req.params.id));
    res.json(assignments);
  });

  // Remove assignment
  app.delete("/api/cleaners/assignments/:id", requireAdmin, (req, res) => {
    storage.deleteCleanerAssignment(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── Cleaner's own data ────────────────────────────────────────────────────────────
  // Get contracts assigned to the logged-in cleaner
  app.get("/api/cleaner/contracts", (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorised" });
    if (req.session.userRole !== "cleaner" && req.session.userRole !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const contracts = storage.getContractsByCleanerId(req.session.userId);
    res.json(contracts);
  });

  // ─── GDPR Export ──────────────────────────────────────────────────────────
  app.get("/api/export/clients", requireAdmin, (_req, res) => {
    const clients = storage.getAllClients();
    const allJobs = storage.getAllJobs();
    const allProps = storage.getAllProperties();

    const header = "Name,Email,Phone,Company,Properties,Jobs Count,Created At\n";
    const rows = clients.map((c) => {
      const jobs = allJobs.filter((j) => j.clientId === c.id);
      const props = allProps.filter((p) => p.clientId === c.id);
      const propAddresses = props.map((p) => p.address).join(" | ");
      const name = `"${c.name.replace(/"/g, '""')}"`;
      const email = `"${c.email.replace(/"/g, '""')}"`;
      const phone = `"${(c.phone ?? "").replace(/"/g, '""')}"`;
      const company = `"${(c.company ?? "").replace(/"/g, '""')}"`;
      const propsCell = `"${propAddresses.replace(/"/g, '""')}"`;
      const createdAt = c.createdAt ? c.createdAt.slice(0, 10) : "";
      return `${name},${email},${phone},${company},${propsCell},${jobs.length},${createdAt}`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="bss-clients-export.csv"');
    res.send(header + rows.join("\n"));
  });
}
