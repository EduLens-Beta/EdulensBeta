import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function reply(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("edulens_session")?.value;

  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return reply({ message: "You are not signed in." }, 401);
  }

  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    return reply({ message: "Account checking is temporarily unavailable." }, 503);
  }

  try {
    const response = await fetch(new URL("/auth/me", baseUrl), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 401) {
      cookieStore.set("edulens_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return reply({ message: "Your session has ended. Please sign in." }, 401);
    }

    if (response.status !== 200) {
      return reply({ message: "Account checking is temporarily unavailable." }, 503);
    }

    const account: unknown = await response.json();

    if (
      typeof account !== "object" ||
      account === null ||
      !("id" in account) ||
      typeof account.id !== "string" ||
      !("name" in account) ||
      typeof account.name !== "string" ||
      !("email" in account) ||
      typeof account.email !== "string" ||
      !("is_admin" in account) ||
      typeof account.is_admin !== "boolean"
    ) {
      return reply({ message: "The account response could not be read." }, 502);
    }

    return reply(
      {
        user: {
          id: account.id,
          name: account.name,
          email: account.email,
          is_admin: account.is_admin,
        },
      },
      200,
    );
  } catch {
    return reply({ message: "Account checking is temporarily unavailable." }, 503);
  }
}
