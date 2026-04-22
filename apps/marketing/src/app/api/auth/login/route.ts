import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminPassword } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { createSessionCookieValue, getSessionCookieOptions } from "@/lib/session";

function isJsonRequest(request: NextRequest) {
  return (request.headers.get("content-type") ?? "").includes("application/json");
}

export async function POST(request: NextRequest) {
  const payload = isJsonRequest(request)
    ? await request.json()
    : Object.fromEntries(await request.formData());
  const password = String(payload.password ?? "");
  const valid = await verifyAdminPassword(password);

  if (!valid) {
    if (isJsonRequest(request)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", encodeURIComponent("Invalid password"));
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const response = isJsonRequest(request)
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL("/", request.url), { status: 303 });

  response.cookies.set(
    SESSION_COOKIE_NAME,
    await createSessionCookieValue(),
    getSessionCookieOptions(),
  );

  return response;
}
