import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { users, type User } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";

export type PublicUser = Pick<User, "id" | "name" | "email" | "role" | "createdAt">;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function sessionKey() {
  if (!ENV.cookieSecret || ENV.cookieSecret.length < 16) {
    throw new Error("Secure session configuration is unavailable");
  }
  return createHash("sha256").update(`buglens-session-v1:${ENV.cookieSecret}`).digest();
}

export async function issueSession(res: Response, user: User) {
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(sessionKey());

  res.cookie("buglens_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60 * 1000,
  });
}

export function clearSession(res: Response) {
  res.clearCookie("buglens_session", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
}

function cookieValue(req: Request, key: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  for (const piece of cookieHeader.split(";")) {
    const separator = piece.indexOf("=");
    if (separator < 0) continue;
    if (piece.slice(0, separator).trim() !== key) continue;
    try {
      return decodeURIComponent(piece.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function hasLocalSession(req: Request): boolean {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return false;
  return cookieHeader.split(";").some(piece => piece.trim().startsWith("buglens_session="));
}

export async function getRequestUser(req: Request): Promise<User | null> {
  const token = cookieValue(req, "buglens_session");
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) return null;
    const db = await getDb();
    if (!db) return null;
    const matches = await db.select().from(users).where(eq(users.id, id)).limit(1);
    const user = matches[0];
    return user && !user.disabled ? user : null;
  } catch {
    return null;
  }
}
