"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const submitting = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    if (!email || !password || Array.from(password).length > 128) {
      setMessage("Check your email and password.");
      return;
    }

    submitting.current = true;
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(15000),
      });

      const result: unknown = await response.json();

      if (response.status === 200) {
        form.reset();
        router.replace("/account");
        return;
      }

      setMessage(
        typeof result === "object" &&
          result !== null &&
          "message" in result &&
          typeof result.message === "string"
          ? result.message
          : "Sign-in could not be confirmed. Please try again.",
      );
    } catch {
      setMessage("Sign-in could not be confirmed. Please try again.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 focus:border-indigo-600 focus:outline-2 focus:outline-indigo-600";

  return (
    <form onSubmit={handleSubmit} aria-busy={pending}>
      <fieldset disabled={pending} className="space-y-5">
        <legend className="sr-only">Sign-in details</legend>

        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </div>

        <p role="status" aria-live="polite" className="text-sm text-red-700">
          {message}
        </p>

        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-700 disabled:cursor-wait disabled:opacity-50"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </fieldset>

      <p className="mt-6 text-center text-sm text-slate-600">
        New to EduLens?{" "}
        <Link href="/signup" className="font-semibold text-indigo-700 underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
