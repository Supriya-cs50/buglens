import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, gte, inArray, like, lt, ne, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  batches,
  bugReports,
  bugSummaries,
  processingHistory,
  users,
  type User,
} from "../../drizzle/schema";
import {
  createReportSchema,
  csvBatchSchema,
  loginSchema,
  registerSchema,
  reportListSchema,
  updateReportSchema,
} from "../../shared/buglens";
import { AnalysisUnavailableError, analyzeBugReport } from "../bugAnalysis";
import { clearSession, getRequestUser, hasLocalSession, issueSession, toPublicUser } from "../auth";
import { getDb } from "../db";
import { ENV } from "../_core/env";
import { publicProcedure, router } from "../_core/trpc";

const reportIdSchema = z.object({ id: z.number().int().positive() });
const adminSearchSchema = z.object({ search: z.string().trim().max(255).default("") });

const accountProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const account = hasLocalSession(ctx.req) ? await getRequestUser(ctx.req) : ctx.user;
  if (!account || account.disabled) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to continue." });
  }
  return next({ ctx: { ...ctx, account } });
});

const adminProcedure = accountProcedure.use(async ({ ctx, next }) => {
  if (ctx.account.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required." });
  }
  return next({ ctx });
});

function requiredDb() {
  return getDb().then(db => {
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is temporarily unavailable." });
    return db;
  });
}

function summaryValues(reportId: number, analysis: Awaited<ReturnType<typeof analyzeBugReport>>) {
  return {
    bugReportId: reportId,
    ...analysis,
    stepsToReproduce: JSON.stringify(analysis.stepsToReproduce),
  };
}

function reportSearch(search: string) {
  const escaped = search.replace(/[\\%_]/g, "\\$&");
  const pattern = `%${escaped}%`;
  return search ? or(like(bugReports.title, pattern), like(bugReports.description, pattern)) : undefined;
}

async function countReports(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, where?: any) {
  const result = await db.select({ total: count() }).from(bugReports)
    .leftJoin(bugSummaries, eq(bugReports.id, bugSummaries.bugReportId))
    .where(where);
  return Number(result[0]?.total ?? 0);
}

async function runAnalysis(user: User, reportId: number) {
  const db = await requiredDb();
  const recentAnalyses = await db.select({ total: count() }).from(processingHistory)
    .where(and(eq(processingHistory.userId, user.id), gte(processingHistory.createdAt, new Date(Date.now() - 60_000))));
  if (Number(recentAnalyses[0]?.total ?? 0) >= 120) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Analysis limit reached. Please try again shortly." });
  }
  const found = await db.select().from(bugReports)
    .where(and(eq(bugReports.id, reportId), eq(bugReports.userId, user.id))).limit(1);
  const report = found[0];
  if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Bug report not found." });

  const claimed = await db.update(bugReports).set({ status: "ANALYZING" }).where(and(
    eq(bugReports.id, report.id),
    eq(bugReports.userId, user.id),
    or(ne(bugReports.status, "ANALYZING"), lt(bugReports.updatedAt, new Date(Date.now() - 5 * 60_000))),
  ));
  if (!claimed[0]?.affectedRows) {
    throw new TRPCError({ code: "CONFLICT", message: "This report is already being analyzed." });
  }
  const started = Date.now();
  const historyInsert = await db.insert(processingHistory).values({
    userId: user.id,
    bugReportId: report.id,
    batchId: report.batchId,
    processingStatus: "PROCESSING",
    processingTime: 0,
  });
  const historyId = Number(historyInsert[0].insertId);

  try {
    const analysis = await analyzeBugReport(report);
    await db.insert(bugSummaries).values(summaryValues(report.id, analysis)).onDuplicateKeyUpdate({
      set: summaryValues(report.id, analysis),
    });
    const duration = Date.now() - started;
    await db.update(bugReports).set({ status: "ANALYZED" }).where(eq(bugReports.id, report.id));
    await db.update(processingHistory).set({ processingStatus: "SUCCESS", processingTime: duration }).where(eq(processingHistory.id, historyId));
    return { ...analysis, reportId: report.id, processingTime: duration };
  } catch (error) {
    await db.update(bugReports).set({ status: "FAILED" }).where(eq(bugReports.id, report.id));
    await db.update(processingHistory).set({ processingStatus: "FAILED", processingTime: Date.now() - started }).where(eq(processingHistory.id, historyId));
    if (error instanceof TRPCError) throw error;
    if (error instanceof AnalysisUnavailableError) {
      throw new TRPCError({ code: "BAD_GATEWAY", message: "Unable to analyze this report. Please try again." });
    }
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Unable to analyze this report. Please try again." });
  }
}

export const buglensRouter = router({
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      const account = hasLocalSession(ctx.req) ? await getRequestUser(ctx.req) : ctx.user;
      return account && !account.disabled ? toPublicUser(account) : null;
    }),
    register: publicProcedure.input(registerSchema).mutation(async ({ ctx, input }) => {
      const db = await requiredDb();
      const email = input.email.toLowerCase();
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing.length) throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
      const openId = `local_${randomBytes(20).toString("hex")}`;
      const passwordHash = await bcrypt.hash(input.password, 12);
      await db.insert(users).values({ openId, name: input.name, email, passwordHash, loginMethod: "password", lastSignedIn: new Date() });
      const created = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      const user = created[0];
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to create your account." });
      await issueSession(ctx.res, user);
      return { user: toPublicUser(user) };
    }),
    login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
      const db = await requiredDb();
      const rows = await db.select().from(users).where(eq(users.email, input.email.toLowerCase())).limit(1);
      const user = rows[0];
      const matches = Boolean(user?.passwordHash) && await bcrypt.compare(input.password, user!.passwordHash!);
      if (!user || !matches || user.disabled) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
      await issueSession(ctx.res, user);
      return { user: toPublicUser(user) };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      clearSession(ctx.res);
      return { success: true } as const;
    }),
  }),

  reports: router({
    list: accountProcedure.input(reportListSchema).query(async ({ ctx, input }) => {
      const db = await requiredDb();
      const filters = [eq(bugReports.userId, ctx.account.id), reportSearch(input.search)];
      if (input.severity) filters.push(eq(bugSummaries.severity, input.severity));
      if (input.priority) filters.push(eq(bugSummaries.priority, input.priority));
      if (input.category) filters.push(eq(bugSummaries.category, input.category));
      if (input.status) filters.push(eq(bugReports.status, input.status));
      const where = and(...filters);
      const [items, total] = await Promise.all([
        db.select({ report: bugReports, summary: bugSummaries }).from(bugReports)
          .leftJoin(bugSummaries, eq(bugReports.id, bugSummaries.bugReportId))
          .where(where)
          .orderBy(input.sort === "oldest" ? asc(bugReports.createdAt) : desc(bugReports.createdAt))
          .limit(input.pageSize).offset((input.page - 1) * input.pageSize),
        countReports(db, where),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize, pages: Math.max(1, Math.ceil(total / input.pageSize)) };
    }),
    detail: accountProcedure.input(reportIdSchema).query(async ({ ctx, input }) => {
      const db = await requiredDb();
      const result = await db.select({ report: bugReports, summary: bugSummaries }).from(bugReports)
        .leftJoin(bugSummaries, eq(bugReports.id, bugSummaries.bugReportId))
        .where(and(eq(bugReports.id, input.id), eq(bugReports.userId, ctx.account.id))).limit(1);
      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Bug report not found." });
      const { report, summary } = result[0];
      let stepsToReproduce: string[] = ["Not provided"];
      if (summary) {
        try { stepsToReproduce = JSON.parse(summary.stepsToReproduce) as string[]; }
        catch { stepsToReproduce = ["Not provided"]; }
      }
      return { report, summary: summary ? { ...summary, stepsToReproduce } : null };
    }),
    create: accountProcedure.input(createReportSchema).mutation(async ({ ctx, input }) => {
      const db = await requiredDb();
      const rawText = [input.description, input.environment ? `Environment: ${input.environment}` : "", input.appModule ? `Application/module: ${input.appModule}` : ""].filter(Boolean).join("\n\n");
      const inserted = await db.insert(bugReports).values({
        userId: ctx.account.id,
        title: input.title,
        description: input.description,
        rawText,
        environment: input.environment || null,
        appModule: input.appModule || null,
        reportedSeverity: input.reportedSeverity ?? null,
        status: input.status ?? "PENDING",
      });
      const saved = await db.select().from(bugReports).where(and(eq(bugReports.id, Number(inserted[0].insertId)), eq(bugReports.userId, ctx.account.id))).limit(1);
      return saved[0];
    }),
    update: accountProcedure.input(updateReportSchema).mutation(async ({ ctx, input }) => {
      const db = await requiredDb();
      const existing = await db.select().from(bugReports).where(and(eq(bugReports.id, input.id), eq(bugReports.userId, ctx.account.id))).limit(1);
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Bug report not found." });
      const changes: Partial<typeof bugReports.$inferInsert> = {};
      if (input.title !== undefined) changes.title = input.title;
      if (input.description !== undefined) changes.description = input.description;
      if (input.environment !== undefined) changes.environment = input.environment || null;
      if (input.appModule !== undefined) changes.appModule = input.appModule || null;
      if (input.reportedSeverity !== undefined) changes.reportedSeverity = input.reportedSeverity;
      if (input.status !== undefined) changes.status = input.status;
      const next = { ...existing[0], ...changes };
      const rawText = [next.description, next.environment ? `Environment: ${next.environment}` : "", next.appModule ? `Application/module: ${next.appModule}` : ""].filter(Boolean).join("\n\n");
      changes.rawText = rawText;
      const contentChanged = input.description !== undefined || input.environment !== undefined || input.appModule !== undefined;
      if (contentChanged) changes.status = "PENDING";
      await db.update(bugReports).set(changes).where(and(eq(bugReports.id, input.id), eq(bugReports.userId, ctx.account.id)));
      if (contentChanged) await db.delete(bugSummaries).where(eq(bugSummaries.bugReportId, input.id));
      return { success: true };
    }),
    delete: accountProcedure.input(reportIdSchema).mutation(async ({ ctx, input }) => {
      const db = await requiredDb();
      const result = await db.delete(bugReports).where(and(eq(bugReports.id, input.id), eq(bugReports.userId, ctx.account.id)));
      if (!result[0]?.affectedRows) throw new TRPCError({ code: "NOT_FOUND", message: "Bug report not found." });
      return { success: true };
    }),
    analyze: accountProcedure.input(reportIdSchema).mutation(({ ctx, input }) => runAnalysis(ctx.account, input.id)),
    reanalyze: accountProcedure.input(reportIdSchema).mutation(({ ctx, input }) => runAnalysis(ctx.account, input.id)),
  }),

  dashboard: router({
    stats: accountProcedure.query(async ({ ctx }) => {
      const db = await requiredDb();
      const owner = eq(bugReports.userId, ctx.account.id);
      const [totalReports, analyzed, pending, failed, critical, high, week, severity, category, priority, dates] = await Promise.all([
        countReports(db, owner),
        countReports(db, and(owner, eq(bugReports.status, "ANALYZED"))),
        countReports(db, and(owner, or(eq(bugReports.status, "PENDING"), eq(bugReports.status, "ANALYZING")))),
        countReports(db, and(owner, eq(bugReports.status, "FAILED"))),
        countReports(db, and(owner, eq(bugSummaries.severity, "CRITICAL"))),
        countReports(db, and(owner, eq(bugSummaries.severity, "HIGH"))),
        countReports(db, and(owner, gte(bugReports.createdAt, new Date(Date.now() - 7 * 86400000)))),
        db.select({ name: bugSummaries.severity, value: count() }).from(bugReports).innerJoin(bugSummaries, eq(bugReports.id, bugSummaries.bugReportId)).where(owner).groupBy(bugSummaries.severity),
        db.select({ name: bugSummaries.category, value: count() }).from(bugReports).innerJoin(bugSummaries, eq(bugReports.id, bugSummaries.bugReportId)).where(owner).groupBy(bugSummaries.category),
        db.select({ name: bugSummaries.priority, value: count() }).from(bugReports).innerJoin(bugSummaries, eq(bugReports.id, bugSummaries.bugReportId)).where(owner).groupBy(bugSummaries.priority),
        db.select({ createdAt: bugReports.createdAt }).from(bugReports).where(owner).orderBy(desc(bugReports.createdAt)).limit(500),
      ]);
      const dayMap = new Map<string, number>();
      for (let offset = 13; offset >= 0; offset -= 1) {
        const day = new Date(); day.setDate(day.getDate() - offset);
        dayMap.set(day.toISOString().slice(0, 10), 0);
      }
      for (const item of dates) {
        const key = new Date(item.createdAt).toISOString().slice(0, 10);
        if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
      }
      return {
        totalReports, analyzedReports: analyzed, pendingReports: pending, failedReports: failed,
        highSeverityBugs: high, criticalBugs: critical, reportsThisWeek: week,
        bySeverity: severity.map(x => ({ name: x.name, value: Number(x.value) })),
        byCategory: category.map(x => ({ name: x.name, value: Number(x.value) })),
        byPriority: priority.map(x => ({ name: x.name, value: Number(x.value) })),
        overTime: Array.from(dayMap, ([date, value]) => ({ date, value })),
      };
    }),
  }),

  history: router({
    list: accountProcedure.query(async ({ ctx }) => {
      const db = await requiredDb();
      return db.select({ history: processingHistory, report: bugReports, batchName: batches.name })
        .from(processingHistory)
        .leftJoin(bugReports, eq(processingHistory.bugReportId, bugReports.id))
        .leftJoin(batches, eq(processingHistory.batchId, batches.id))
        .where(eq(processingHistory.userId, ctx.account.id))
        .orderBy(desc(processingHistory.createdAt)).limit(200);
    }),
  }),

  profile: router({
    update: accountProcedure.input(z.object({ name: z.string().trim().min(2).max(100) })).mutation(async ({ ctx, input }) => {
      const db = await requiredDb();
      await db.update(users).set({ name: input.name }).where(eq(users.id, ctx.account.id));
      return { success: true, name: input.name };
    }),
  }),

  batch: router({
    list: accountProcedure.query(async ({ ctx }) => {
      const db = await requiredDb();
      const ownedBatches = await db.select().from(batches).where(eq(batches.userId, ctx.account.id)).orderBy(desc(batches.createdAt)).limit(100);
      if (!ownedBatches.length) return [];
      const reportCounts = await db.select({ batchId: bugReports.batchId, status: bugReports.status, total: count() })
        .from(bugReports).where(and(inArray(bugReports.batchId, ownedBatches.map(batch => batch.id)), eq(bugReports.userId, ctx.account.id)))
        .groupBy(bugReports.batchId, bugReports.status);
      return ownedBatches.map(batch => {
        const counts = reportCounts.filter(row => row.batchId === batch.id);
        const failedReports = counts.find(row => row.status === "FAILED")?.total ?? 0;
        const processedReports = counts.filter(row => row.status === "FAILED" || row.status === "ANALYZED").reduce((total, row) => total + Number(row.total), 0);
        const status = processedReports < batch.totalReports ? batch.status === "PROCESSING" ? "PROCESSING" as const : "QUEUED" as const : failedReports ? "COMPLETED_WITH_ERRORS" as const : "COMPLETED" as const;
        return { ...batch, status, processedReports, failedReports: Number(failedReports) };
      });
    }),
    create: accountProcedure.input(csvBatchSchema).mutation(async ({ ctx, input }) => {
      const db = await requiredDb();
      const batchInsert = await db.insert(batches).values({ userId: ctx.account.id, name: input.name, totalReports: input.reports.length, status: "QUEUED" });
      const createdBatch = await db.select().from(batches).where(and(eq(batches.userId, ctx.account.id), eq(batches.id, Number(batchInsert[0].insertId)))).limit(1);
      const batch = createdBatch[0];
      if (!batch) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to create batch." });
      await db.insert(bugReports).values(input.reports.map(report => ({
        userId: ctx.account.id, batchId: batch.id, title: report.title, description: report.description,
        environment: report.environment || null, appModule: null,
        rawText: [report.description, report.environment ? `Environment: ${report.environment}` : ""].filter(Boolean).join("\n\n"),
        status: "PENDING" as const,
      })));
      const reportIds = await db.select({ id: bugReports.id }).from(bugReports).where(and(eq(bugReports.userId, ctx.account.id), eq(bugReports.batchId, batch.id))).orderBy(asc(bugReports.id));
      return { ...batch, reportIds: reportIds.map(report => report.id) };
    }),
    start: accountProcedure.input(reportIdSchema).mutation(async ({ ctx, input }) => {
      const db = await requiredDb();
      const found = await db.select().from(batches).where(and(eq(batches.id, input.id), eq(batches.userId, ctx.account.id))).limit(1);
      if (!found[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found." });
      await db.update(batches).set({ status: "PROCESSING" }).where(eq(batches.id, input.id));
      const rows = await db.select({ id: bugReports.id, status: bugReports.status }).from(bugReports)
        .where(and(eq(bugReports.batchId, input.id), eq(bugReports.userId, ctx.account.id))).orderBy(asc(bugReports.id));
      return { batchId: input.id, reports: rows };
    }),
    get: accountProcedure.input(reportIdSchema).query(async ({ ctx, input }) => {
      const db = await requiredDb();
      const found = await db.select().from(batches).where(and(eq(batches.id, input.id), eq(batches.userId, ctx.account.id))).limit(1);
      const batch = found[0];
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found." });
      const rows = await db.select({ report: bugReports, summary: bugSummaries }).from(bugReports)
        .leftJoin(bugSummaries, eq(bugReports.id, bugSummaries.bugReportId))
        .where(and(eq(bugReports.batchId, input.id), eq(bugReports.userId, ctx.account.id))).orderBy(asc(bugReports.id));
      const failedReports = rows.filter(row => row.report.status === "FAILED").length;
      const processedReports = rows.filter(row => row.report.status === "FAILED" || row.report.status === "ANALYZED").length;
      const status = processedReports < rows.length ? batch.status === "PROCESSING" ? "PROCESSING" : "QUEUED" : failedReports ? "COMPLETED_WITH_ERRORS" : "COMPLETED";
      await db.update(batches).set({ status, processedReports, failedReports }).where(eq(batches.id, input.id));
      return { ...batch, status, processedReports, failedReports, reports: rows };
    }),
  }),

  admin: router({
    stats: adminProcedure.query(async () => {
      const db = await requiredDb();
      const [userCount, reportCount, analysisCount, failedCount, commonCategories, severity, volume] = await Promise.all([
        db.select({ value: count() }).from(users),
        db.select({ value: count() }).from(bugReports),
        db.select({ value: count() }).from(processingHistory).where(eq(processingHistory.processingStatus, "SUCCESS")),
        db.select({ value: count() }).from(processingHistory).where(eq(processingHistory.processingStatus, "FAILED")),
        db.select({ name: bugSummaries.category, value: count() }).from(bugSummaries).groupBy(bugSummaries.category).orderBy(desc(count())).limit(8),
        db.select({ name: bugSummaries.severity, value: count() }).from(bugSummaries).groupBy(bugSummaries.severity),
        db.select({ createdAt: processingHistory.createdAt }).from(processingHistory)
          .where(or(eq(processingHistory.processingStatus, "SUCCESS"), eq(processingHistory.processingStatus, "FAILED")))
          .orderBy(desc(processingHistory.createdAt)).limit(500),
      ]);
      const dayMap = new Map<string, number>();
      for (let offset = 13; offset >= 0; offset -= 1) {
        const day = new Date(); day.setDate(day.getDate() - offset);
        dayMap.set(day.toISOString().slice(0, 10), 0);
      }
      for (const item of volume) {
        const key = new Date(item.createdAt).toISOString().slice(0, 10);
        if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
      }
      return {
        totalUsers: Number(userCount[0]?.value ?? 0), totalReports: Number(reportCount[0]?.value ?? 0),
        totalAnalyses: Number(analysisCount[0]?.value ?? 0), failedAnalyses: Number(failedCount[0]?.value ?? 0),
        commonCategories: commonCategories.map(row => ({ name: row.name, value: Number(row.value) })),
        severity: severity.map(row => ({ name: row.name, value: Number(row.value) })),
        dailyVolume: Array.from(dayMap, ([date, value]) => ({ date, value })),
      };
    }),
    users: adminProcedure.input(adminSearchSchema).query(async ({ input }) => {
      const db = await requiredDb();
      const where = input.search ? or(like(users.name, `%${input.search}%`), like(users.email, `%${input.search}%`)) : undefined;
      const rows = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, disabled: users.disabled, createdAt: users.createdAt }).from(users).where(where).orderBy(desc(users.createdAt)).limit(200);
      return rows;
    }),
    setUserDisabled: adminProcedure.input(z.object({ id: z.number().int().positive(), disabled: z.boolean() })).mutation(async ({ ctx, input }) => {
      if (ctx.account.id === input.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot disable your own administrator account." });
      const db = await requiredDb();
      const updated = await db.update(users).set({ disabled: input.disabled }).where(eq(users.id, input.id));
      if (!updated[0]?.affectedRows) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      return { success: true };
    }),
    reports: adminProcedure.query(async () => {
      const db = await requiredDb();
      return db.select({ report: bugReports, summary: bugSummaries, ownerName: users.name, ownerEmail: users.email })
        .from(bugReports).leftJoin(bugSummaries, eq(bugReports.id, bugSummaries.bugReportId))
        .innerJoin(users, eq(bugReports.userId, users.id)).orderBy(desc(bugReports.createdAt)).limit(200);
    }),
    deleteReport: adminProcedure.input(reportIdSchema).mutation(async ({ input }) => {
      const db = await requiredDb();
      const result = await db.delete(bugReports).where(eq(bugReports.id, input.id));
      if (!result[0]?.affectedRows) throw new TRPCError({ code: "NOT_FOUND", message: "Bug report not found." });
      return { success: true };
    }),
  }),
});
