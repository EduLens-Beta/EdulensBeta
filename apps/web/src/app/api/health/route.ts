import { NextResponse } from "next/server";


function reply(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    return reply(
      { status: "error", message: "Backend URL is not configured." },
      503,
    );
  }

  try {
    const response = await fetch(new URL("/health/ready", baseUrl), {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    const data: unknown = await response.json();

    if (typeof data === "object" && data !== null) {
      const result = data as Record<string, unknown>;

      if (
        response.status === 200 &&
        result.status === "ok" &&
        result.database === "ready"
      ) {
        return reply({ status: "ok", database: "ready" }, 200);
      }

      if (
        response.status === 503 &&
        result.status === "unavailable" &&
        result.database === "unavailable"
      ) {
        return reply(
          { status: "unavailable", database: "unavailable" },
          503,
        );
      }
    }

    return reply(
      { status: "error", message: "Backend returned an unexpected response." },
      502,
    );
  } catch {
    return reply(
      { status: "error", message: "Could not reach the backend or read its response." },
      502,
    );
  }
}
