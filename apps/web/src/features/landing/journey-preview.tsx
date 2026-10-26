"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { studentStages } from "./content";
import styles from "./landing.module.css";

export default function JourneyPreview() {
  const [stageIndex, setStageIndex] = useState(3);
  const [completed, setCompleted] = useState(false);
  const resultId = useId();
  const stage = studentStages[stageIndex];

  return (
    <div className={styles.preview} data-completed={completed}>
      <div className={styles.previewBar}>
        <span className={styles.previewBrand}>Example student journey</span>
        <span className={styles.previewLabel}>Product preview</span>
      </div>

      <div
        className={styles.stageSelector}
        aria-label="Choose an example student stage"
      >
        {studentStages.map((item, index) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={stageIndex === index}
            className={stageIndex === index ? styles.selectedStage : undefined}
            onClick={() => {
              setStageIndex(index);
              setCompleted(false);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.previewBody}>
        <div className={styles.previewGreeting}>
          <span className={styles.eyebrow}>AN EXAMPLE GOAL</span>
          <h3>{stage.goal}</h3>
          <p>A clear direction. One useful action at a time.</p>
        </div>

        <div className={styles.taskCard}>
          <div className={styles.taskTop}>
            <span className={styles.taskBadge}>Example task</span>
            <span aria-hidden="true">{completed ? "↓" : "↗"}</span>
          </div>

          <h4>{stage.task}</h4>
          <p>
            Imagine finishing this task. See how it could help you move forward.
          </p>

          <button
            type="button"
            className={styles.demoButton}
            aria-expanded={completed}
            aria-controls={resultId}
            onClick={() => setCompleted((value) => !value)}
          >
            {completed ? "Hide account details" : "Explore your own journey"}
            <span aria-hidden="true">{completed ? "−" : "↓"}</span>
          </button>

          <p className={styles.previewHint}>
            See how to get started below.
          </p>

          <div id={resultId} hidden={!completed}>
            {completed && (
              <div className={styles.inlineResult}>


                <div className={styles.previewInvitation}>
                  <h4>Curious about your own journey?</h4>
                  <p>
                    Create an EduLens account to join our early build.
                    Personal journeys and task tools are still in development.
                  </p>
                  <Link href="/signup" className={styles.primaryButton}>
                    Create your account <span aria-hidden="true">↗</span>
                  </Link>
                  <p className={styles.previewSignIn}>
                    Opens the signup page. Already registered?{" "}
                    <Link href="/login">Sign in</Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.syncLine}>
          <span aria-hidden="true">↓</span>
          {completed ? "Here’s how the example connects" : "Your progress, connected"}
        </div>

        <div
          className={styles.updateGrid}
          aria-live="polite"
          aria-atomic="true"
        >
          <div>
            <span className={styles.smallIcon} aria-hidden="true">◎</span>
            <strong>Your profile</strong>
            <p>{completed ? stage.evidence : "Your current interests and goals"}</p>
          </div>
          <div>
            <span className={styles.smallIcon} aria-hidden="true">◇</span>
            <strong>Your progress</strong>
            <p>
              {completed
                ? "Something new you have achieved"
                : "See what you can work on"}
            </p>
          </div>
          <div>
            <span className={styles.smallIcon} aria-hidden="true">↗</span>
            <strong>What’s next</strong>
            <p>{completed ? stage.next : "A focused step toward your goal"}</p>
          </div>
        </div>

        <p className={styles.previewNote}>
          Sample experience only. No real tasks or account data are changed.
        </p>
      </div>
    </div>
  );
}
