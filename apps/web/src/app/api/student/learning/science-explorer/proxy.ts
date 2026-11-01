import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readJourney } from "@/features/skills/journey-data";

export function reply(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function checkOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function forwardLearning(
  method: "GET" | "POST" | "PUT",
  suffix = "",
  payload?: { work_text: string; complete: boolean },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("edulens_session")?.value;

  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return reply({ message: "Please sign in to continue." }, 401);
  }

  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    return reply({ message: "Your journey is temporarily unavailable." }, 503);
  }

  try {
    const response = await fetch(
      new URL(`/student/learning/science-explorer${suffix}`, baseUrl),
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
      return reply({ message: "Your session has ended. Please sign in." }, 401);
    }

    if (response.status === 409) {
      return reply(
        {
          message:
            "Check your class and group, start the journey, and complete activities in order.",
        },
        409,
      );
    }
    if (response.status === 422) {
      return reply(
        { message: "Add at least 20 characters to complete an activity. Keep work under 10,001 characters." },
        422,
      );
    }
    if (response.status !== 200) {
      return reply({ message: "Your journey could not be updated. Please try again." }, 503);
    }

    const journey = readJourney(await response.json());
    if (!journey) {
      return reply({ message: "Your saved progress could not be confirmed." }, 502);
    }

    return reply(journey, 200);
  } catch {
    return reply(
      { message: "Your journey could not be confirmed. Please try again." },
      503,
    );
  }
}
