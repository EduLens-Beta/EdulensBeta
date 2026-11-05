"use client";

import { useState } from "react";
import styles from "./powerpoint-first-lesson.module.css";

const instructions = [
  ["Start a presentation", "Choose Blank presentation. A presentation is a collection of slides."],
  ["Add your title", "Select the title box and type My science project. This tells your audience what the presentation is about."],
  ["Add a subtitle", "Select the subtitle box. Type a short introduction, such as Exploring the world around us."],
  ["Save your work", "Choose Save presentation. Give the file a useful name so you can find it later."],
];

export default function PowerPointFirstLesson({
  mode,
  onNext,
}: {
  mode: "watch" | "practice";
  onNext: () => void;
}) {
  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [saved, setSaved] = useState(false);
  const watching = mode === "watch";
  const activeStep = watching ? step : !started ? 0 : !title.trim() ? 1 : !subtitle.trim() ? 2 : 3;

  const visibleTitle = watching ? step >= 1 ? "My science project" : "" : title;
  const visibleSubtitle = watching
    ? step >= 2 ? "Exploring the world around us" : ""
    : subtitle;

  function downloadSlide() {
    if (!title.trim() || !subtitle.trim()) return;
    // Export a real SVG copy of the practice slide, not a PowerPoint file.
    const escape = (value: string) => value.replace(
      /[&<>"']/g,
      (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&apos;",
      })[character]!,
    );
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <rect width="1280" height="720" fill="#ffffff"/>
      <rect width="24" height="720" fill="#08685c"/>
      <text x="100" y="300" font-family="Arial,sans-serif" font-size="52" fill="#142f35">${escape(title)}</text>
      <text x="100" y="380" font-family="Arial,sans-serif" font-size="28" fill="#52686c">${escape(subtitle)}</text>
    </svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "my-science-project.svg";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSaved(true);
  }

  return (
    <section className={styles.lesson}>
      <p className={styles.eyebrow}>{watching ? "SEE HOW IT WORKS" : "BUILD YOUR FIRST SLIDE"}</p>
      <h4>A title slide for your science project</h4>
      <p className={styles.intro}>
        Start with a blank slide. Give it a title, add a short introduction, then save a copy.
      </p>

      <div className={styles.layout}>
        <div className={styles.editor}>
          <div className={styles.titlebar}>
            <span className={styles.logo}>P</span>
            EduLens slide practice
          </div>
          <div className={styles.toolbar}>
            <span>Home</span><span>Insert</span><span>Design</span>
            <span className={styles.toolNote}>Practice editor</span>
          </div>

          {!started && !watching ? (
            <div className={styles.start}>
              <button type="button" onClick={() => setStarted(true)}>
                <span className={styles.blankSlide} aria-hidden="true">＋</span>
                Blank presentation
              </button>
            </div>
          ) : (
            <div className={styles.workspace}>
              <aside className={styles.thumbnail} aria-label="Slide list">
                <span>1</span><div aria-hidden="true">Title slide</div>
              </aside>
              <div className={styles.canvas}>
                <div className={styles.slide}>
                  {watching ? (
                    <>
                      <div className={styles.demoTitle} data-highlight={step === 1}>
                        {visibleTitle || "Click to add title"}
                      </div>
                      <div className={styles.demoSubtitle} data-highlight={step === 2}>
                        {visibleSubtitle || "Click to add subtitle"}
                      </div>
                    </>
                  ) : (
                    <>
                      <label className={styles.srOnly} htmlFor="slide-title">Slide title</label>
                      <input
                        id="slide-title"
                        className={styles.titleInput}
                        placeholder="Click or tap to add title"
                        value={title}
                        maxLength={36}
                        onChange={(event) => { setTitle(event.target.value); setSaved(false); }}
                      />
                      <label className={styles.srOnly} htmlFor="slide-subtitle">Slide subtitle</label>
                      <input
                        id="slide-subtitle"
                        className={styles.subtitleInput}
                        placeholder="Click or tap to add subtitle"
                        value={subtitle}
                        maxLength={65}
                        onChange={(event) => { setSubtitle(event.target.value); setSaved(false); }}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className={styles.statusbar}>
            <span>Slide 1 of 1</span>
            <span>{watching && step === 3 ? "Example saved" : saved ? "Download requested" : "Practice space"}</span>
          </div>
        </div>

        <aside className={styles.guide}>
          <h5>{watching ? "Watch one action at a time" : "Your checklist"}</h5>
          {instructions.map(([heading, description], index) => (
            <div key={heading} className={styles.step} data-active={activeStep === index}>
              <span>{index + 1}</span>
              <div><strong>{heading}</strong><p>{description}</p></div>
            </div>
          ))}
        </aside>
      </div>

      <p className={styles.note}>
        This is an EduLens simulation, not Microsoft PowerPoint.
        In the actual app, saving creates a presentation file. This practice exports an SVG image of your slide.
      </p>

      {!watching && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            disabled={!started || !title.trim() || !subtitle.trim()}
            onClick={downloadSlide}
          >
            Save a practice copy ↓
          </button>
          {saved && <span role="status">Nice work! You created a title slide and requested a download.</span>}
        </div>
      )}

      <footer className={styles.footer}>
        <span>{watching ? `Step ${step + 1} of 4` : "Your title should explain what your presentation is about."}</span>
        <div className={styles.actions}>
          {watching && (
            <button type="button" className={styles.secondary}
              disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
              Previous
            </button>
          )}
          <button
            type="button"
            className={styles.primary}
            disabled={!watching && !saved}
            onClick={() => {
              if (watching && step < 3) setStep((value) => value + 1);
              else onNext();
            }}
          >
            {watching ? step < 3 ? "Show next action →" : "Let me try →" : "Take the quiz →"}
          </button>
        </div>
      </footer>
    </section>
  );
}
