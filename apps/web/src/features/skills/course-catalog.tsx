"use client";

import { useState } from "react";
import styles from "./courses.module.css";

const courses = [
  {
    id: "computer-basics",
    topic: "Computer basics",
    title: "Computer essentials",
    description: "Get comfortable with files, folders, email, and online safety.",
    lessons: ["Files and folders", "Typing and shortcuts", "Email basics", "Online safety"],
  },
  {
    id: "documents",
    topic: "Documents",
    title: "Create your first document",
    description: "Write, format, and share a clear document using Word or Google Docs.",
    lessons: ["Create a document", "Format text", "Add images and tables", "Export a PDF"],
  },
  {
    id: "powerpoint",
    topic: "PowerPoint",
    title: "Presentation basics",
    description: "Turn an idea into simple, clear slides and present it confidently.",
    lessons: ["Your first slides", "Layouts and images", "Charts and transitions", "Present a short idea"],
  },
  {
    id: "excel",
    topic: "Excel",
    title: "Excel for beginners",
    description: "Organise information, use simple formulas, and create your first chart.",
    lessons: ["Cells and worksheets", "Enter and format data", "SUM and AVERAGE", "Sort and filter", "Create charts", "Small project"],
  },
  {
    id: "python",
    topic: "Python",
    title: "Your first Python program",
    description: "Learn programming step by step through small, beginner-friendly exercises.",
    lessons: ["Print and input", "Variables and numbers", "Conditions", "Loops", "Simple functions", "Small project"],
  },
  {
    id: "java",
    topic: "Java",
    title: "Introduction to Java",
    description: "An optional next step for students who already understand programming basics.",
    lessons: ["Your first program", "Variables and input", "Conditions", "Loops", "Methods", "Console project"],
  },
];

const topics = ["All", ...courses.map((course) => course.topic)];

export default function CourseCatalog() {
  const [topic, setTopic] = useState("All");
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const visible = courses.filter((course) =>
    (topic === "All" || course.topic === topic) &&
    `${course.title} ${course.topic} ${course.description}`
      .toLowerCase().includes(query),
  );

  return (
    <section aria-labelledby="courses-title">
      <div className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>LEARN BY DOING</p>
          <h1 id="courses-title">Small lessons. Useful skills.</h1>
          <p>Beginner courses for Class 9–10. Choose something you want to learn.</p>
        </div>
        <span className={styles.heroMark} aria-hidden="true">↗</span>
      </div>

      <div className={styles.filters} aria-label="Course topics">
        {topics.map((item) => (
          <button key={item} type="button"
            aria-pressed={topic === item}
            onClick={() => setTopic(item)}>
            {item}
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <p role="status" aria-live="polite">
          {visible.length} {visible.length === 1 ? "course" : "courses"}
        </p>
        <div>
          <label htmlFor="course-search" className={styles.srOnly}>
            Search courses
          </label>
          <input id="course-search" type="search"
            placeholder="Search courses…"
            value={search}
            onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      <p className={styles.previewNote}>
        Course outlines · Lessons and course roadmaps are being prepared.
      </p>

      <div className={styles.grid}>
        {visible.map((course) => (
          <article key={course.id} className={styles.card}>
            <div className={styles.cardTop}>
              <span>{course.topic}</span>
              <span className={styles.level}>
                {course.id === "java" ? "Optional next step" : "Beginner"}
              </span>
            </div>
            <h2>{course.title}</h2>
            <p>{course.description}</p>
            <details className={styles.outline}>
              <summary>See course topics <span aria-hidden="true">↓</span></summary>
              <ol>
                {course.lessons.map((lesson) => <li key={lesson}>{lesson}</li>)}
              </ol>
            </details>
          </article>
        ))}
      </div>

      {visible.length === 0 && (
        <div className={styles.empty}>
          <h2>No courses found.</h2>
          <p>Try another topic or search term.</p>
          <button type="button" onClick={() => {
            setSearch("");
            setTopic("All");
          }}>
            Show all courses
          </button>
        </div>
      )}
    </section>
  );
}
