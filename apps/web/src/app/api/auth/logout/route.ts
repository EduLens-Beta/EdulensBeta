import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function reply(message: string, status: number) {
  return NextResponse.json(
    { message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return reply("This request is not allowed.", 403);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("edulens_session")?.value;

  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
    const baseUrl = process.env.API_BASE_URL;

    if (!baseUrl) {
      return reply("Sign-out is temporarily unavailable. Please try again.", 503);
    }

    try {
      const response = await fetch(new URL("/auth/logout", baseUrl), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });

      if (response.status !== 204) {
        return reply("Sign-out could not be confirmed. Please try again.", 503);
      }
    } catch {
      return reply("Sign-out could not be confirmed. Please try again.", 503);
    }
  }

  cookieStore.set("edulens_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return reply("You are signed out.", 200);
}
