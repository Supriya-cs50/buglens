import { z } from "zod";

export const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export const PRIORITIES = ["P0", "P1", "P2", "P3"] as const;
export const CATEGORIES = ["AUTH", "PAYMENT", "UI_UX", "PERFORMANCE", "DATA", "API", "SECURITY", "INFRASTRUCTURE", "OTHER"] as const;
export const REPORT_STATUSES = ["PENDING", "ANALYZING", "ANALYZED", "FAILED"] as const;

const requiredText = z.string().trim().min(1).max(4000);

export const bugAnalysisSchema = z.object({
  summary: z.string().trim().min(1).max(1200),
  severity: z.enum(SEVERITIES),
  priority: z.enum(PRIORITIES),
  category: z.enum(CATEGORIES),
  impact: z.string().trim().min(1).max(3000),
  stepsToReproduce: z.array(z.string().trim().min(1).max(1000)).max(12),
  expectedBehavior: z.string().trim().min(1).max(2000),
  actualBehavior: z.string().trim().min(1).max(2000),
  environment: z.string().trim().min(1).max(1000),
  possibleRootCause: z.string().trim().min(1).max(3000),
  recommendedAction: z.string().trim().min(1).max(3000),
}).strict();

export type BugAnalysis = z.infer<typeof bugAnalysisSchema>;

export const createReportSchema = z.object({
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().min(10).max(20000),
  environment: z.string().trim().max(1000).optional().default(""),
  appModule: z.string().trim().max(120).optional().default(""),
  reportedSeverity: z.enum(SEVERITIES).optional(),
  status: z.enum(["PENDING", "ANALYZED", "FAILED"]).optional(),
});

export const updateReportSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(3).max(255).optional(),
  description: z.string().trim().min(10).max(20000).optional(),
  environment: z.string().trim().max(1000).optional(),
  appModule: z.string().trim().max(120).optional(),
  reportedSeverity: z.enum(SEVERITIES).nullable().optional(),
  status: z.enum(["PENDING", "ANALYZED", "FAILED"]).optional(),
}).refine(value => Object.keys(value).some(key => key !== "id"), "At least one field is required");

export const reportListSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(255).default(""),
  severity: z.enum(SEVERITIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  category: z.enum(CATEGORIES).optional(),
  status: z.enum(REPORT_STATUSES).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128)
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(128),
});

export const importedReportSchema = z.object({
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().min(10).max(20000),
  environment: z.string().trim().max(1000).optional().default(""),
});

export const csvBatchSchema = z.object({
  name: z.string().trim().min(1).max(255),
  reports: z.array(importedReportSchema).min(1).max(100),
});
