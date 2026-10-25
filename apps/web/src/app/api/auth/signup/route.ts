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
  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return reply("This request is not allowed.", 403);
  }

  if (
    !request.headers.get("content-type")?.includes("application/json")
  ) {
    return reply("Send the signup details as JSON.", 415);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return reply("The signup request could not be read.", 400);
  }

  if (
    !isRecord(payload) ||
    typeof payload.name !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.password !== "string" ||
    Object.keys(payload).some(
      (key) => !["name", "email", "password"].includes(key),
    )
  ) {
    return reply("Provide your name, email, and password.", 422);
  }

  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    return reply("Account creation is temporarily unavailable.", 503);
  }

  try {
    const response = await fetch(new URL("/auth/signup", baseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 201) {
      const account: unknown = await response.json();

      if (
        isRecord(account) &&
        typeof account.id === "string" &&
        typeof account.name === "string" &&
        typeof account.email === "string" &&
        typeof account.created_at === "string"
      ) {
        return reply("Your account was created successfully.", 201);
      }

      return reply(
        "We could not confirm the result. Your account may have been created.",
        502,
      );
    }

    if (response.status === 409) {
      return reply("An account with this email already exists.", 409);
    }

    if (response.status === 422) {
      return reply(
        "Check your name, email, and password. Passwords need 15–128 characters.",
        422,
      );
    }

    return reply("Account creation is temporarily unavailable.", 503);
  } catch {
    return reply(
      "We could not confirm the result. Your account may have been created. Check your connection before trying again.",
      502,
    );
  }
}
