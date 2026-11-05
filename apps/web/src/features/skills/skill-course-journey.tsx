"use client";

import { useState } from "react";
import { useCourses } from "./course-provider";
import CourseEpisodes from "./course-episodes";
import type { CourseStatus } from "./course-data";
import styles from "./skill-course-journey.module.css";

type PathItem = {
  id: string;
  title: string;
  status: CourseStatus;
};

function CurvedPath({
  items,
  pending,
  onSelect,
}: {
  items: PathItem[];
  pending: boolean;
  onSelect: (id: string) => void;
}) {
  const height = items.length * 180;
  const segments = items.slice(1).map((item, index) => {
    const previousX = index % 2 === 0 ? 36 : 56;
    const nextX = index % 2 === 0 ? 56 : 36;
    const y = index * 180 + 90;
    return {
      id: item.id,
      d: `M ${previousX} ${y} C ${previousX} ${y + 90}, ${nextX} ${y + 90}, ${nextX} ${y + 180}`,
      reached: item.status !== "locked",
    };
  });

  return (
    <div className={styles.path}>
      <svg
        className={styles.line}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {segments.map((segment) => (
          <path
            key={segment.id}
            d={segment.d}
            className={styles.roadSurface}
            style={segment.reached ? { stroke: "#16a59a" } : undefined}
          />
        ))}
      </svg>
      <ol className={styles.steps}>
        {items.map((item, index) => (
          <li key={item.id} className={styles.step}>
            <button
              type="button"
              className={styles.stepButton}
              data-state={item.status}
              aria-current={item.status === "current" ? "step" : undefined}
              disabled={item.status === "locked" || pending}
              aria-label={`${item.title}, ${item.status}`}
              onClick={() => onSelect(item.id)}
            >
              <span className={styles.node} aria-hidden="true">
                <span className={styles.pinNumber}>{index + 1}</span>
              </span>
              <span className={styles.copy}>
                <strong>{item.title}</strong>
                {item.status === "current" && (
                  <>
                    <span className={styles.currentLabel}>YOU ARE HERE</span>
                    <span className={styles.action}>Continue →</span>
                  </>
                )}
                {item.status === "completed" && (
                  <span className={styles.completedLabel}>Completed · Review →</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function SkillCourseJourney({
  courseId,
  onCourseChange,
}: {
  courseId: string | null;
  onCourseChange: (id: string | null) => void;
}) {
  const { progress, pending, loading } = useCourses();
  if (!progress) return null;

  const course = progress.courses.find((item) => item.id === courseId);

  return course ? (
    <CourseEpisodes
      key={course.id}
      course={course}
      onBack={() => onCourseChange(null)}
    />
  ) : (
    <div className={styles.journey}>
      <CurvedPath
        items={progress.courses}
        pending={pending || loading}
        onSelect={onCourseChange}
      />
    </div>
  );
}

export function CourseProgressPanel({
  onOpen,
}: {
  onOpen: (courseId: string) => void;
}) {
  const { progress, pending, loading } = useCourses();
  const [filter, setFilter] = useState<"ongoing" | "completed">("ongoing");
  if (!progress) return null;

  const visible = progress.courses.filter((course) =>
    filter === "completed"
      ? course.status === "completed"
      : course.started_at !== null && course.status !== "completed",
  );

  return (
    <section className={styles.journey} aria-labelledby="course-progress-title">
      <h2 id="course-progress-title" className={styles.heading}>My progress</h2>
      <div className={styles.workActions}>
        <button
          type="button"
          className={styles.filterButton}
          aria-pressed={filter === "ongoing"}
          onClick={() => setFilter("ongoing")}
        >
          In progress
        </button>
        <button
          type="button"
          className={styles.filterButton}
          aria-pressed={filter === "completed"}
          onClick={() => setFilter("completed")}
        >
          Completed
        </button>
      </div>
      {visible.length === 0 && (
        <p className={styles.description}>
          {filter === "completed"
            ? "Your completed courses will appear here."
            : "Start your first course in My journey."}
        </p>
      )}
      {visible.map((course) => (
        <article key={course.id} className={styles.lesson}>
          <h3>{course.title}</h3>
          <p>{course.completed_lessons} of {course.total_lessons} lessons completed</p>
          <progress
            aria-label={`${course.title} progress`}
            value={course.completed_lessons}
            max={course.total_lessons}
          />
          <p>{course.progress_percent}% complete</p>
          <button
            type="button"
            className={styles.back}
            disabled={pending || loading}
            onClick={() => onOpen(course.id)}
          >
            {course.status === "completed" ? "Review course →" : "Continue course →"}
          </button>
        </article>
      ))}
    </section>
  );
}
