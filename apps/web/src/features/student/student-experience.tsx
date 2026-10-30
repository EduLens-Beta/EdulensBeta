"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  educationStages,
  isEducationStage,
  type EducationStage,
} from "./education-stages";
import SchoolExperience from "./school-experience";
import styles from "./student.module.css";

type Screen = "welcome" | "home";
type Account = { name: string };
type State =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error" }
  | {
      status: "ready";
      account: Account;
      stage: EducationStage | null;
    };

const stageIntroductions: Record<EducationStage, {
  title: string;
  description: string;
  topics: string[];
}> = {
  class_6_8: {
    title: "Big discoveries start with a little curiosity.",
    description:
      "This is your space to explore what you enjoy and find new things to learn.",
    topics: ["Your interests", "Learning habits", "Small projects"],
  },
  class_9_10: {
    title: "Explore what comes next, one step at a time.",
    description:
      "This is your space to connect your subjects, interests, and growing skills.",
    topics: ["Subject interests", "Skills to explore", "Future study paths"],
  },
  college: {
    title: "Make room for your next chapter.",
    description:
      "This is your space to explore subjects and university paths that interest you.",
    topics: ["University paths", "Subject choices", "Preparation"],
  },
  university: {
    title: "Turn what you learn into new possibilities.",
    description:
      "This is your space to connect your learning with skills, projects, and career interests.",
    topics: ["Skills", "Projects", "Career interests"],
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readAccount(value: unknown): Account | null {
  if (
    !isRecord(value) ||
    !isRecord(value.user) ||
    typeof value.user.name !== "string"
  ) {
    return null;
  }
  return { name: value.user.name };
}

function StageDrawing({ index }: { index: number }) {
  return (
    <svg
      viewBox="0 0 160 105"
      fill="none"
      aria-hidden="true"
      className={styles.drawing}
    >
      <circle cx="80" cy="51" r="43" fill="currentColor" opacity=".07" />
      {index === 0 ? (
        <>
          <path d="M80 82V43M80 62C55 62 48 48 48 35c19 0 32 8 32 27ZM80 52c0-21 15-28 32-28 0 17-10 28-32 28Z"
            stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
          <path d="M62 83h36M108 67l5 5m-69-7 5-5" stroke="currentColor"
            strokeWidth="3" strokeLinecap="round" />
        </>
      ) : index === 1 ? (
        <>
          <path d="M80 34c-12-8-28-9-43-4v49c15-5 31-4 43 4 12-8 28-9 43-4V30c-15-5-31-4-43 4Zm0 0v49"
            stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
          <path d="m48 43 19 3m-19 9 19 3m26-12 18-3m-18 15 18-3"
            stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : index === 2 ? (
        <>
          <path d="M42 83h76M51 83V48h58v35M43 48l37-24 37 24H43Z"
            stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
          <path d="M65 60v14m15-14v14m15-14v14M80 24V14h20l-5 7H80"
            stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M40 39h80v45H40V39Zm25 0V27h30v12M40 54c25 11 55 11 80 0M74 57h12v12H74V57Z"
            stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
          <path d="m119 20 3 5 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1 3-5Z"
            fill="currentColor" />
        </>
      )}
    </svg>
  );
}

export default function StudentExperience({ screen }: { screen: Screen }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [selected, setSelected] = useState<EducationStage | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      try {
        const [accountResponse, profileResponse] = await Promise.all([
          fetch("/api/auth/me", {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/student/profile", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        if (!active) return;

        if (accountResponse.status === 401 || profileResponse.status === 401) {
          setState({ status: "signed-out" });
          return;
        }

        if (!accountResponse.ok || !profileResponse.ok) {
          throw new Error("Student space unavailable.");
        }

        const account = readAccount(await accountResponse.json());
        const profile: unknown = await profileResponse.json();

        if (
          !account ||
          !isRecord(profile) ||
          !(profile.education_stage === null ||
            isEducationStage(profile.education_stage))
        ) {
          throw new Error("Invalid student response.");
        }

        if (!active) return;

        if (screen === "home" && profile.education_stage === null) {
          router.replace("/welcome");
          return;
        }

        setSelected(profile.education_stage);
        setState({
          status: "ready",
          account,
          stage: profile.education_stage,
        });
      } catch {
        if (active) setState({ status: "error" });
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [router, screen]);

  async function saveSelection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || submitting.current) return;

    submitting.current = true;
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ education_stage: selected }),
        signal: AbortSignal.timeout(15000),
      });

      if (response.status === 401) {
        setState({ status: "signed-out" });
        return;
      }

      const result: unknown = await response.json();

      if (
        !response.ok ||
        !isRecord(result) ||
        result.education_stage !== selected
      ) {
        throw new Error("Selection not confirmed.");
      }

      router.replace("/student");
    } catch {
      setMessage("We couldn't save your choice. Please try again.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  const stage = state.status === "ready"
    ? educationStages.find((item) => item.value === state.stage)
    : undefined;
  const introduction = stage ? stageIntroductions[stage.value] : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="EduLens home">
          <span className={styles.brandMark} aria-hidden="true">e</span>
          EduLens<span className={styles.brandDot}>.</span>
        </Link>
        <Link href="/account" className={styles.accountLink}>Your account</Link>
      </header>

      <main className={styles.main}>
        {state.status === "loading" && (
          <div className={styles.stateBox} role="status">
            <span className={styles.loadingDot} aria-hidden="true" />
            Getting your space ready…
          </div>
        )}

        {state.status === "signed-out" && (
          <section className={styles.stateBox}>
            <h1>Please sign in to continue.</h1>
            <p>Your student space will be here when you return.</p>
            <Link href="/login" className={styles.primary}>Sign in</Link>
          </section>
        )}

        {state.status === "error" && (
          <section className={styles.stateBox}>
            <h1>We couldn’t open your space.</h1>
            <p role="alert">Please try again in a moment.</p>
            <button type="button" className={styles.primary}
              onClick={() => window.location.reload()}>
              Try again
            </button>
          </section>
        )}

        {state.status === "ready" && screen === "welcome" && (
          <>
            <div className={styles.intro}>
              <p className={styles.eyebrow}>YOUR STARTING POINT</p>
              <p className={styles.greeting}>
                Welcome to EduLens, {state.account.name}.
              </p>
              <h1>Where are you studying now?</h1>
              <p className={styles.subtitle}>
                Choose one so we can help you get started.
              </p>
            </div>

            <form onSubmit={saveSelection} aria-busy={pending}>
              <fieldset className={styles.fieldset} disabled={pending}>
                <legend className={styles.srOnly}>Your education stage</legend>
                <div className={styles.grid}>
                  {educationStages.map((item, index) => (
                    <label key={item.value} className={styles.choice}>
                      <input
                        type="radio"
                        name="education_stage"
                        value={item.value}
                        checked={selected === item.value}
                        onChange={() => {
                          setSelected(item.value);
                          setMessage("");
                        }}
                        className={styles.radio}
                        required
                      />
                      <span className={styles.card}>
                        <span className={styles.selection} aria-hidden="true">
                          {selected === item.value ? "✓" : ""}
                        </span>
                        <StageDrawing index={index} />
                        <span className={styles.cardTitle}>{item.label}</span>
                        <span className={styles.cardDescription}>
                          {item.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className={styles.actions}>
                <p role="status" aria-live="polite" className={styles.message}>
                  {message}
                </p>
                <button type="submit" className={styles.primary}
                  disabled={!selected || pending}>
                  {pending ? "Saving your choice…" : "Continue"}
                  <span aria-hidden="true">→</span>
                </button>
                <p className={styles.reassurance}>You can change this later.</p>
              </div>
            </form>
          </>
        )}

        {state.status === "ready" && screen === "home" &&
          state.stage === "class_9_10" && (
            <SchoolExperience name={state.account.name} />
          )}

        {state.status === "ready" && screen === "home" &&
          stage && introduction && stage.value !== "class_9_10" && (
            <section className={styles.home}>
              <div className={styles.homeTop}>
                <span className={styles.stageBadge}>{stage.label}</span>
                <Link href="/welcome" className={styles.textLink}>
                  Change education stage
                </Link>
              </div>
              <p className={styles.greeting}>Hello, {state.account.name}.</p>
              <h1>{introduction.title}</h1>
              <p className={styles.subtitle}>{introduction.description}</p>

              <div className={styles.savedNote}>
                <span className={styles.savedIcon} aria-hidden="true">✓</span>
                <div>
                  <h2>Your starting point is saved.</h2>
                  <p>
                    You’ve chosen {stage.label}. You can update this as you
                    move forward.
                  </p>
                </div>
              </div>

              <div className={styles.upcoming}>
                <p className={styles.eyebrow}>WHAT’S COMING TO YOUR SPACE</p>
                <h2>Built around your next chapter.</h2>
                <div className={styles.topicList}>
                  {introduction.topics.map((topic) => (
                    <span key={topic}>{topic}</span>
                  ))}
                </div>
                <p>
                  We’re building these tools. Your education stage is saved;
                  personalised activities aren’t available yet.
                </p>
              </div>
            </section>
          )}
      </main>

      <footer className={styles.footer}>
        A little clarity. A step forward. Your EduLens.
      </footer>
    </div>
  );
}
