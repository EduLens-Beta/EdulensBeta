"use client";

import Image from "next/image";
import { useState } from "react";
import type { CourseProgress } from "./course-data";
import { readSkillsProgress } from "./course-data";
import { useCourses } from "./course-provider";
import styles from "./powerpoint-introduction.module.css";

const media = "https://support.microsoft.com/en-us/powerpoint/media/";
function screenshotUrl(filename: string) {
  return filename.startsWith("https://") ? filename : `${media}${filename}`;
}

const steps = [
  {
    title: "Start with a blank presentation",
    lines: [
      "Open PowerPoint. Choose New, then Blank Presentation.",
      "You now have a presentation with a title slide. A layout decides where the title and other content go.",
    ],
    image: null,
    alt: "",
  },
  {
    title: "Add your title and subtitle",
    lines: [
      "Click the box that says Click to add title. Type My science project.",
      "Click the subtitle box below it. Type a short introduction, such as How plants grow.",
    ],
    image: "ppt-bt-addtext-345.png",
    alt: "PowerPoint screenshot showing where to enter text on a slide",
  },
  {
    title: "Edit your words",
    lines: [
      "Find the title box shown below. Click inside the words, not on the border.",
      "To change one word on a computer, double-click that word. On a touch screen, press and hold the word and adjust the selection handles.",
      "Type your new word. It replaces the selected word.",
      "For example: change Science project to My science project.",
    ],
    image: "ppt-placeholdertitletext.gif",
    alt: "Real PowerPoint example showing the title text box on a slide",
  },
  {
    title: "Choose a font and text size",
    lines: [
      "Select your title words first. Then choose Home.",
      "Find the font name, such as Arial. Open its list to choose a different style of letters.",
      "Look for the number beside the font name. This is the text size. The screenshot below shows the size box.",
      "Choose a larger number to make the words bigger. Choose a smaller number to make them smaller.",
    ],
    image: "https://support.microsoft.com/en-au/office/media/ogx15fontsizebox.png",
    alt: "Microsoft Office screenshot showing the Font Size box on the Home tab",
  },
  {
    title: "Change your text colour",
    lines: [
      "Keep your text selected. On Home, choose the arrow beside Font Color.",
      "Choose a colour from the menu. The selected words change colour.",
      "Keep enough contrast: dark words on a light background are easier to read.",
    ],
    image: "powerpoint16-fontcolor.png",
    alt: "PowerPoint screenshot showing the Font Color menu",
  },
  {
    title: "Add another slide",
    lines: [
      "Open Home and choose New Slide.",
      "Open the New Slide menu to choose a layout, such as Title and Content.",
      "Your new slide appears in the slide list on the left. Select a slide there whenever you want to edit it.",
    ],
    image: "powerpoint16-newslide.png",
    alt: "PowerPoint screenshot showing New Slide and the layout menu",
  },
  {
    title: "Save your presentation",
    lines: [
      "In desktop PowerPoint, choose File, then Save or Save As.",
      "Choose a folder, give your work a name such as My science project, and select Save.",
      "PowerPoint for the web normally saves to OneDrive automatically. Select the file name at the top to rename it.",
    ],
    image: "ppt-bt-savepresentation-345.png",
    alt: "PowerPoint screenshot showing how to save a presentation",
  },
];

const questions = [
  {
    title: "You want to change the font and size of your title. What should you do first?",
    choices: ["Delete the slide", "Select the title text", "Start Slide Show"],
    correct: 1,
    explanation: "Select the words first. Then use the Font tools on Home.",
  },
  {
    title: "How do you add another slide?",
    choices: ["Choose Home → New Slide", "Change the font colour", "Close the presentation"],
    correct: 0,
    explanation: "New Slide adds a page. Its menu lets you choose the layout.",
  },
];

export default function PowerPointCreateEpisode({
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

  async function submit() {
    setChecked(true);
    setError("");
    if (questions.some((question, index) => answers[index] !== question.correct)) return;

    setSaving(true);
    try {
      if (!course.started_at && !await startCourse(course.id)) return;

      const response = await fetch(
        "/api/student/courses/powerpoint/lessons/first-slides/quiz",
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
        throw new Error("Your result could not be confirmed. Please try again.");
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
      <p className={styles.simpleEyebrow}>EPISODE 2</p>
      <h3>Create your first slide</h3>

      {!showQuiz ? (
        <>
          <p className={styles.source}>
            These examples show desktop PowerPoint. Controls may be arranged differently on Mac, mobile or the web.
          </p>
          {steps.map((step, index) => (
            <section key={step.title} className={styles.realScreenshot}>
              <h4>{index + 1}. {step.title}</h4>
              <ol className={styles.instructions}>
                {step.lines.map((line) => <li key={line}>{line}</li>)}
              </ol>
              {step.image && (
                <a href={screenshotUrl(step.image)} target="_blank" rel="noreferrer">
                  <Image
                    src={screenshotUrl(step.image)}
                    alt={step.alt}
                    width={1000}
                    height={650}
                    unoptimized
                    style={{ width: "100%", height: "auto" }}
                  />
                </a>
              )}
            </section>
          ))}
          <p className={styles.source}>
            Screenshots and reference: <a
              href="https://support.microsoft.com/en-us/powerpoint/basic-tasks-for-creating-a-powerpoint-presentation"
              target="_blank"
              rel="noreferrer"
            >Microsoft Support</a>. Select a screenshot to open it larger.
          </p>
          <button type="button" className={styles.primary} onClick={() => setShowQuiz(true)}>
            Try two questions →
          </button>
        </>
      ) : passed ? (
        <div className={styles.success} role="status">
          <h4>Well done! Both answers are correct.</h4>
          <p>This episode is completed. Your next episode is ready.</p>
          <button
            type="button"
            className={styles.primary}
            disabled={loading || pending}
            onClick={onContinue}
          >Next episode →</button>
        </div>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <button
            type="button"
            className={styles.readBack}
            disabled={saving}
            onClick={() => setShowQuiz(false)}
          >← Read the lesson again</button>

          {questions.map((question, index) => (
            <fieldset key={question.title} className={styles.simpleQuestion}>
              <legend>{index + 1}. {question.title}</legend>
              {question.choices.map((choice, option) => (
                <label key={choice} className={styles.choice}>
                  <input
                    type="radio"
                    name={`slide-question-${index}`}
                    checked={answers[index] === option}
                    disabled={saving}
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
          <button type="submit" className={styles.primary} disabled={saving || pending || loading}>
            {saving ? "Saving your result…" : "Check my answers"}
          </button>
        </form>
      )}
    </section>
  );
}
