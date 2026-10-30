import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readAccountList } from "@/features/admin/account-data";

function reply(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function readInteger(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
): number | null {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;

  const number = Number(value);
  return Number.isSafeInteger(number) &&
    number >= minimum &&
    number <= maximum
    ? number
    : null;
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("edulens_session")?.value;

  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return reply({ message: "Please sign in to continue." }, 401);
  }

  const search = new URL(request.url).searchParams;
  const limit = readInteger(search.get("limit"), 25, 1, 100);
  const offset = readInteger(
    search.get("offset"),
    0,
    0,
    Number.MAX_SAFE_INTEGER,
  );

  if (limit === null || offset === null) {
    return reply({ message: "Choose a valid page." }, 422);
  }

  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    return reply({ message: "Account information is temporarily unavailable." }, 503);
  }

  try {
    const url = new URL("/admin/accounts", baseUrl);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url, {
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

    if (response.status === 403) {
      return reply({ message: "This page is available to administrators only." }, 403);
    }

    if (response.status !== 200) {
      return reply({ message: "Account information is temporarily unavailable." }, 503);
    }

    const data = readAccountList(await response.json());

    if (!data || data.limit !== limit || data.offset !== offset) {
      return reply({ message: "The account list could not be confirmed." }, 502);
    }

    return reply(data, 200);
  } catch {
    return reply(
      { message: "Account information could not be loaded. Please try again." },
      503,
    );
  }
}
