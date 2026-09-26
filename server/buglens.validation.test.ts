import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { bugAnalysisSchema, registerSchema } from "../shared/buglens";

const validAnalysis = {
  summary: "Checkout freezes after submitting payment.",
  severity: "HIGH",
  priority: "P1",
  category: "PAYMENT",
  impact: "Customers cannot complete checkout.",
  stepsToReproduce: ["Open checkout", "Select Pay"],
  expectedBehavior: "Payment completes and confirmation is displayed.",
  actualBehavior: "The page remains frozen.",
  environment: "Chrome 128 on Windows 11",
  possibleRootCause: "Not provided",
  recommendedAction: "Inspect the payment submission request and browser console.",
};

function unauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("BugLens server validation", () => {
  it("accepts a complete structured AI analysis", () => {
    expect(bugAnalysisSchema.safeParse(validAnalysis).success).toBe(true);
  });

  it("rejects invalid severity, missing fields, and extra AI fields", () => {
    expect(bugAnalysisSchema.safeParse({ ...validAnalysis, severity: "URGENT" }).success).toBe(false);
    expect(bugAnalysisSchema.safeParse({ ...validAnalysis, unexpected: "untrusted" }).success).toBe(false);
    const { recommendedAction: _removed, ...incomplete } = validAnalysis;
    expect(bugAnalysisSchema.safeParse(incomplete).success).toBe(false);
  });

  it("requires strong passwords during registration", () => {
    expect(registerSchema.safeParse({ name: "Taylor", email: "taylor@example.com", password: "GoodPass9" }).success).toBe(true);
    expect(registerSchema.safeParse({ name: "Taylor", email: "taylor@example.com", password: "lowercase9" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Taylor", email: "not-an-email", password: "GoodPass9" }).success).toBe(false);
  });

  it("denies unauthenticated access to another user's report list", async () => {
    const caller = appRouter.createCaller(unauthenticatedContext());
    await expect(caller.buglens.reports.list({ page: 1, pageSize: 10, search: "", sort: "newest" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("validates malformed registration before database access", async () => {
    const caller = appRouter.createCaller(unauthenticatedContext());
    await expect(caller.buglens.auth.register({ name: "T", email: "bad", password: "weak" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
