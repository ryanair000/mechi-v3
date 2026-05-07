import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminPasswordHash } from "@/lib/env";
import { getPageSession, getRequestSession } from "@/lib/session";

function isBcryptHash(value: string) {
  return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");
}

export async function verifyAdminPassword(password: string) {
  const expected = getAdminPasswordHash();
  if (isBcryptHash(expected)) {
    return bcrypt.compare(password, expected);
  }

  if (process.env.NODE_ENV !== "production") {
    return password === expected;
  }

  return false;
}

export async function requirePageSession() {
  const session = await getPageSession();
  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireApiSession(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session, error: null };
}
