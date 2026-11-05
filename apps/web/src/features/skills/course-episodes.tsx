"use client";

import { useState } from "react";
import type { CourseProgress } from "./course-data";
import { useCourses } from "./course-provider";
import CourseClassroom from "./course-classroom";
import styles from "./course-episodes.module.css";

const descriptions: Record<string, string> = {
  "meet-powerpoint": "Find out what PowerPoint does and explore its main tools.",
  "first-slides": "Start a blank presentation and add a title and subtitle.",
  "text-basics": "Change text size, colour and alignment.",
  "pictures-and-shapes": "Use pictures and shapes to explain your idea.",
  "arrange-slides": "Add slides and put them in the right order.",
  "save-and-open": "Save your presentation and open it again.",
  "present-project": "Show your slides and practise explaining your project.",
};

export default function CourseEpisodes({
  course,
  onBack,
}: {
  course: CourseProgress;
  onBack: () => void;
}) {
  const { startCourse, pending, loading } = useCourses();
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const blocked = pending || loading;

  async function openLesson(lessonId: string) {
    const lesson = course.lessons.find((item) => item.id === lessonId);
    if (!lesson || lesson.status === "locked" || blocked) return;
    if (!course.started_at) {
      const started = await startCourse(course.id);
      if (!started) return;
    }
    setActiveLesson(lessonId);
  }

  if (activeLesson) {
    return (
      <CourseClassroom
        key={`${course.id}/${activeLesson}`}
        course={course}
        initialLessonId={activeLesson}
        onBack={() => setActiveLesson(null)}
      />
    );
  }

  const nextLessonId = course.next_lesson_id ?? course.lessons[0]?.id;

  return (
    <section className={styles.episodes} aria-labelledby="episodes-title">
      <button type="button" className={styles.back} onClick={onBack}>
        ← My journey
      </button>

      <header className={styles.courseHeader}>
        <div>
          <p className={styles.eyebrow}>YOUR COURSE</p>
          <h3>{course.title}</h3>
          <p>Learn one step at a time. Practise, then check what you know.</p>
        </div>
        <span className={styles.progress}>
          {course.completed_lessons} of {course.total_lessons} completed
        </span>
      </header>

      <div className={styles.listHeader}>
        <h4 id="episodes-title">Episodes</h4>
        <button
          type="button"
          className={styles.start}
          disabled={blocked || !nextLessonId}
          onClick={() => nextLessonId && void openLesson(nextLessonId)}
        >
          {pending ? "Opening…" : course.status === "completed"
            ? "Review" : course.started_at ? "Continue" : "Start"}
        </button>
      </div>

      <ol className={styles.list}>
        {course.lessons.map((lesson, index) => (
          <li key={lesson.id}>
            <button
              type="button"
              className={styles.episode}
              disabled={lesson.status === "locked" || blocked}
              aria-label={`${lesson.title}, ${
                lesson.status === "completed" ? "completed, review" :
                lesson.status === "locked" ? "locked" : "start lesson"
              }`}
              onClick={() => void openLesson(lesson.id)}
            >
              <span className={styles.number}>{index + 1}</span>

              <span className={styles.thumbnail} aria-hidden="true">
                <span className={styles.thumbnailCourse}>{course.title}</span>
                <span className={styles.thumbnailTitle}>{lesson.title}</span>
                <svg viewBox="0 0 100 75" fill="none">
                  <rect x="8" y="8" width="84" height="50" rx="4" stroke="currentColor" strokeWidth="3" />
                  <path d="M50 58v12M30 70h40M25 24h50M25 34h32M25 44h43" stroke="currentColor" strokeWidth="3" />
                </svg>
              </span>

              <span className={styles.copy}>
                <strong>{lesson.title}</strong>
                <span>
                  {descriptions[lesson.id] ?? "Learn the idea, try an activity and take a short quiz."}
                </span>
              </span>

              <span className={styles.state} data-state={lesson.status}>
                {lesson.status === "completed" ? "✓ Completed" :
                  lesson.status === "locked" ? (
                    <svg width="18" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  ) : "Start →"}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
