"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  isEmptySchoolDetails,
  isSchoolClass,
  isSchoolDetails,
  schoolClasses,
  studyGroups,
  type SchoolClass,
  type SchoolDetails,
  type StudyGroup,
} from "./school-details";
import styles from "./student.module.css";

type State =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "wrong-stage" }
  | { status: "error" }
  | { status: "ready"; details: SchoolDetails | null };

export default function SchoolExperience({ name }: { name: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const submitting = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/student/school-details", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!active) return;
        if (response.status === 401) {
          setState({ status: "signed-out" });
          return;
        }
        if (response.status === 409) {
          setState({ status: "wrong-stage" });
          return;
        }
        if (!response.ok) throw new Error("School details unavailable.");

        const result: unknown = await response.json();
        if (!active) return;

        if (isSchoolDetails(result)) {
          setSchoolClass(result.school_class);
          setGroup(result.study_group);
          setState({ status: "ready", details: result });
        } else if (isEmptySchoolDetails(result)) {
          setState({ status: "ready", details: null });
        } else {
          throw new Error("Invalid school details.");
        }
      } catch {
        if (active) setState({ status: "error" });
      }
    }

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolClass || !group || submitting.current) return;

    submitting.current = true;
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/student/school-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_class: schoolClass,
          study_group: group,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (response.status === 401) {
        setState({ status: "signed-out" });
        return;
      }
      if (response.status === 409) {
        setState({ status: "wrong-stage" });
        return;
      }

      const result: unknown = await response.json();
      if (
        !response.ok ||
        !isSchoolDetails(result) ||
        result.school_class !== schoolClass ||
        result.study_group !== group
      ) {
        throw new Error("Selection not confirmed.");
      }

      setState({ status: "ready", details: result });
      setEditing(false);
      requestAnimationFrame(() => headingRef.current?.focus());
    } catch {
      setMessage("We couldn't save your class and group. Please try again.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  if (state.status === "loading") {
    return <p className={styles.stateBox} role="status">Loading your school details…</p>;
  }

  if (state.status === "signed-out") {
    return (
      <section className={styles.stateBox}>
        <h1>Please sign in to continue.</h1>
        <Link href="/login" className={styles.primary}>Sign in</Link>
      </section>
    );
  }

  if (state.status === "wrong-stage") {
    return (
      <section className={styles.stateBox}>
        <h1>Let’s check your education stage.</h1>
        <p>Your education stage may have changed in another tab.</p>
        <Link href="/welcome" className={styles.primary}>Choose education stage</Link>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className={styles.stateBox}>
        <h1>We couldn’t load your school details.</h1>
        <p role="alert">Please try again in a moment.</p>
        <button type="button" className={styles.primary}
          onClick={() => window.location.reload()}>
          Try again
        </button>
      </section>
    );
  }

  const details = state.details;
  const groupLabel = studyGroups.find(
    (item) => item.value === details?.study_group,
  )?.label;

  if (!details || editing) {
    return (
      <section className={styles.schoolSetup}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>YOUR SCHOOL CHAPTER</p>
          <p className={styles.greeting}>Let’s make this your space, {name}.</p>
          <h1>Which class and group are you in?</h1>
          <p className={styles.subtitle}>
            Choose your current class and study group.
          </p>
        </div>

        <form onSubmit={save} aria-busy={pending}>
          <fieldset className={styles.schoolFieldset} disabled={pending}>
            <legend>Your class</legend>
            <div className={styles.classChoices}>
              {schoolClasses.map((value) => (
                <label key={value} className={styles.schoolChoice}>
                  <input
                    type="radio"
                    name="school_class"
                    value={value}
                    checked={schoolClass === value}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (isSchoolClass(value)) setSchoolClass(value);
                      setMessage("");
                    }}
                    className={styles.radio}
                    required
                  />
                  <span className={styles.schoolOption}>
                    Class {value}
                    <span aria-hidden="true">{schoolClass === value ? "✓" : "○"}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.schoolFieldset} disabled={pending}>
            <legend>Your study group</legend>
            <div className={styles.groupChoices}>
              {studyGroups.map((item) => (
                <label key={item.value} className={styles.schoolChoice}>
                  <input
                    type="radio"
                    name="study_group"
                    value={item.value}
                    checked={group === item.value}
                    onChange={() => {
                      setGroup(item.value);
                      setMessage("");
                    }}
                    className={styles.radio}
                    required
                  />
                  <span className={styles.schoolOption}>
                    {item.label}
                    <span aria-hidden="true">{group === item.value ? "✓" : "○"}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className={styles.actions}>
            <p className={styles.message} role="status" aria-live="polite">
              {message}
            </p>
            <button type="submit" className={styles.primary}
              disabled={!schoolClass || !group || pending}>
              {pending ? "Saving your details…" : "Continue"}
              <span aria-hidden="true">→</span>
            </button>
            <p className={styles.reassurance}>You can change these details later.</p>
            {details && (
              <button type="button" className={styles.quietButton}
                disabled={pending}
                onClick={() => {
                  setSchoolClass(details.school_class);
                  setGroup(details.study_group);
                  setMessage("");
                  setEditing(false);
                }}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className={styles.setupBack}>
          <Link href="/welcome" className={styles.textLink}>
            Change education stage
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.home}>
      <div className={styles.homeTop}>
        <span className={styles.stageBadge}>
          Class {details.school_class} · {groupLabel}
        </span>
        <button type="button" className={styles.quietButton}
          onClick={() => setEditing(true)}>
          Change class or group
        </button>
      </div>

      <p className={styles.greeting}>Hello, {name}.</p>
      <h1 ref={headingRef} tabIndex={-1}>
        Your studies today. Your next chapter tomorrow.
      </h1>
      <p className={styles.subtitle}>
        A space for your SSC preparation and college ambitions.
      </p>

      {details.study_group === "science" ? (
        <div className={styles.goalGrid}>
          <section className={styles.goalCard}>
            <span className={styles.goalNumber} aria-hidden="true">01</span>
            <h2>My SSC goal</h2>
            <p>
              Set your target and build a clearer picture of what to work on
              in your studies.
            </p>
            <span className={styles.preparing}>Goal setting is coming next</span>
          </section>
          <section className={styles.goalCard}>
            <span className={styles.goalNumber} aria-hidden="true">02</span>
            <h2>My college goals</h2>
            <p>
              Keep your college ambitions together and understand the
              preparation ahead.
            </p>
            <span className={styles.preparing}>College planning is coming next</span>
          </section>
        </div>
      ) : (
        <div className={styles.upcoming}>
          <p className={styles.eyebrow}>YOUR DETAILS ARE SAVED</p>
          <h2>Your {groupLabel} space is taking shape.</h2>
          <p>
            We’re preparing SSC and college-planning tools for your group.
            You won’t be shown Science-specific study guidance.
          </p>
        </div>
      )}

      <div className={styles.setupBack}>
        <Link href="/welcome" className={styles.textLink}>
          Change education stage
        </Link>
      </div>
    </section>
  );
}
