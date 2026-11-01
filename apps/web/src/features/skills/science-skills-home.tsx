"use client";

import Link from "next/link";
import { useState } from "react";

import SkillCourseJourney from "./skill-course-journey";
import LearningProgress from "./learning-progress";
import { scienceExplorerRoadmap } from "./science-roadmap";
import { LearningProvider, useLearning } from "./learning-provider";
import styles from "./workspace.module.css";

const sections = [
  { id: "profile", label: "My profile", icon: "01" },
  { id: "journey", label: "My journey", icon: "02" },
  { id: "progress", label: "My progress", icon: "03" },
] as const;

type Section = (typeof sections)[number]["id"];

function ScienceSkillsWorkspace({
  name,
  schoolClass,
  onEditSchool,
}: {
  name: string;
  schoolClass: 9 | 10;
  onEditSchool: () => void;
}) {
  const [section, setSection] = useState<Section>("journey");
  const { setSelected } = useLearning();
  function openActivity(stepId: string) {
    const index = scienceExplorerRoadmap.steps.findIndex(
      (step) => step.id === stepId,
    );
    if (index < 0) return;
    setSelected(index);
    setSection("journey");
    requestAnimationFrame(() => {
      document.getElementById("science-roadmap")?.scrollIntoView({
        block: "start",
      });
    });
  }

  return (
    <div className={styles.workspace}>
      <aside className={styles.sidebar}>
        <p className={styles.sidebarTitle}>YOUR SPACE</p>
        <nav className={styles.navigation} aria-label="Student workspace">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={section === item.id}
              className={section === item.id ? styles.selected : ""}
              onClick={() => setSection(item.id)}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <Link href="/" className={styles.homeLink}>← Back to home</Link>
      </aside>

      <div className={styles.content}>
        <div className={styles.dashboardTop}>
          <div className={styles.studentIdentity}>
            <span className={styles.avatar} aria-hidden="true">
              {Array.from(name.trim())[0]?.toUpperCase() ?? "E"}
            </span>
            <div>
              <p className={styles.studentName}>Hey, {name}!</p>
              <p className={styles.studentContext}>Your learning space</p>
            </div>
          </div>

        </div>
        <section hidden={section !== "profile"} aria-labelledby="profile-title">
          <p className={styles.eyebrow}>MY PROFILE</p>
          <h2 id="profile-title" className={styles.title}>A little about you.</h2>
          <p className={styles.description}>
            Your interests and experiences will grow with your journey.
          </p>

          <dl className={styles.profile}>
            <div><dt>Name</dt><dd>{name}</dd></div>
            <div><dt>Class</dt><dd>Class {schoolClass}</dd></div>
            <div><dt>Study group</dt><dd>Science</dd></div>
          </dl>
          <div className={styles.profileActions}>
            <button type="button" className={styles.secondary}
              onClick={onEditSchool}>
              Change class or group
            </button>
            <Link href="/welcome" className={styles.secondary}>
              Change education stage
            </Link>
          </div>

          <div className={styles.empty}>
            <h3>There’s more to discover.</h3>
            <p>
              Interest selection and saved projects are coming next.
              Your class and study group are already saved.
            </p>
          </div>
        </section>

        <section hidden={section !== "journey"} aria-labelledby="journey-title">
          <p className={styles.eyebrow}>MY JOURNEY</p>
          <h2 id="journey-title" className={styles.title}>My learning journey</h2>
          <SkillCourseJourney />
        </section>

        <div hidden={section !== "progress"}>
          <LearningProgress onOpen={openActivity} />
        </div>
      </div>
    </div>
  );
}


export default function ScienceSkillsHome(props: {
  name: string;
  schoolClass: 9 | 10;
  onEditSchool: () => void;
}) {
  return (
    <LearningProvider>
      <ScienceSkillsWorkspace {...props} />
    </LearningProvider>
  );
}
