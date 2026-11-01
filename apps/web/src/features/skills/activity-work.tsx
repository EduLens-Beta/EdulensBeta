"use client";

import { useEffect, useState } from "react";

import { useLearning } from "./learning-provider";
import styles from "./journey.module.css";

export default function ActivityWork({ stepId }: { stepId: string }) {
  const { journey, pending, start, save } = useLearning();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const activity = journey?.activities.find((item) => item.step_id === stepId);
  const work = drafts[stepId] ?? activity?.work_text ?? "";
  const completed = activity?.completed_at != null;
  const dirty = journey !== null && Object.entries(drafts).some(
    ([id, text]) => text !== journey.activities.find(
      (item) => item.step_id === id,
    )?.work_text,
  );

  useEffect(() => {
    if (!dirty) return;

    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    function beforeLink(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a");
      const href = link?.getAttribute("href");
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

  async function submit(complete: boolean) {
    setNotice("");
    if (await save(stepId, work, complete)) {
      setDrafts((previous) => {
        const updated = { ...previous };
        delete updated[stepId];
        return updated;
      });
      setNotice(complete ? "Activity completed. Your progress is saved." : "Draft saved.");
    }
  }

  if (!journey) {
    return <p className={styles.previewNote}>Load your progress to save work.</p>;
  }

  if (!journey.started_at) {
    return (
      <div className={styles.workArea}>
        <p>Ready to give it a try?</p>
        <button type="button" className={styles.saveButton}
          disabled={pending} onClick={() => {
            setNotice("");
            void start();
          }}>
          {pending ? "Starting…" : "Start this roadmap"}
        </button>
      </div>
    );
  }

  const canComplete = journey.next_step_id === stepId;

  return (
    <div className={styles.workArea}>
      <label htmlFor="activity-work">Your work</label>
      <textarea
        id="activity-work"
        value={work}
        readOnly={completed}
        disabled={pending}
        rows={7}
        onChange={(event) => {
          const value = event.target.value;
          if (Array.from(value).length <= 10000) {
            setDrafts((previous) => ({ ...previous, [stepId]: value }));
            setNotice("");
          }
        }}
        placeholder="Write what you tried, what you learned, or add a link to your project."
      />
      {completed ? (
        <p className={styles.savedMessage}>Completed · {activity?.awarded_xp} XP earned</p>
      ) : (
        <>
          <p className={styles.previewNote}>
            Add at least 20 characters to complete this activity.
            {!canComplete && " Complete the earlier milestones first."}
          </p>
          <div className={styles.workButtons}>
            <button type="button" disabled={pending}
              onClick={() => void submit(false)}>
              Save draft
            </button>
            <button type="button" className={styles.saveButton}
              disabled={pending || !canComplete || Array.from(work.trim()).length < 20}
              onClick={() => void submit(true)}>
              {pending ? "Saving…" : "Complete activity · 25 XP"}
            </button>
          </div>
        </>
      )}
      <p role="status" aria-live="polite" className={styles.savedMessage}>
        {notice}
      </p>
    </div>
  );
}
