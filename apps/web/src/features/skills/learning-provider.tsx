"use client";

import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import {
  createContext, useContext, useEffect, useRef, useState,
  type ReactNode,
} from "react";

import { readJourney, type JourneyProgress } from "./journey-data";

const endpoint = "/api/student/learning/science-explorer";

type LearningState = {
  selected: number;
  setSelected: Dispatch<SetStateAction<number>>;
  journey: JourneyProgress | null;
  loading: boolean;
  pending: boolean;
  message: string;
  start: () => Promise<boolean>;
  save: (stepId: string, work: string, complete: boolean) => Promise<boolean>;
};

const LearningContext = createContext<LearningState | null>(null);

export function useLearning() {
  const value = useContext(LearningContext);
  if (!value) throw new Error("LearningProvider is missing.");
  return value;
}

export function LearningProvider({ children }: { children: ReactNode }) {
  const [journey, setJourney] = useState<JourneyProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(false);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      try {
        const response = await fetch(endpoint, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!active) return;
        if (response.status === 401) {
          setSignedOut(true);
          return;
        }
        if (!response.ok) throw new Error("Journey unavailable.");
        const result = readJourney(await response.json());
        if (!result) throw new Error("Invalid progress.");
        if (active) {
          setJourney(result);
          setMessage("");
        }
      } catch {
        if (active) setMessage("We couldn’t load your progress. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  async function mutate(
    method: "POST" | "PUT",
    suffix = "",
    payload?: { work_text: string; complete: boolean },
  ) {
    if (busy.current || !journey) return false;
    busy.current = true;
    setPending(true);
    setMessage("");

    try {
      const response = await fetch(`${endpoint}${suffix}`, {
        method,
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 401) {
        setSignedOut(true);
        return false;
      }

      const body: unknown = await response.json();
      if (!response.ok) {
        const errorMessage =
          typeof body === "object" && body !== null &&
          "message" in body && typeof body.message === "string"
            ? body.message
            : "Your work could not be confirmed. Please try again.";
        setMessage(errorMessage);
        return false;
      }

      const result = readJourney(body);
      if (!result) throw new Error("Invalid progress.");
      setJourney(result);
      return true;
    } catch {
      setMessage("We couldn’t confirm the save. Your text is still here. Please retry.");
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  if (signedOut) {
    return (
      <div className="p-8">
        <p>Your session has ended. Sign in again to continue.</p>
        <Link href="/login" className="mt-4 inline-block text-teal-800 underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <LearningContext.Provider value={{
      journey, loading, pending, message, selected, setSelected,
      start: () => mutate("POST"),
      save: (stepId, work, complete) => mutate(
        "PUT",
        `/activities/${encodeURIComponent(stepId)}`,
        { work_text: work, complete },
      ),
    }}>
      {loading && <p role="status" className="px-6 py-3">Loading your progress…</p>}
      {message && (
        <div role="alert" className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-800">
          {message}
          {!journey && (
            <button type="button" className="ml-4 underline"
              onClick={() => {
                setLoading(true);
                setAttempt((value) => value + 1);
              }}>
              Try again
            </button>
          )}
        </div>
      )}
      {children}
    </LearningContext.Provider>
  );
}
