import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readSkillsProgress } from "@/features/skills/course-data";

export function reply(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function checkOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function forwardCourses(
  method: "GET" | "POST" | "PUT",
  suffix = "",
  payload?: { work_text: string; complete: boolean } | { answers: number[] },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("edulens_session")?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return reply({ message: "Please sign in to continue." }, 401);
  }

  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    return reply({ message: "Courses are temporarily unavailable." }, 503);
  }

  try {
    const response = await fetch(
      new URL(`/student/courses${suffix}`, baseUrl),
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(payload ? { "Content-Type": "application/json" } : {}),
        },
        body: payload ? JSON.stringify(payload) : undefined,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      },
    );

    if (response.status === 401) {
      cookieStore.set("edulens_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return reply({ message: "Please sign in again." }, 401);
    }
    if (response.status === 409) {
      return reply({
        message: "Check your class and group, start the course, and complete the earlier steps first.",
      }, 409);
    }
    if (response.status === 404) {
      return reply({ message: "Course or lesson not found." }, 404);
    }
    if (response.status === 422) {
      return reply({
        message: "Check your work. Completion needs at least 20 characters; the limit is 10,000.",
      }, 422);
    }
    if (response.status !== 200) {
      return reply({ message: "Your progress could not be saved. Please try again." }, 503);
    }

    const progress = readSkillsProgress(await response.json());
    if (!progress) {
      return reply({ message: "Your saved progress could not be confirmed. Reload before continuing." }, 502);
    }
    return reply(progress, 200);
  } catch {
    return reply({ message: "Could not confirm your progress. Please try again." }, 503);
  }
}
