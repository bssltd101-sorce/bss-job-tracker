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
