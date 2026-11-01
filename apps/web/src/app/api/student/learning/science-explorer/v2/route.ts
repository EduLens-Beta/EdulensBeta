import { cookies } from "next/headers";

import {
  readDiscovery,
  readDiscoveryDetails,
  type DiscoverySubmission,
} from "@/features/skills/discovery-data";
import { checkOrigin, reply } from "../proxy";

async function forward(
  method: "GET" | "POST" | "PUT",
  payload?: DiscoverySubmission,
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

  const suffix = method === "POST" ? "/start" :
    method === "PUT" ? "/discovery" : "";

  try {
    const response = await fetch(
      new URL(`/student/learning/science-explorer/v2${suffix}`, baseUrl),
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
      return reply({ message: "Please sign in again to continue." }, 401);
    }

    if (response.status === 409) {
      return reply({
        message: "Check your class and group, and start the journey before saving. Completed work cannot be edited.",
      }, 409);
    }

    if (response.status === 422) {
      return reply({
        message: "Check your interest choices, activity, work, and reflection.",
      }, 422);
    }

    if (response.status !== 200) {
      return reply({ message: "Your journey is temporarily unavailable." }, 503);
    }

    const result = readDiscovery(await response.json());
    if (!result) {
      return reply({ message: "Your saved work could not be confirmed." }, 502);
    }
    return reply(result, 200);
  } catch {
    return reply({
      message: "We couldn’t confirm your progress. Please try again.",
    }, 503);
  }
}

export async function GET() {
  return forward("GET");
}

export async function POST(request: Request) {
  if (!checkOrigin(request)) {
    return reply({ message: "This request is not allowed." }, 403);
  }
  return forward("POST");
}

export async function PUT(request: Request) {
  if (!checkOrigin(request)) {
    return reply({ message: "This request is not allowed." }, 403);
  }

  const contentType = request.headers.get("content-type")
    ?.split(";")[0].trim().toLowerCase();

  if (contentType !== "application/json") {
    return reply({ message: "Send your work as JSON." }, 415);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return reply({ message: "Your work could not be read." }, 400);
  }

  const allowed = [
    "interests", "unsure", "activity_id",
    "work_text", "reflection", "complete",
  ];

  if (
    typeof payload !== "object" || payload === null ||
    Array.isArray(payload) ||
    Object.keys(payload).some((key) => !allowed.includes(key)) ||
    !("complete" in payload) || typeof payload.complete !== "boolean"
  ) {
    return reply({ message: "Check your discovery details." }, 422);
  }

  const details = readDiscoveryDetails(payload);
  if (
    !details ||
    (payload.complete &&
      ((!details.interests.length && !details.unsure) ||
        details.activity_id === null ||
        Array.from(details.work_text.trim()).length < 20 ||
        Array.from(details.reflection.trim()).length < 20))
  ) {
    return reply({
      message: "Choose an interest or “I’m not sure yet”, try an activity, and add your work and reflection.",
    }, 422);
  }

  return forward("PUT", { ...details, complete: payload.complete });
}
