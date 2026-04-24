import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and } from "drizzle-orm";
import {
  users, jobs, jobUpdates, files, notifications,
  type User, type InsertUser,
  type Job, type InsertJob,
  type JobUpdate, type InsertJobUpdate,
  type JobFile, type InsertFile,
  type Notification, type InsertNotification,
} from "@shared/schema";

const sqlite = new Database("data.db");
export const db = drizzle(sqlite);

// ─── Migrate / seed ───────────────────────────────────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client',
    company TEXT,
    phone TEXT,
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL UNIQUE,
    client_id INTEGER NOT NULL,
    property_address TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Booked',
    progress INTEGER NOT NULL DEFAULT 0,
    job_type TEXT NOT NULL DEFAULT 'Maintenance',
    priority TEXT NOT NULL DEFAULT 'Normal',
    estimated_value REAL,
    invoice_value REAL,
    payment_status TEXT NOT NULL DEFAULT 'Pending',
    start_date TEXT,
    completed_date TEXT,
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS job_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_internal INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    uploaded_by_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    caption TEXT,
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    job_id INTEGER,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ''
  );
`);

function now() {
  return new Date().toISOString();
}

function seedIfEmpty() {
  const adminExists = db.select().from(users).where(eq(users.email, "admin@bssltd.co.uk")).get();
  if (adminExists) return;

  // Admin
  db.insert(users).values({
    email: "admin@bssltd.co.uk",
    password: "admin123",
    name: "BSS Admin",
    role: "admin",
    company: "BSS Ltd",
    phone: "020 7946 0000",
    createdAt: now(),
  }).run();

  // Demo clients
  const client1 = db.insert(users).values({
    email: "john.smith@example.com",
    password: "client123",
    name: "John Smith",
    role: "client",
    company: "Smith Properties",
    phone: "07700 900001",
    createdAt: now(),
  }).returning().get();

  const client2 = db.insert(users).values({
    email: "sarah.jones@estate.co.uk",
    password: "client123",
    name: "Sarah Jones",
    role: "client",
    company: "Jones Estate Management",
    phone: "07700 900002",
    createdAt: now(),
  }).returning().get();

  // Demo jobs
  const job1 = db.insert(jobs).values({
    reference: "BSS-2024-001",
    clientId: client1.id,
    propertyAddress: "42 Maple Street, Islington, London N1 2AB",
    description: "Full bathroom renovation including new suite, tiling, and plumbing upgrade.",
    status: "In Progress",
    progress: 60,
    jobType: "Renovation",
    priority: "Normal",
    estimatedValue: 8500,
    invoiceValue: null,
    paymentStatus: "Pending",
    startDate: "2024-04-15",
    completedDate: null,
    createdAt: now(),
    updatedAt: now(),
  }).returning().get();

  const job2 = db.insert(jobs).values({
    reference: "BSS-2024-002",
    clientId: client1.id,
    propertyAddress: "17 Oak Avenue, Hackney, London E8 3PQ",
    description: "Emergency boiler repair and annual gas safety certificate.",
    status: "Completed",
    progress: 100,
    jobType: "Emergency",
    priority: "Urgent",
    estimatedValue: 1200,
    invoiceValue: 1150,
    paymentStatus: "Invoiced",
    startDate: "2024-04-10",
    completedDate: "2024-04-11",
    createdAt: now(),
    updatedAt: now(),
  }).returning().get();

  const job3 = db.insert(jobs).values({
    reference: "BSS-2024-003",
    clientId: client2.id,
    propertyAddress: "8 Regent Court, Camden, London NW1 7TH",
    description: "Damp proofing, replastering and redecoration of living room and hallway.",
    status: "Awaiting Parts",
    progress: 35,
    jobType: "Maintenance",
    priority: "High",
    estimatedValue: 4200,
    invoiceValue: null,
    paymentStatus: "Pending",
    startDate: "2024-04-18",
    completedDate: null,
    createdAt: now(),
    updatedAt: now(),
  }).returning().get();

  const job4 = db.insert(jobs).values({
    reference: "BSS-2024-004",
    clientId: client2.id,
    propertyAddress: "3 Victoria Mansions, Kensington, London W8 6LR",
    description: "Full kitchen installation including units, worktops, appliances and electrical work.",
    status: "Booked",
    progress: 0,
    jobType: "Renovation",
    priority: "Normal",
    estimatedValue: 15000,
    invoiceValue: null,
    paymentStatus: "Pending",
    startDate: "2024-05-06",
    completedDate: null,
    createdAt: now(),
    updatedAt: now(),
  }).returning().get();

  // Timeline updates
  const adminUser = db.select().from(users).where(eq(users.role, "admin")).get()!;
  
  db.insert(jobUpdates).values([
    { jobId: job1.id, authorId: adminUser.id, message: "Job booked in. Site survey completed. Works scheduled to begin 15 April.", isInternal: 0, createdAt: "2024-04-12T09:00:00.000Z" },
    { jobId: job1.id, authorId: adminUser.id, message: "Bathroom stripped out. Old suite removed and disposed of. Plumbing first fix in progress.", isInternal: 0, createdAt: "2024-04-15T14:30:00.000Z" },
    { jobId: job1.id, authorId: adminUser.id, message: "Note: floor joist needs sistering before tiling can begin. Client not to be charged extra.", isInternal: 1, createdAt: "2024-04-16T10:00:00.000Z" },
    { jobId: job1.id, authorId: adminUser.id, message: "Plumbing second fix complete. New suite installed. Tiling 50% complete.", isInternal: 0, createdAt: "2024-04-20T16:00:00.000Z" },
    { jobId: job2.id, authorId: adminUser.id, message: "Emergency call received. Engineer dispatched within 2 hours.", isInternal: 0, createdAt: "2024-04-10T08:00:00.000Z" },
    { jobId: job2.id, authorId: adminUser.id, message: "Fault identified — heat exchanger failure. Part sourced and ordered for next-day delivery.", isInternal: 0, createdAt: "2024-04-10T11:00:00.000Z" },
    { jobId: job2.id, authorId: adminUser.id, message: "Boiler fully repaired and tested. Gas safety certificate issued. Job complete.", isInternal: 0, createdAt: "2024-04-11T15:00:00.000Z" },
    { jobId: job3.id, authorId: adminUser.id, message: "Initial survey carried out. Significant rising damp identified. Damp treatment to begin immediately.", isInternal: 0, createdAt: "2024-04-18T10:00:00.000Z" },
    { jobId: job3.id, authorId: adminUser.id, message: "Damp treatment applied to affected walls. Waiting 5–7 days for walls to dry before replastering.", isInternal: 0, createdAt: "2024-04-19T14:00:00.000Z" },
    { jobId: job3.id, authorId: adminUser.id, message: "Specialist plaster ordered — awaiting delivery estimated 25 April.", isInternal: 0, createdAt: "2024-04-22T09:30:00.000Z" },
    { jobId: job4.id, authorId: adminUser.id, message: "Job confirmed and booked in. Kitchen units and appliances ordered. Start date 6 May.", isInternal: 0, createdAt: "2024-04-22T10:00:00.000Z" },
  ]).run();

  // Notifications
  db.insert(notifications).values([
    { userId: client1.id, jobId: job1.id, message: "Your job BSS-2024-001 has been updated: tiling is 50% complete.", isRead: 0, createdAt: "2024-04-20T16:00:00.000Z" },
    { userId: client1.id, jobId: job2.id, message: "Your job BSS-2024-002 has been completed. Invoice will follow shortly.", isRead: 1, createdAt: "2024-04-11T15:00:00.000Z" },
    { userId: client2.id, jobId: job3.id, message: "Your job BSS-2024-003 is awaiting specialist plaster delivery (est. 25 April).", isRead: 0, createdAt: "2024-04-22T09:30:00.000Z" },
    { userId: client2.id, jobId: job4.id, message: "Your job BSS-2024-004 has been booked. Works begin 6 May.", isRead: 0, createdAt: "2024-04-22T10:00:00.000Z" },
  ]).run();
}

seedIfEmpty();

// ─── Storage Interface ────────────────────────────────────────────────────────
export interface IStorage {
  // Users
  getUserByEmail(email: string): User | undefined;
  getUserById(id: number): User | undefined;
  getAllClients(): User[];
  createUser(data: InsertUser): User;
  updateUser(id: number, data: Partial<InsertUser>): User | undefined;

  // Jobs
  getJobById(id: number): Job | undefined;
  getJobByReference(ref: string): Job | undefined;
  getJobsByClientId(clientId: number): Job[];
  getAllJobs(): Job[];
  createJob(data: InsertJob): Job;
  updateJob(id: number, data: Partial<InsertJob>): Job | undefined;
  deleteJob(id: number): void;

  // Job Updates
  getJobUpdates(jobId: number, includeInternal: boolean): JobUpdate[];
  createJobUpdate(data: InsertJobUpdate): JobUpdate;

  // Files
  getJobFiles(jobId: number): JobFile[];
  createFile(data: InsertFile): JobFile;
  deleteFile(id: number): void;

  // Notifications
  getNotificationsForUser(userId: number): Notification[];
  markNotificationRead(id: number): void;
  markAllNotificationsRead(userId: number): void;
  createNotification(data: InsertNotification): Notification;
  getUnreadCount(userId: number): number;
}

export const storage: IStorage = {
  getUserByEmail(email) {
    return db.select().from(users).where(eq(users.email, email)).get();
  },
  getUserById(id) {
    return db.select().from(users).where(eq(users.id, id)).get();
  },
  getAllClients() {
    return db.select().from(users).where(eq(users.role, "client")).all();
  },
  createUser(data) {
    return db.insert(users).values({ ...data, createdAt: now() }).returning().get();
  },
  updateUser(id, data) {
    return db.update(users).set(data).where(eq(users.id, id)).returning().get();
  },

  getJobById(id) {
    return db.select().from(jobs).where(eq(jobs.id, id)).get();
  },
  getJobByReference(ref) {
    return db.select().from(jobs).where(eq(jobs.reference, ref)).get();
  },
  getJobsByClientId(clientId) {
    return db.select().from(jobs).where(eq(jobs.clientId, clientId)).orderBy(desc(jobs.createdAt)).all();
  },
  getAllJobs() {
    return db.select().from(jobs).orderBy(desc(jobs.createdAt)).all();
  },
  createJob(data) {
    const t = now();
    return db.insert(jobs).values({ ...data, createdAt: t, updatedAt: t }).returning().get();
  },
  updateJob(id, data) {
    return db.update(jobs).set({ ...data, updatedAt: now() }).where(eq(jobs.id, id)).returning().get();
  },
  deleteJob(id) {
    db.delete(jobs).where(eq(jobs.id, id)).run();
  },

  getJobUpdates(jobId, includeInternal) {
    const q = db.select().from(jobUpdates).where(
      includeInternal
        ? eq(jobUpdates.jobId, jobId)
        : and(eq(jobUpdates.jobId, jobId), eq(jobUpdates.isInternal, 0))
    ).orderBy(desc(jobUpdates.createdAt));
    return q.all();
  },
  createJobUpdate(data) {
    return db.insert(jobUpdates).values({ ...data, createdAt: now() }).returning().get();
  },

  getJobFiles(jobId) {
    return db.select().from(files).where(eq(files.jobId, jobId)).orderBy(desc(files.createdAt)).all();
  },
  createFile(data) {
    return db.insert(files).values({ ...data, createdAt: now() }).returning().get();
  },
  deleteFile(id) {
    db.delete(files).where(eq(files.id, id)).run();
  },

  getNotificationsForUser(userId) {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).all();
  },
  markNotificationRead(id) {
    db.update(notifications).set({ isRead: 1 }).where(eq(notifications.id, id)).run();
  },
  markAllNotificationsRead(userId) {
    db.update(notifications).set({ isRead: 1 }).where(eq(notifications.userId, userId)).run();
  },
  createNotification(data) {
    return db.insert(notifications).values({ ...data, createdAt: now() }).returning().get();
  },
  getUnreadCount(userId) {
    const rows = db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0))).all();
    return rows.length;
  },
};
