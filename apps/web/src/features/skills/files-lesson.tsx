"use client";

import { useState } from "react";
import styles from "./files-lesson.module.css";

const steps = [
  {
    title: "Find your assignment",
    text: "Your downloaded assignment is in Downloads. Let’s give it a place of its own.",
  },
  {
    title: "Create a folder",
    text: "Make a folder called Science assignments. A clear name helps you find your work later.",
  },
  {
    title: "Move the assignment",
    text: "Put Science assignment.pdf inside the new folder. Open the folder to check it is there.",
  },
];

function FileIcon() {
  return (
    <svg viewBox="0 0 32 36" width="32" height="36" fill="none" aria-hidden="true">
      <path d="M5 2h14l8 8v24H5z" fill="#fff" stroke="#b66a62" strokeWidth="2" />
      <path d="M19 2v9h8M10 20h12M10 25h9" stroke="#b66a62" strokeWidth="2" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 44 34" width="44" height="34" fill="none" aria-hidden="true">
      <path d="M2 8V3h15l5 5h20v24H2z" fill="#e9bc5c" />
      <path d="M2 11h40v21H2z" fill="#f6d184" />
    </svg>
  );
}

export default function FilesLesson({
  mode,
  onNext,
}: {
  mode: "watch" | "practice";
  onNext: () => void;
}) {
  const [demoStep, setDemoStep] = useState(0);
  const [name, setName] = useState("");
  const [created, setCreated] = useState(false);
  const [moved, setMoved] = useState(false);
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState("");

  const watching = mode === "watch";
  const activeStep = watching ? demoStep : !created ? 1 : 2;
  const showFolder = watching ? demoStep >= 1 : created;
  const fileMoved = watching ? demoStep >= 2 : moved;
  const insideFolder = watching ? demoStep >= 2 : opened;

  return (
    <section className={styles.lesson}>
      <p className={styles.eyebrow}>{watching ? "FOLLOW THE DEMONSTRATION" : "YOUR TURN"}</p>
      <h4>Save your science assignment</h4>
      <p className={styles.intro}>
        Keep your work somewhere you can find tomorrow.
      </p>

      <div className={styles.layout}>
        <div>
          <div className={styles.window}>
            <div className={styles.windowHeader}>
              <span className={styles.dot} />
              EduLens practice files
            </div>
            <div className={styles.breadcrumb}>
              <button
                type="button"
                onClick={() => setOpened(false)}
                disabled={watching}
              >
                Downloads
              </button>
              {insideFolder && <span> / Science assignments</span>}
            </div>
            <div className={styles.fileArea}>
              {insideFolder ? (
                <div className={styles.file}>
                  <FileIcon />
                  <strong>Science assignment.pdf</strong>
                  <span>Your assignment is here.</span>
                </div>
              ) : (
                <>
                  {!fileMoved && (
                    <div className={styles.file}>
                      <FileIcon />
                      <strong>Science assignment.pdf</strong>
                      <span>Practice document</span>
                    </div>
                  )}
                  {showFolder && (
                    <button
                      type="button"
                      className={styles.folder}
                      disabled={watching}
                      onClick={() => setOpened(true)}
                    >
                      <FolderIcon />
                      <strong>Science assignments</strong>
                      <span>{fileMoved ? "1 file · Open folder" : "Empty folder · Open"}</span>
                    </button>
                  )}
                </>
              )}
              {insideFolder && !fileMoved && !watching && (
                <p>This folder is empty. Go back to Downloads to move your file.</p>
              )}
            </div>
            <div className={styles.windowFooter}>
              Practice space — your device’s files are unchanged.
            </div>
          </div>

          {!watching && !created && (
            <form
              className={styles.controls}
              onSubmit={(event) => {
                event.preventDefault();
                if (name.trim().toLowerCase() !== "science assignments") {
                  setError("Name your folder Science assignments.");
                  return;
                }
                setCreated(true);
                setError("");
              }}
            >
              <label htmlFor="science-folder">Name your new folder</label>
              <div className={styles.inputRow}>
                <input
                  id="science-folder"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Science assignments"
                  maxLength={80}
                  required
                />
                <button type="submit" className={styles.primary}>Create folder</button>
              </div>
              {error && <p role="alert">{error}</p>}
            </form>
          )}

          {!watching && created && !moved && !opened && (
            <div className={styles.controls}>
              <p>Now move your PDF into the folder.</p>
              <button
                type="button"
                className={styles.primary}
                onClick={() => setMoved(true)}
              >
                Move assignment into Science assignments →
              </button>
            </div>
          )}

          {!watching && moved && (
            <p className={styles.success} role="status">
              {opened
                ? "✓ You found it! Your assignment is saved in the right folder."
                : "✓ File moved. Open Science assignments to check it is there."}
            </p>
          )}
        </div>

        <aside className={styles.instructions}>
          <h5>{watching ? "Follow these steps" : "Your task"}</h5>
          {steps.map((step, index) => (
            <div
              key={step.title}
              className={styles.instruction}
              data-active={index === activeStep}
            >
              <span>{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </div>
            </div>
          ))}
        </aside>
      </div>

      <footer className={styles.footer}>
        {watching ? (
          <>
            <span aria-live="polite">Step {demoStep + 1} of 3</span>
            <div className={styles.buttons}>
              <button
                type="button"
                className={styles.secondary}
                disabled={demoStep === 0}
                onClick={() => setDemoStep((value) => value - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  if (demoStep < 2) setDemoStep((value) => value + 1);
                  else onNext();
                }}
              >
                {demoStep < 2 ? "Show the next step →" : "Let me try →"}
              </button>
            </div>
          </>
        ) : (
          <>
            <span>{moved && opened ? "Practice finished. Ready for a quick check?" : "Create → Move → Open and check"}</span>
            <button
              type="button"
              className={styles.primary}
              disabled={!moved || !opened}
              onClick={onNext}
            >
              Take the quiz →
            </button>
          </>
        )}
      </footer>
    </section>
  );
}
