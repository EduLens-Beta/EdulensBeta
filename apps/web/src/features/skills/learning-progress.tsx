"use client";

import { useState } from "react";

import { useLearning } from "./learning-provider";
import { scienceExplorerRoadmap } from "./science-roadmap";
import styles from "./workspace.module.css";

export default function LearningProgress({
  onOpen,
}: {
  onOpen: (stepId: string) => void;
}) {
  const { journey, loading } = useLearning();
  const [filter, setFilter] = useState<"in-progress" | "completed">("in-progress");

  if (!journey) {
    return <p role="status">{loading ? "Loading your progress…" : "Your progress is unavailable."}</p>;
  }

  const inProgress = journey.activities.filter(
    (item) => item.completed_at === null && item.work_text.trim() !== "",
  );
  const completed = journey.activities.filter(
    (item) => item.completed_at !== null,
  );
  const activities = filter === "completed" ? completed : inProgress;

  return (
    <section aria-labelledby="progress-title">
      <p className={styles.eyebrow}>MY PROGRESS</p>
      <h2 id="progress-title" className={styles.title}>Look how far you’ve come.</h2>

      <dl className={styles.progressStats}>
        <div><dt>Learning points</dt><dd>{journey.total_xp} XP</dd></div>
        <div><dt>Journey progress</dt><dd>{journey.progress_percent}%</dd></div>
        <div><dt>Activities completed</dt>
          <dd>{journey.completed_count} / {journey.total_activities}</dd>
        </div>
      </dl>

      <progress
        className={styles.progressBar}
        value={journey.completed_count}
        max={journey.total_activities}
        aria-label="Journey completion"
      />

      <div className={styles.progressFilters} aria-label="Activity filters">
        <button type="button" aria-pressed={filter === "in-progress"}
          onClick={() => setFilter("in-progress")}>
          In progress · {inProgress.length}
        </button>
        <button type="button" aria-pressed={filter === "completed"}
          onClick={() => setFilter("completed")}>
          Completed · {completed.length}
        </button>
      </div>

      {activities.length === 0 ? (
        <div className={styles.empty}>
          <h3>{filter === "completed" ? "Your achievements will appear here." : "Ready for your next small step?"}</h3>
          <p>
            {filter === "completed"
              ? "Complete an activity to earn learning points."
              : "Save a draft in your journey to keep track of work in progress."}
          </p>
          <button type="button" className={styles.primary}
            onClick={() => onOpen(
              journey.next_step_id ?? scienceExplorerRoadmap.steps[0].id,
            )}>
            Open my journey
          </button>
        </div>
      ) : (
        <ul className={styles.history}>
          {activities.map((activity) => {
            const step = scienceExplorerRoadmap.steps.find(
              (item) => item.id === activity.step_id,
            );
            return (
              <li key={activity.step_id}>
                <div>
                  <p className={styles.eyebrow}>{step?.skill}</p>
                  <h3>{step?.title}</h3>
                  <p className={styles.historyMeta}>
                    {activity.completed_at
                      ? `${activity.awarded_xp} XP earned · Completed`
                      : "Draft saved"}
                  </p>
                </div>
                <button type="button" className={styles.secondary}
                  onClick={() => onOpen(activity.step_id)}>
                  {activity.completed_at ? "View work" : "Continue"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
