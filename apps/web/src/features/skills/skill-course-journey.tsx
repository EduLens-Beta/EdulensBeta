"use client";

import { useState } from "react";
import styles from "./skill-course-journey.module.css";

const courses = [
  {
    id: "computer-basics",
    title: "Computer basics",
    description: "Get comfortable with everyday digital tools.",
    lessons: [
      "Files and folders",
      "Typing and useful shortcuts",
      "Email and attachments",
      "Passwords and online safety",
    ],
  },
  {
    id: "documents",
    title: "Documents",
    description: "Create clear documents in Word or Google Docs.",
    lessons: [
      "Create and save a document",
      "Headings and text formatting",
      "Images and tables",
      "Create your first PDF",
    ],
  },
  {
    id: "powerpoint",
    title: "PowerPoint",
    description: "Share an idea through a short presentation.",
    lessons: [
      "Create your first slides",
      "Choose a clear layout",
      "Add images and charts",
      "Present your idea",
    ],
  },
  {
    id: "excel",
    title: "Excel",
    description: "Organise information and make simple calculations.",
    lessons: [
      "Cells, rows and columns",
      "Enter and format information",
      "SUM and AVERAGE",
      "Sort and filter",
      "Create a simple chart",
      "Make a small expense tracker",
    ],
  },
  {
    id: "python",
    title: "Python",
    description: "Write your first small programs.",
    lessons: [
      "Print a message",
      "Variables and numbers",
      "Ask for input",
      "Make decisions with conditions",
      "Repeat with loops",
      "Build a simple quiz",
    ],
  },
] as const;

function CurvedPath({
  items,
  onSelect,
}: {
  items: readonly { title: string; description?: string }[];
  onSelect: (index: number) => void;
}) {
  const height = items.length * 180;
  let path = "M 36 90";

  for (let index = 1; index < items.length; index += 1) {
    const previousX = index % 2 === 1 ? 36 : 56;
    const nextX = index % 2 === 1 ? 56 : 36;
    const previousY = (index - 1) * 180 + 90;
    const nextY = index * 180 + 90;
    path += ` C ${previousX} ${previousY + 90}, ${nextX} ${nextY - 90}, ${nextX} ${nextY}`;
  }

  return (
    <div className={styles.path}>
      <svg
        className={styles.line}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={path} className={styles.roadEdge} />
        <path d={path} className={styles.roadSurface} />
        <path d={path} className={styles.roadMarks} />
      </svg>

      <ol className={styles.steps}>
        {items.map((item, index) => (
          <li key={item.title} className={styles.step}>
            <button
              type="button"
              className={styles.stepButton}
              aria-current={index === 0 ? "step" : undefined}
              disabled={index > 0}
              onClick={() => onSelect(index)}
              aria-label={`Explore ${item.title}`}
            >
              <span className={styles.node} aria-hidden="true">
                <span className={styles.pinNumber}>{index + 1}</span>
              </span>
              <span className={styles.copy}>
                {index === 0 && (
                  <span className={styles.currentLabel}>YOU ARE HERE</span>
                )}
                <strong>{item.title}</strong>

                {index === 0 && <span className={styles.action}>Start learning →</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function SkillCourseJourney() {
  const [courseIndex, setCourseIndex] = useState<number | null>(null);
  const [lessonIndex, setLessonIndex] = useState<number | null>(null);
  const course = courseIndex === null ? null : courses[courseIndex];

  function openCourse(index: number) {
    setCourseIndex(index);
    setLessonIndex(null);
  }

  return (
    <div className={styles.journey}>
      {course ? (
        <>
          <button
            type="button"
            className={styles.back}
            onClick={() => {
              setCourseIndex(null);
              setLessonIndex(null);
            }}
          >
            ← All skills
          </button>
          <h3 className={styles.heading}>{course.title}</h3>
          <p className={styles.description}>{course.description}</p>
          <CurvedPath
            items={course.lessons.map((title) => ({ title }))}
            onSelect={setLessonIndex}
          />
          {lessonIndex !== null && (
            <section className={styles.lesson} aria-live="polite">
              <p className={styles.label}>LESSON {lessonIndex + 1}</p>
              <h4>{course.lessons[lessonIndex]}</h4>
              <p>This lesson is being prepared.</p>
              <button
                type="button"
                className={styles.back}
                onClick={() => setLessonIndex(null)}
              >
                Close
              </button>
            </section>
          )}
        </>
      ) : (
        <>
          <p className={styles.description}>
            Start with the basics. Build one skill at a time.
          </p>
          <CurvedPath items={courses} onSelect={openCourse} />
        </>
      )}
    </div>
  );
}
