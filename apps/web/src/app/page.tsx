"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "ready" | "unavailable" | "error";

const messages: Record<Status, { title: string; description: string }> = {
  loading: {
    title: "Checking connection...",
    description: "Waiting for the backend and database.",
  },
  ready: {
    title: "Connection successful",
    description: "The frontend, backend, and database are communicating.",
  },
  unavailable: {
    title: "Database unavailable",
    description: "The backend responded, but its database check failed.",
  },
  error: {
    title: "Connection check failed",
    description: "We could not get a valid response. Check that the backend is running.",
  },
};

export default function Home() {
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    let active = true;

    async function checkConnection() {
      try {
        const response = await fetch("/api/health", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data: unknown = await response.json();
        let nextStatus: Status = "error";

        if (typeof data === "object" && data !== null) {
          const result = data as Record<string, unknown>;

          if (
            response.status === 200 &&
            result.status === "ok" &&
            result.database === "ready"
          ) {
            nextStatus = "ready";
          } else if (
            response.status === 503 &&
            result.status === "unavailable" &&
            result.database === "unavailable"
          ) {
            nextStatus = "unavailable";
          }
        }

        if (active) setStatus(nextStatus);
      } catch {
        if (active) setStatus("error");
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void checkConnection();

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  const message = messages[status];
  const indicator =
    status === "ready"
      ? "bg-emerald-500"
      : status === "loading"
        ? "animate-pulse bg-slate-400"
        : "bg-amber-500";

  function retry() {
    setStatus("loading");
    setAttempt((previous) => previous + 1);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-indigo-700">EduLens</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Foundation connection check
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          A development checkpoint for our Student Operating System.
        </p>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-8 rounded-xl border border-slate-200 p-5"
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`h-3 w-3 shrink-0 rounded-full ${indicator}`}
            />
            <h2 className="font-semibold">{message.title}</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {message.description}
          </p>
        </div>

        <button
          type="button"
          onClick={retry}
          disabled={status === "loading"}
          className="mt-6 rounded-lg bg-indigo-700 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-700 disabled:cursor-wait disabled:opacity-50"
        >
          {status === "loading" ? "Checking..." : "Check again"}
        </button>
      </section>
    </main>
  );
}
