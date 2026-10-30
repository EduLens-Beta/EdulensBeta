import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  isEmptySchoolDetails,
  isRecord,
  isSchoolDetails,
  type SchoolDetails,
} from "@/features/student/school-details";

function reply(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function forwardDetails(payload?: SchoolDetails) {
  const cookieStore = await cookies();
  const token = cookieStore.get("edulens_session")?.value;

  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return reply({ message: "Please sign in to continue." }, 401);
  }

  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    return reply({ message: "Your school details are temporarily unavailable." }, 503);
  }

  try {
    const response = await fetch(new URL("/student/school-details", baseUrl), {
      method: payload ? "PUT" : "GET",
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

    if (response.status === 409) {
      return reply(
        { message: "Choose Class 9–10 before adding your class and group." },
        409,
      );
    }

    if (response.status === 422) {
      return reply({ message: "Choose your class and study group." }, 422);
    }

    if (response.status !== 200) {
      return reply(
        { message: "Your school details are temporarily unavailable. Please try again." },
        503,
      );
    }

    const result: unknown = await response.json();

    if (isSchoolDetails(result)) {
      if (
        payload &&
        (result.school_class !== payload.school_class ||
          result.study_group !== payload.study_group)
      ) {
        return reply({ message: "Your selection could not be confirmed." }, 502);
      }

      return reply(
        {
          school_class: result.school_class,
          study_group: result.study_group,
        },
        200,
      );
    }

    if (!payload && isEmptySchoolDetails(result)) {
      return reply({ school_class: null, study_group: null }, 200);
    }

    return reply({ message: "Your school details could not be confirmed." }, 502);
  } catch {
    return reply(
      { message: "Your school details could not be confirmed. Please try again." },
      503,
    );
  }
}

export async function GET() {
  return forwardDetails();
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
    Object.keys(payload).length !== 2 ||
    !isSchoolDetails(payload)
  ) {
    return reply({ message: "Choose your class and study group." }, 422);
  }

  return forwardDetails({
    school_class: payload.school_class,
    study_group: payload.study_group,
  });
}
