import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { buglensRouter } from "./routers/buglens";
import { clearSession, getRequestUser, hasLocalSession, toPublicUser } from "./auth";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      const user = hasLocalSession(ctx.req) ? await getRequestUser(ctx.req) : ctx.user;
      return user && !user.disabled ? toPublicUser(user) : null;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      clearSession(ctx.res);
      return { success: true } as const;
    }),
  }),
  buglens: buglensRouter,
});

export type AppRouter = typeof appRouter;
