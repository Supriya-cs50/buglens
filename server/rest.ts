import express, { type Request, type Response, type NextFunction } from "express";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

export const restApi = express.Router();

function statusFor(code: string) {
  const map: Record<string, number> = {
    BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
    CONFLICT: 409, TOO_MANY_REQUESTS: 429, BAD_GATEWAY: 502,
  };
  return map[code] ?? 500;
}

function publicFailure(error: unknown, res: Response) {
  if (error instanceof TRPCError) {
    return res.status(statusFor(error.code)).json({
      success: false,
      message: error.message,
      error: error.code,
    });
  }
  return res.status(500).json({ success: false, message: "Something went wrong. Please try again.", error: "INTERNAL_SERVER_ERROR" });
}

const endpoint = (action: (req: Request, res: Response, caller: ReturnType<typeof appRouter.createCaller>) => Promise<unknown> | unknown) =>
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const caller = appRouter.createCaller(await createContext({ req, res, info: {} as never }));
      const result = await action(req, res, caller);
      if (res.headersSent) return;
      res.json({ success: true, data: result });
    } catch (error) {
      publicFailure(error, res);
    }
  };

function idFrom(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "A valid id is required." });
  return id;
}

function pageFrom(value: unknown, fallback: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid pagination value." });
  return parsed;
}

restApi.post("/auth/register", endpoint((_req, _res, caller) => caller.buglens.auth.register(_req.body)));
restApi.post("/auth/login", endpoint((req, _res, caller) => caller.buglens.auth.login(req.body)));
restApi.post("/auth/logout", endpoint((_req, _res, caller) => caller.auth.logout()));
restApi.get("/auth/me", endpoint((_req, _res, caller) => caller.auth.me()));

restApi.get("/reports", endpoint((req, _res, caller) => caller.buglens.reports.list({
  page: pageFrom(req.query.page, 1),
  pageSize: pageFrom(req.query.pageSize, 10),
  search: typeof req.query.search === "string" ? req.query.search : "",
  severity: typeof req.query.severity === "string" ? req.query.severity as never : undefined,
  priority: typeof req.query.priority === "string" ? req.query.priority as never : undefined,
  category: typeof req.query.category === "string" ? req.query.category as never : undefined,
  status: typeof req.query.status === "string" ? req.query.status as never : undefined,
  sort: req.query.sort === "oldest" ? "oldest" : "newest",
})));
restApi.post("/reports", endpoint((req, _res, caller) => caller.buglens.reports.create(req.body)));
restApi.get("/reports/:id", endpoint((req, _res, caller) => caller.buglens.reports.detail({ id: idFrom(req.params.id) })));
restApi.put("/reports/:id", endpoint((req, _res, caller) => caller.buglens.reports.update({ ...req.body, id: idFrom(req.params.id) })));
restApi.delete("/reports/:id", endpoint((req, _res, caller) => caller.buglens.reports.delete({ id: idFrom(req.params.id) })));
restApi.post("/reports/:id/analyze", endpoint((req, _res, caller) => caller.buglens.reports.analyze({ id: idFrom(req.params.id) })));
restApi.post("/reports/:id/reanalyze", endpoint((req, _res, caller) => caller.buglens.reports.reanalyze({ id: idFrom(req.params.id) })));

restApi.post("/batch/upload", endpoint((req, _res, caller) => caller.buglens.batch.create(req.body)));
restApi.get("/batch", endpoint((_req, _res, caller) => caller.buglens.batch.list()));
restApi.get("/batch/:id", endpoint((req, _res, caller) => caller.buglens.batch.get({ id: idFrom(req.params.id) })));
restApi.post("/batch/:id/process", endpoint((req, _res, caller) => caller.buglens.batch.start({ id: idFrom(req.params.id) })));
restApi.get("/dashboard/stats", endpoint((_req, _res, caller) => caller.buglens.dashboard.stats()));

restApi.get("/admin/users", endpoint((req, _res, caller) => caller.buglens.admin.users({ search: typeof req.query.search === "string" ? req.query.search : "" })));
restApi.get("/admin/reports", endpoint((_req, _res, caller) => caller.buglens.admin.reports()));
restApi.get("/admin/stats", endpoint((_req, _res, caller) => caller.buglens.admin.stats()));
restApi.patch("/admin/users/:id", endpoint((req, _res, caller) => caller.buglens.admin.setUserDisabled({ id: idFrom(req.params.id), disabled: Boolean(req.body?.disabled) })));
restApi.delete("/admin/reports/:id", endpoint((req, _res, caller) => caller.buglens.admin.deleteReport({ id: idFrom(req.params.id) })));
