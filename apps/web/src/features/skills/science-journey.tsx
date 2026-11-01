"use client";


import ActivityWork from "./activity-work";
import { useLearning } from "./learning-provider";

import { scienceExplorerRoadmap } from "./science-roadmap";
import styles from "./journey.module.css";

export default function ScienceJourney() {
  const { journey, selected, setSelected } = useLearning();
  const step = scienceExplorerRoadmap.steps[selected];

  return (
    <section id="science-roadmap" className={styles.journey}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>YOUR SKILL JOURNEY</p>
          <h2>{scienceExplorerRoadmap.title}</h2>
          <p>{scienceExplorerRoadmap.description}</p>
        </div>
        <span className={styles.previewBadge}>
          {journey?.started_at ? `${journey.progress_percent}% complete` : "Roadmap preview"}
        </span>
      </header>

      <div className={styles.layout}>


        <div className={styles.canvas}>
          <div className={styles.canvasTop}>
            <span className={styles.journeyPill}>Your journey</span>
            <span>4 milestones · Explore at your pace</span>
          </div>

          <div className={styles.pathArea}>
            <svg
              viewBox="0 0 600 700"
              preserveAspectRatio="none"
              className={styles.path}
              aria-hidden="true"
            >
              <path
                d="M180 80 C180 160 420 160 420 260 S180 340 180 440 S420 520 420 620"
                fill="none"
                stroke="#dce8df"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M180 80 C180 160 420 160 420 260 S180 340 180 440 S420 520 420 620"
                fill="none"
                stroke="#91b5a5"
                strokeWidth="3"
                strokeDasharray="5 9"
                strokeLinecap="round"
              />
            </svg>

            <ol className={styles.milestones} aria-label="Roadmap milestones">
              {scienceExplorerRoadmap.steps.map((item, index) => (
                <li key={item.id} className={styles.milestone}>
                  <button
                    type="button"
                    className={`${styles.milestoneButton} ${
                      selected === index ? styles.selected : ""
                    }`}
                    onClick={() => setSelected(index)}
                    aria-pressed={selected === index}
                    aria-controls="science-step-details"
                  >
                    <span className={styles.node} aria-hidden="true">
                      {journey?.activities[index]?.completed_at ? "✓" : index + 1}
                    </span>
                    <span className={styles.nodeLabel}>
                      <span className={styles.nodeSkill}>{item.skill}</span>
                      <span className={styles.nodeTitle}>{item.title}</span>
                      <span className={styles.nodeStatus}>
                        {journey?.activities[index]?.completed_at
                          ? "Completed · 25 XP"
                          : journey?.started_at && journey.next_step_id === item.id
                            ? "Your next activity"
                            : selected === index ? "Viewing details" : "Explore milestone"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.chatNotice}>
            <span className={styles.chatIcon} aria-hidden="true">✦</span>
            <div>
              <strong>Your interests can shape your next steps.</strong>
              <p>Chat-guided planning is coming next.</p>
            </div>
          </div>
        </div>

        <section
          id="science-step-details"
          className={styles.details}
          aria-labelledby="science-step-title"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className={styles.eyebrow}>
            MILESTONE {selected + 1} OF {scienceExplorerRoadmap.steps.length}
          </p>
          <span className={styles.detailSkill}>{step.skill}</span>
          <h3 id="science-step-title">{step.title}</h3>
          <p className={styles.activity}>{step.activity}</p>

          <div className={styles.outcome}>
            <h4>What you’ll create</h4>
            <p>{step.outcome}</p>
          </div>

          <div className={styles.detailNavigation}>
            <button
              type="button"
              disabled={selected === 0}
              onClick={() => setSelected((value) => value - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={selected === scienceExplorerRoadmap.steps.length - 1}
              onClick={() => setSelected((value) => value + 1)}
            >
              Next
            </button>
          </div>

          <ActivityWork stepId={step.id} />
        </section>
      </div>
    </section>
  );
}
