import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isEducationStage } from "@/features/student/education-stages";

function reply(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function forwardProfile(method: "GET" | "PUT", payload?: object) {
  const cookieStore = await cookies();
  const token = cookieStore.get("edulens_session")?.value;

  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return reply({ message: "Please sign in to continue." }, 401);
  }

  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    return reply({ message: "Your profile is temporarily unavailable." }, 503);
  }

  try {
    const response = await fetch(new URL("/student/profile", baseUrl), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(payload ? { "Content-Type": "application/json" } : {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
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

    if (response.status === 422) {
      return reply({ message: "Choose one of the education stages." }, 422);
    }

    if (response.status !== 200) {
      return reply(
        { message: "Your profile is temporarily unavailable. Please try again." },
        503,
      );
    }

    const result: unknown = await response.json();

    if (
      !isRecord(result) ||
      !(result.education_stage === null || isEducationStage(result.education_stage)) ||
      (method === "PUT" && result.education_stage !==
        (payload as { education_stage: unknown }).education_stage)
    ) {
      return reply({ message: "Your profile could not be confirmed. Please try again." }, 502);
    }

    return reply({ education_stage: result.education_stage }, 200);
  } catch {
    return reply(
      { message: "Your profile could not be confirmed. Please try again." },
      503,
    );
  }
}

export async function GET() {
  return forwardProfile("GET");
}

export async function PUT(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return reply({ message: "This request is not allowed." }, 403);
  }

  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();

  if (contentType !== "application/json") {
    return reply({ message: "Send your selection as JSON." }, 415);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return reply({ message: "Your selection could not be read." }, 400);
  }

  if (
    !isRecord(payload) ||
    Object.keys(payload).length !== 1 ||
    !isEducationStage(payload.education_stage)
  ) {
    return reply({ message: "Choose one of the education stages." }, 422);
  }

  return forwardProfile("PUT", { education_stage: payload.education_stage });
}
