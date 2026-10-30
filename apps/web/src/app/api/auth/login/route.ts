import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function reply(message: string, status: number) {
  return NextResponse.json(
    { message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return reply("This request is not allowed.", 403);
  }

  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();

  if (contentType !== "application/json") {
    return reply("Send the sign-in details as JSON.", 415);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return reply("The sign-in request could not be read.", 400);
  }

  if (
    !isRecord(payload) ||
    typeof payload.email !== "string" ||
    typeof payload.password !== "string" ||
    Object.keys(payload).some(
      (key) => !["email", "password"].includes(key),
    )
  ) {
    return reply("Provide your email and password.", 422);
  }

  if (
    payload.email.length > 320 ||
    Array.from(payload.password).length < 1 ||
    Array.from(payload.password).length > 128
  ) {
    return reply("Check your email and password.", 422);
  }

  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    return reply("Sign-in is temporarily unavailable.", 503);
  }

  try {
    const response = await fetch(new URL("/auth/login", baseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 401) {
      return reply("Invalid email or password.", 401);
    }

    if (response.status === 422) {
      return reply("Check your email and password.", 422);
    }

    if (response.status !== 200) {
      return reply("Sign-in is temporarily unavailable.", 503);
    }

    const result: unknown = await response.json();

    if (
      !isRecord(result) ||
      typeof result.session_token !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(result.session_token) ||
      typeof result.expires_at !== "string" ||
      !isRecord(result.user) ||
      typeof result.user.is_admin !== "boolean"
    ) {
      return reply("Sign-in could not be confirmed. Please try again.", 502);
    }

    if (
      request.headers.get("x-edulens-login-mode") === "admin" &&
      !result.user.is_admin
    ) {
      return reply(
        "Administrator access required. Please use Student sign in.",
        403,
      );
    }

    const expires = new Date(result.expires_at);

    if (!Number.isFinite(expires.getTime()) || expires.getTime() <= Date.now()) {
      return reply("Sign-in could not be confirmed. Please try again.", 502);
    }

    const cookieStore = await cookies();
    cookieStore.set("edulens_session", result.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires,
    });

    return NextResponse.json(
      {
        message: "You are signed in.",
        destination: result.user.is_admin ? "/admin" : "/student",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return reply("Sign-in could not be confirmed. Please try again.", 502);
  }
}
