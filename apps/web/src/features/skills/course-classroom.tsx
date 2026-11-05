"use client";

import { useState } from "react";
import type { CourseProgress } from "./course-data";
import PowerPointIntroduction from "./powerpoint-introduction";
import PowerPointCreateEpisode from "./powerpoint-create-episode";
import styles from "./course-classroom.module.css";

export default function CourseClassroom({
  course,
  onBack,
  initialLessonId,
}: {
  course: CourseProgress;
  onBack: () => void;
  initialLessonId?: string;
}) {
  const [lessonId, setLessonId] = useState(
    initialLessonId ?? course.next_lesson_id ?? course.lessons[0].id,
  );
  const lesson = course.lessons.find((item) => item.id === lessonId);
  const position = course.lessons.findIndex((item) => item.id === lessonId);

  function nextEpisode() {
    const next = course.lessons[position + 1];
    if (next && next.status !== "locked") {
      setLessonId(next.id);
      window.scrollTo({ top: 0, behavior: "auto" });
    } else {
      onBack();
    }
  }

  return (
    <div className={styles.classroom}>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={onBack}>
          ← All episodes
        </button>
        <strong>{course.title}</strong>
      </header>

      <div className={styles.main}>
        {!lesson || lesson.status === "locked" ? (
          <p>Complete the earlier episode first.</p>
        ) : course.id === "powerpoint" && lesson.id === "meet-powerpoint" ? (
          <PowerPointIntroduction
            key={lesson.id}
            course={course}
            onContinue={nextEpisode}
          />
        ) : course.id === "powerpoint" && lesson.id === "first-slides" ? (
          <PowerPointCreateEpisode
            key={lesson.id}
            course={course}
            onContinue={nextEpisode}
          />
        ) : (
          <section>
            <p className={styles.eyebrow}>EPISODE {position + 1}</p>
            <h3 className={styles.title}>{lesson.title}</h3>
            <p>This episode’s screenshot lesson is being prepared.</p>
          </section>
        )}
      </div>
    </div>
  );
}
