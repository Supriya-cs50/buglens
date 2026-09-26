import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  disabled: boolean("disabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const batches = mysqlTable("batches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["QUEUED", "PROCESSING", "COMPLETED", "COMPLETED_WITH_ERRORS"]).default("QUEUED").notNull(),
  totalReports: int("totalReports").default(0).notNull(),
  processedReports: int("processedReports").default(0).notNull(),
  failedReports: int("failedReports").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userCreated: index("batches_user_created_idx").on(table.userId, table.createdAt) }));

export const bugReports = mysqlTable("bug_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  batchId: int("batchId").references(() => batches.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  rawText: text("rawText").notNull(),
  environment: text("environment"),
  appModule: varchar("appModule", { length: 120 }),
  reportedSeverity: varchar("reportedSeverity", { length: 20 }),
  status: mysqlEnum("status", ["PENDING", "ANALYZING", "ANALYZED", "FAILED"]).default("PENDING").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userCreated: index("bug_reports_user_created_idx").on(table.userId, table.createdAt),
  userStatus: index("bug_reports_user_status_idx").on(table.userId, table.status),
  batchIdx: index("bug_reports_batch_idx").on(table.batchId),
}));

export const bugSummaries = mysqlTable("bug_summaries", {
  id: int("id").autoincrement().primaryKey(),
  bugReportId: int("bugReportId").notNull().references(() => bugReports.id, { onDelete: "cascade" }).unique(),
  summary: text("summary").notNull(),
  severity: mysqlEnum("severity", ["CRITICAL", "HIGH", "MEDIUM", "LOW"]).notNull(),
  priority: mysqlEnum("priority", ["P0", "P1", "P2", "P3"]).notNull(),
  category: mysqlEnum("category", ["AUTH", "PAYMENT", "UI_UX", "PERFORMANCE", "DATA", "API", "SECURITY", "INFRASTRUCTURE", "OTHER"]).notNull(),
  impact: text("impact").notNull(),
  stepsToReproduce: text("stepsToReproduce").notNull(),
  expectedBehavior: text("expectedBehavior").notNull(),
  actualBehavior: text("actualBehavior").notNull(),
  environment: text("environment").notNull(),
  possibleRootCause: text("possibleRootCause").notNull(),
  recommendedAction: text("recommendedAction").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ triage: index("bug_summaries_triage_idx").on(table.severity, table.priority, table.category) }));

export const processingHistory = mysqlTable("processing_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  bugReportId: int("bugReportId").references(() => bugReports.id, { onDelete: "set null" }),
  batchId: int("batchId").references(() => batches.id, { onDelete: "set null" }),
  processingStatus: mysqlEnum("processingStatus", ["PROCESSING", "SUCCESS", "FAILED"]).notNull(),
  processingTime: int("processingTime").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ userCreated: index("processing_history_user_created_idx").on(table.userId, table.createdAt) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type BugReport = typeof bugReports.$inferSelect;
export type BugSummary = typeof bugSummaries.$inferSelect;
