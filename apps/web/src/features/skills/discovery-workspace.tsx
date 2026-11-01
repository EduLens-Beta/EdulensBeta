"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  interestOptions,
  readDiscovery,
  type DiscoveryDetails,
  type DiscoveryState,
  type ExplorationId,
} from "./discovery-data";
import styles from "./discovery.module.css";

const endpoint = "/api/student/learning/science-explorer/v2";

const milestones = [
  "Discover my interests",
  "Ask a good question",
  "Work with information",
  "Make a small project",
  "Explain my work",
  "Choose my next direction",
];

const activities: {
  id: ExplorationId;
  title: string;
  instruction: string;
}[] = [
  {
    id: "notice-and-question",
    title: "Notice something. Ask a question.",
    instruction:
      "Choose something familiar. Write three things you notice and one question you would like to explore. No experiment or special equipment is needed.",
  },
  {
    id: "explain-an-idea",
    title: "Explain an idea simply.",
    instruction:
      "Choose an interesting idea. Explain it in five simple sentences, or describe a drawing you made to explain it.",
  },
  {
    id: "design-a-solution",
    title: "Sketch a helpful idea.",
    instruction:
      "Think of a small everyday problem. Sketch a possible solution on paper and describe who it could help.",
  },
];

export default function DiscoveryWorkspace() {
  const [data, setData] = useState<DiscoveryState | null>(null);
  const [draft, setDraft] = useState<DiscoveryDetails | null>(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(false);
  const dirty = data !== null && draft !== null &&
    JSON.stringify(draft) !== JSON.stringify(data.discovery);

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
        if (!response.ok) throw new Error();
        const result = readDiscovery(await response.json());
        if (!result) throw new Error();
        if (active) {
          setData(result);
          setDraft(result.discovery);
          setError("");
        }
      } catch {
        if (active) setError("We couldn’t load your journey. Please try again.");
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

  useEffect(() => {
    if (!dirty) return;

    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    function beforeLink(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const href = event.target.closest("a")?.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (!window.confirm("You have unsaved work. Leave without saving?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeLink, true);
    };
  }, [dirty]);

  function update(changes: Partial<DiscoveryDetails>) {
    setDraft((previous) => previous ? { ...previous, ...changes } : previous);
    setNotice("");
  }

  async function submit(action: "start" | "draft" | "complete") {
    if (busy.current || !draft) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(endpoint, {
        method: action === "start" ? "POST" : "PUT",
        headers: action === "start" ? undefined :
          { "Content-Type": "application/json" },
        body: action === "start" ? undefined :
          JSON.stringify({ ...draft, complete: action === "complete" }),
        signal: AbortSignal.timeout(15000),
      });

      if (response.status === 401) {
        setSignedOut(true);
        return;
      }

      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === "object" && body !== null &&
          "message" in body && typeof body.message === "string"
          ? body.message : "Your work could not be saved.";
        setError(message);
        return;
      }

      const result = readDiscovery(body);
      if (!result) throw new Error();
      setData(result);
      setDraft(result.discovery);
      setNotice(action === "complete"
        ? "Milestone completed. You earned 25 XP."
        : action === "start" ? "Your journey has started." : "Draft saved.");
    } catch {
      setError("We couldn’t confirm the save. Your text is still here. Please retry.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const completed = data?.journey.activities[0].completed_at != null;
  const activity = activities.find((item) => item.id === draft?.activity_id);
  const canComplete = draft !== null &&
    (draft.interests.length > 0 || draft.unsure) &&
    draft.activity_id !== null &&
    Array.from(draft.work_text.trim()).length >= 20 &&
    Array.from(draft.reflection.trim()).length >= 20;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>EduLens.</Link>
        <nav aria-label="Page navigation">
          <Link href="/student">Dashboard</Link>
          <Link href="/">Home</Link>
          <Link href="/account">Your account</Link>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>EXPLORE · BUILD · SHARE</p>
            <h1>Your next chapter starts with curiosity.</h1>
            <p>Discover what you enjoy through small, practical activities.</p>
          </div>
          {data && (
            <span className={styles.badge}>
              {data.journey.total_xp} XP · {data.journey.progress_percent}%
            </span>
          )}
        </div>

        {loading && <p role="status">Loading your journey…</p>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {notice && <p role="status" className={styles.notice}>{notice}</p>}

        {signedOut ? (
          <Link href="/login" className={styles.primary}>Sign in to continue</Link>
        ) : !loading && !data ? (
          <button type="button" className={styles.primary}
            onClick={() => {
              setLoading(true);
              setAttempt((value) => value + 1);
            }}>
            Try again
          </button>
        ) : data && draft && (
          <div className={styles.layout}>
            <section className={styles.canvas} aria-label="Six-milestone roadmap">
              <p className={styles.canvasTitle}>Your journey · Version 2</p>
              <div className={styles.pathArea}>
                <svg viewBox="0 0 600 1060" preserveAspectRatio="none"
                  className={styles.path} aria-hidden="true">
                  <path
                    d="M180 80 C180 160 420 160 420 260 S180 340 180 440 S420 520 420 620 S180 700 180 800 S420 880 420 980"
                    fill="none" stroke="#dce8df" strokeWidth="12"
                    strokeLinecap="round"
                  />
                  <path
                    d="M180 80 C180 160 420 160 420 260 S180 340 180 440 S420 520 420 620 S180 700 180 800 S420 880 420 980"
                    fill="none" stroke="#91b5a5" strokeWidth="3"
                    strokeDasharray="5 9" strokeLinecap="round"
                  />
                </svg>
                <ol className={styles.milestones}>
                  {milestones.map((title, index) => (
                    <li key={title}
                      style={{ top: `${(80 + index * 180) / 1060 * 100}%` }}>
                      <button type="button"
                        className={selected === index ? styles.selected : ""}
                        aria-pressed={selected === index}
                        aria-controls="discovery-details"
                        onClick={() => setSelected(index)}>
                        <span className={styles.node} aria-hidden="true">
                          {data.journey.activities[index].completed_at ? "✓" : index + 1}
                        </span>
                        <span className={styles.nodeLabel}>
                          <strong>{title}</strong>
                          <span>
                            {data.journey.activities[index].completed_at
                              ? "Completed"
                              : index === 0 ? "Available now" : "Coming next"}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <section id="discovery-details" className={styles.details}>
              <p className={styles.eyebrow}>MILESTONE {selected + 1} OF 6</p>
              <h2>{milestones[selected]}</h2>

              {selected !== 0 ? (
                <p>This milestone is being prepared. Start by exploring your interests.</p>
              ) : !data.journey.started_at ? (
                <>
                  <p>Choose interests, try a small activity, and reflect on how it felt.</p>
                  <button type="button" className={styles.primary}
                    disabled={pending} onClick={() => void submit("start")}>
                    {pending ? "Starting…" : "Start this roadmap"}
                  </button>
                </>
              ) : (
                <form onSubmit={(event) => {
                  event.preventDefault();
                  void submit("complete");
                }}>
                  <fieldset disabled={pending || completed} className={styles.fieldset}>
                    <legend>What sounds interesting?</legend>
                    <p className={styles.hint}>Choose up to three.</p>
                    <div className={styles.choices}>
                      {interestOptions.map((item) => (
                        <label key={item.id}>
                          <input type="checkbox"
                            checked={draft.interests.includes(item.id)}
                            disabled={!draft.interests.includes(item.id) &&
                              draft.interests.length >= 3}
                            onChange={(event) => update({
                              unsure: false,
                              interests: event.target.checked
                                ? [...draft.interests, item.id]
                                : draft.interests.filter((id) => id !== item.id),
                            })} />
                          {item.label}
                        </label>
                      ))}
                      <label>
                        <input type="checkbox" checked={draft.unsure}
                          onChange={(event) => update({
                            unsure: event.target.checked,
                            interests: [],
                          })} />
                        I’m not sure yet
                      </label>
                    </div>

                    <label className={styles.label} htmlFor="exploration">
                      Choose a small activity
                    </label>
                    <select id="exploration" value={draft.activity_id ?? ""}
                      onChange={(event) => update({
                        activity_id: activities.find(
                          (item) => item.id === event.target.value,
                        )?.id ?? null,
                      })}>
                      <option value="">Choose an activity</option>
                      {activities.map((item) => (
                        <option key={item.id} value={item.id}>{item.title}</option>
                      ))}
                    </select>
                    {activity && <p className={styles.instruction}>{activity.instruction}</p>}

                    <label className={styles.label} htmlFor="discovery-work">Your work</label>
                    <textarea id="discovery-work" rows={6} value={draft.work_text}
                      onChange={(event) => {
                        if (Array.from(event.target.value).length <= 10000) {
                          update({ work_text: event.target.value });
                        }
                      }} placeholder="Describe what you tried. You can include a project link." />

                    <label className={styles.label} htmlFor="discovery-reflection">
                      How did it feel?
                    </label>
                    <textarea id="discovery-reflection" rows={4} value={draft.reflection}
                      onChange={(event) => {
                        if (Array.from(event.target.value).length <= 2000) {
                          update({ reflection: event.target.value });
                        }
                      }} placeholder="What did you enjoy? What would you try next?" />
                    <p className={styles.hint}>
                      Add at least 20 characters in both writing fields to complete.
                    </p>

                    {!completed && (
                      <div className={styles.actions}>
                        <button type="button" className={styles.secondary}
                          onClick={() => void submit("draft")}>Save draft</button>
                        <button type="submit" className={styles.primary}
                          disabled={!canComplete}>
                          {pending ? "Saving…" : "Complete · 25 XP"}
                        </button>
                      </div>
                    )}
                  </fieldset>
                  {completed && <p className={styles.notice}>Completed · Your work is saved.</p>}
                </form>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
