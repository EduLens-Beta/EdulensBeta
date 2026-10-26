"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
};

type State =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error"; message: string }
  | { status: "ready"; user: User };

function readUser(value: unknown): User | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("user" in value) ||
    typeof value.user !== "object" ||
    value.user === null
  ) {
    return null;
  }

  const user = value.user;

  if (
    !("id" in user) ||
    typeof user.id !== "string" ||
    !("name" in user) ||
    typeof user.name !== "string" ||
    !("email" in user) ||
    typeof user.email !== "string"
  ) {
    return null;
  }

  return { id: user.id, name: user.name, email: user.email };
}

export default function AccountPanel() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadAccount() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!active) return;

        if (response.status === 401) {
          setState({ status: "signed-out" });
          return;
        }

        if (response.status !== 200) {
          throw new Error("Account check failed.");
        }

        const result: unknown = await response.json();
        const user = readUser(result);

        if (!user) throw new Error("Invalid account response.");
        if (active) setState({ status: "ready", user });
      } catch {
        if (active) {
          setState({
            status: "error",
            message: "We could not check your account. Please try again.",
          });
        }
      }
    }

    void loadAccount();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  async function logout() {
    if (submitting.current) return;

    submitting.current = true;
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        signal: AbortSignal.timeout(15000),
      });

      if (response.status !== 200) {
        throw new Error("Sign-out failed.");
      }

      setState({ status: "signed-out" });
      router.replace("/login");
    } catch {
      setMessage("Sign-out could not be confirmed. Please try again.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  if (state.status === "loading") {
    return <p role="status">Checking your account...</p>;
  }

  if (state.status === "signed-out") {
    return (
      <div>
        <h1 className="text-2xl font-bold">You are not signed in</h1>
        <Link
          href="/login"
          className="mt-5 inline-block font-semibold text-indigo-700 underline"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div>
        <p role="alert" className="text-red-700">
          {state.message}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">
        Welcome, {state.user.name}
      </h1>
      <p className="mt-3 break-words text-slate-600">{state.user.email}</p>
      <p className="mt-5 text-sm text-slate-600">
        You are signed in to EduLens.
      </p>

      <p role="status" aria-live="polite" className="mt-4 text-sm text-red-700">
        {message}
      </p>

      <button
        type="button"
        onClick={logout}
        disabled={pending}
        className="mt-5 rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-700 disabled:cursor-wait disabled:opacity-50"
      >
        {pending ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
