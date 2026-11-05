"use client";

import Image from "next/image";
import { useState } from "react";
import type { CourseProgress } from "./course-data";
import { readSkillsProgress } from "./course-data";
import { useCourses } from "./course-provider";
import styles from "./powerpoint-introduction.module.css";

const screenshots = [
  {
    title: "This is a slide",
    text: "A slide is one page. You can add a title, some words and pictures. A group of slides is called a presentation.",
    image: "https://support.microsoft.com/en-us/powerpoint/media/ppt-bt-addtext-345.png",
    alt: "Microsoft PowerPoint screenshot showing text placeholders on a slide",
  },
  {
    title: "These are PowerPoint’s tools",
    text: "The tools sit at the top of the window. For example, New Slide adds another page to your presentation.",
    image: "https://support.microsoft.com/en-us/powerpoint/media/powerpoint16-newslide.png",
    alt: "Microsoft PowerPoint screenshot showing New Slide on the Home ribbon",
  },
];

const questions = [
  {
    title: "What do we use PowerPoint for?",
    choices: [
      "Showing ideas using slides",
      "Keeping our account passwords",
      "Finding files in a folder",
    ],
    correct: 0,
    explanation: "PowerPoint helps you explain an idea using slides with words and pictures.",
  },
  {
    title: "What is a slide?",
    choices: [
      "A folder on your device",
      "One page of a presentation",
      "An email address",
    ],
    correct: 1,
    explanation: "One page is a slide. Several slides together make a presentation.",
  },
];

export default function PowerPointIntroduction({
  course,
  onContinue,
}: {
  course: CourseProgress;
  onContinue: () => void;
}) {
  const { startCourse, reload, pending, loading } = useCourses();
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passed, setPassed] = useState(false);
  const [error, setError] = useState("");

  const alreadyCompleted = course.lessons.find(
    (lesson) => lesson.id === "meet-powerpoint",
  )?.status === "completed";
  const blocked = saving || pending || loading;

  async function submit() {
    setChecked(true);
    setError("");
    if (questions.some((question, index) => answers[index] !== question.correct)) return;

    setSaving(true);
    try {
      if (!course.started_at) {
        const started = await startCourse(course.id);
        if (!started) return;
      }

      const response = await fetch(
        "/api/student/courses/powerpoint/lessons/meet-powerpoint/quiz",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: [answers[0], answers[1]] }),
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        },
      );
      const body: unknown = await response.json();
      if (!response.ok || !readSkillsProgress(body)) {
        throw new Error("Could not confirm your result. Please try again.");
      }

      await reload();
      setPassed(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.simple}>
      <p className={styles.simpleEyebrow}>EPISODE 1</p>
      <h3>Meet PowerPoint</h3>

      {!showQuiz ? (
        <>
          <section className={styles.reading}>
            <h4>What is PowerPoint?</h4>
            <p>PowerPoint is an app for making presentations. It helps you explain an idea using words and pictures.</p>
            <h4>Why would I use it?</h4>
            <p>You can share a school project, explain something you learned or tell a story to your class.</p>
            <h4>What are slides?</h4>
            <p>Think of a presentation as a digital book. Each page is called a slide. You show the slides one after another while you speak.</p>
          </section>

          {screenshots.map((shot) => (
            <figure key={shot.title} className={styles.realScreenshot}>
              <figcaption>
                <h4>{shot.title}</h4>
                <p>{shot.text}</p>
              </figcaption>
              <a href={shot.image} target="_blank" rel="noreferrer">
                <Image
                  src={shot.image}
                  alt={shot.alt}
                  width={1000}
                  height={650}
                  unoptimized
                  style={{ width: "100%", height: "auto" }}
                />
              </a>
            </figure>
          ))}

          <p className={styles.source}>
            Screenshots: <a
              href="https://support.microsoft.com/en-us/powerpoint/basic-tasks-for-creating-a-powerpoint-presentation"
              target="_blank"
              rel="noreferrer"
            >Microsoft Support</a>.
            Your PowerPoint version may look a little different.
          </p>
          <button type="button" className={styles.primary} onClick={() => setShowQuiz(true)}>
            Try two questions →
          </button>
        </>
      ) : passed ? (
        <div className={styles.success} role="status">
          <h4>Well done! You got both right.</h4>
          <p>Meet PowerPoint is completed. You’re ready to create your first slide.</p>
          <button
            type="button"
            className={styles.primary}
            disabled={blocked}
            onClick={onContinue}
          >
            Next episode →
          </button>
        </div>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <button
            type="button"
            className={styles.readBack}
            disabled={blocked}
            onClick={() => setShowQuiz(false)}
          >← Read the lesson again</button>

          {questions.map((question, index) => (
            <fieldset key={question.title} className={styles.simpleQuestion}>
              <legend>{index + 1}. {question.title}</legend>
              {question.choices.map((choice, option) => (
                <label key={choice} className={styles.choice}>
                  <input
                    type="radio"
                    name={`intro-question-${index}`}
                    checked={answers[index] === option}
                    disabled={blocked}
                    required
                    onChange={() => {
                      setAnswers((previous) => ({ ...previous, [index]: option }));
                      setChecked(false);
                      setError("");
                    }}
                  />
                  <span>{choice}</span>
                </label>
              ))}
              {checked && (
                <p className={answers[index] === question.correct ? styles.success : styles.feedback}>
                  {answers[index] === question.correct ? "✓ Correct. " : "Not quite. "}
                  {question.explanation}
                </p>
              )}
            </fieldset>
          ))}

          {error && <p role="alert">{error}</p>}
          <button type="submit" className={styles.primary} disabled={blocked}>
            {saving ? "Saving your result…" : "Check my answers"}
          </button>
          {alreadyCompleted && (
            <p className={styles.source}>You have already completed this episode. You can review it without losing progress.</p>
          )}
        </form>
      )}
    </section>
  );
}
