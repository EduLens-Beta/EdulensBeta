"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { FormEvent } from "react";

type Status = "idle" | "pending" | "success" | "error";

export default function SignupForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const submitting = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting.current) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    if (Array.from(name).length < 1 || Array.from(name).length > 120) {
      setStatus("error");
      setMessage("Enter a name between 1 and 120 characters.");
      return;
    }

    const passwordLength = Array.from(password).length;

    if (passwordLength < 15 || passwordLength > 128) {
      setStatus("error");
      setMessage("Use a password between 15 and 128 characters.");
      return;
    }

    submitting.current = true;
    setStatus("pending");
    setMessage("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
        signal: AbortSignal.timeout(15000),
      });

      const result: unknown = await response.json();
      const responseMessage =
        typeof result === "object" &&
        result !== null &&
        "message" in result &&
        typeof result.message === "string"
          ? result.message
          : "We could not confirm the signup result.";

      if (response.status === 201) {
        form.reset();
        setStatus("success");
      } else {
        setStatus("error");
      }

      setMessage(responseMessage);
    } catch {
      setStatus("error");
      setMessage(
        "We could not confirm the result. Your account may have been created. Check your connection before trying again.",
      );
    } finally {
      submitting.current = false;
    }
  }

  if (status === "success") {
    return (
      <div className="space-y-5">
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"
        >
          <h2 className="font-semibold">Account created</h2>
          <p className="mt-2 text-sm">{message}</p>
        </div>
        <Link
          href="/"
          className="inline-block font-medium text-indigo-700 underline underline-offset-4"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const pending = status === "pending";
  const inputClass =
    "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-900 focus:border-indigo-600 focus:outline-2 focus:outline-indigo-600";

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={pending}>
      <fieldset disabled={pending} className="space-y-5 disabled:opacity-60">
        <legend className="sr-only">Your account details</legend>

        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            aria-describedby="password-help"
            required
            className={inputClass}
          />
          <p id="password-help" className="mt-2 text-sm text-slate-600">
            Use 15–128 characters. Spaces and Unicode are supported.
          </p>
        </div>
      </fieldset>

      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="text-sm text-red-700"
      >
        {message}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-700 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
