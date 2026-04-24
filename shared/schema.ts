import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("client"), // "admin" | "client"
  company: text("company"),
  phone: text("phone"),
  hasCompletedSetup: integer("has_completed_setup").notNull().default(0),
  createdAt: text("created_at").notNull().default(""),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reference: text("reference").notNull().unique(), // e.g. BSS-2024-001
  clientId: integer("client_id").notNull(),
  propertyAddress: text("property_address").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("Booked"), // Booked | In Progress | Awaiting Parts | On Hold | Completed
  progress: integer("progress").notNull().default(0), // 0–100
  jobType: text("job_type").notNull().default("Maintenance"), // Maintenance | Renovation | Inspection | Emergency
  priority: text("priority").notNull().default("Normal"), // Low | Normal | High | Urgent
  estimatedValue: real("estimated_value"),
  invoiceValue: real("invoice_value"),
  paymentStatus: text("payment_status").notNull().default("Pending"), // Pending | Invoiced | Paid
  startDate: text("start_date"),
  completedDate: text("completed_date"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

// ─── Job Updates (Timeline) ──────────────────────────────────────────────────
export const jobUpdates = sqliteTable("job_updates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id").notNull(),
  authorId: integer("author_id").notNull(),
  message: text("message").notNull(),
  isInternal: integer("is_internal").notNull().default(0), // 0 = visible to client, 1 = admin only
  createdAt: text("created_at").notNull().default(""),
});

export const insertJobUpdateSchema = createInsertSchema(jobUpdates).omit({ id: true, createdAt: true });
export type InsertJobUpdate = z.infer<typeof insertJobUpdateSchema>;
export type JobUpdate = typeof jobUpdates.$inferSelect;

// ─── Files ───────────────────────────────────────────────────────────────────
export const files = sqliteTable("files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id").notNull(),
  uploadedById: integer("uploaded_by_id").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  category: text("category").notNull().default("other"), // before | during | after | quote | invoice | report | other
  caption: text("caption"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertFileSchema = createInsertSchema(files).omit({ id: true, createdAt: true });
export type InsertFile = z.infer<typeof insertFileSchema>;
export type JobFile = typeof files.$inferSelect;

// ─── Notifications ───────────────────────────────────────────────────────────
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  jobId: integer("job_id"),
  message: text("message").notNull(),
  isRead: integer("is_read").notNull().default(0),
  createdAt: text("created_at").notNull().default(""),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ─── Properties ──────────────────────────────────────────────────────────────
export const properties = sqliteTable("properties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  name: text("name").notNull(), // e.g. "Maple Court"
  address: text("address").notNull(),
  propertyType: text("property_type").notNull().default("Residential Block"), // Residential Block | Commercial | House | Flat
  propertyCode: text("property_code").notNull().unique().default(""),
  createdAt: text("created_at").notNull().default(""),
});
export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, createdAt: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

// ─── Cleaning Contracts ───────────────────────────────────────────────────────
export const cleaningContracts = sqliteTable("cleaning_contracts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyId: integer("property_id").notNull(),
  clientId: integer("client_id").notNull(),
  contractRef: text("contract_ref").default(""),
  frequency: text("frequency").notNull().default("Weekly"), // Weekly | Fortnightly | Monthly
  dayOfWeek: text("day_of_week"), // e.g. "Thursday"
  operativeName: text("operative_name"),
  areas: text("areas").notNull().default("[]"), // JSON array
  notes: text("notes"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: text("created_at").notNull().default(""),
});
export const insertCleaningContractSchema = createInsertSchema(cleaningContracts).omit({ id: true, createdAt: true });
export type InsertCleaningContract = z.infer<typeof insertCleaningContractSchema>;
export type CleaningContract = typeof cleaningContracts.$inferSelect;

// ─── Cleaning Logs ────────────────────────────────────────────────────────────
export const cleaningLogs = sqliteTable("cleaning_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contractId: integer("contract_id").notNull(),
  propertyId: integer("property_id").notNull(),
  operativeName: text("operative_name").notNull(),
  scheduledDate: text("scheduled_date").notNull(),
  completedDate: text("completed_date"),
  status: text("status").notNull().default("Scheduled"), // Scheduled | Completed | Missed | Rebooked | Issue Reported
  areasCompleted: text("areas_completed").notNull().default("[]"), // JSON array
  notes: text("notes"),
  issueType: text("issue_type"), // Damage | Leak | Lighting Fault | Fly-tipping | Health & Safety | Other
  issueDescription: text("issue_description"),
  createdAt: text("created_at").notNull().default(""),
});
export const insertCleaningLogSchema = createInsertSchema(cleaningLogs).omit({ id: true, createdAt: true });
export type InsertCleaningLog = z.infer<typeof insertCleaningLogSchema>;
export type CleaningLog = typeof cleaningLogs.$inferSelect;

// ─── Cleaning Log Files ───────────────────────────────────────────────────────
export const cleaningFiles = sqliteTable("cleaning_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  logId: integer("log_id").notNull(),
  uploadedById: integer("uploaded_by_id").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: text("created_at").notNull().default(""),
});
export const insertCleaningFileSchema = createInsertSchema(cleaningFiles).omit({ id: true, createdAt: true });
export type InsertCleaningFile = z.infer<typeof insertCleaningFileSchema>;
export type CleaningFile = typeof cleaningFiles.$inferSelect;

// ─── Cleaner Assignments ──────────────────────────────────────────────────────
export const cleanerAssignments = sqliteTable("cleaner_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cleanerId: integer("cleaner_id").notNull(), // user with role="cleaner"
  contractId: integer("contract_id").notNull(), // cleaning_contracts.id
  createdAt: text("created_at").notNull().default(""),
});
export const insertCleanerAssignmentSchema = createInsertSchema(cleanerAssignments).omit({ id: true, createdAt: true });
export type InsertCleanerAssignment = z.infer<typeof insertCleanerAssignmentSchema>;
export type CleanerAssignment = typeof cleanerAssignments.$inferSelect;

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  threadType: text("thread_type").notNull(), // "job" | "cleaning"
  threadId: integer("thread_id").notNull(), // jobId or cleaningLogId
  authorId: integer("author_id").notNull(),
  message: text("message").notNull(),
  isInternal: integer("is_internal").notNull().default(0),
  messageType: text("message_type").notNull().default("message"), // message | question | issue | additional_works | update_request
  createdAt: text("created_at").notNull().default(""),
});
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
