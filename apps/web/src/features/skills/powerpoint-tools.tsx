"use client";

import { useState } from "react";
import styles from "./powerpoint-tools.module.css";

const tools = [
  {
    id: "slide",
    name: "Slide area",
    why: "This is the slide you are working on.",
    how: "Select a text box to write. Your audience will see what you put on this slide.",
    example: "My science project",
  },
  {
    id: "list",
    name: "Slide list",
    why: "See the slides in your presentation.",
    how: "Select a small slide on the left to open it. You can also change the order of your slides.",
    example: "1. My project   2. What I learned   3. Thank you",
  },
  {
    id: "home",
    name: "Home",
    why: "Use the tools you need most often.",
    how: "Add a new slide or change your text. For example, make a title bigger so everyone can read it.",
    example: "Small title → BIG TITLE",
  },
  {
    id: "insert",
    name: "Insert",
    why: "Add something to your slide.",
    how: "Add pictures, shapes or a text box. A useful picture can make your idea easier to understand.",
    example: "Add a picture of a growing plant.",
  },
  {
    id: "design",
    name: "Design",
    why: "Choose how your slides look.",
    how: "Pick a theme to give your slides matching colours and fonts. Keep the words easy to read.",
    example: "One theme gives your slides a matching style.",
  },
  {
    id: "show",
    name: "Slide Show",
    why: "Show your presentation to an audience.",
    how: "Start the slide show to display your slides. Move through them while explaining your idea.",
    example: "Edit your slides → Show your slides",
  },
];

export default function PowerPointTools({
  onContinue,
}: {
  onContinue?: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const [visited, setVisited] = useState<string[]>(["slide"]);
  const tool = tools[selected];

  return (
    <section className={styles.explorer} aria-labelledby="tools-heading">
      <p className={styles.eyebrow}>MEET THE TOOLS</p>
      <h5 id="tools-heading">What does each part do?</h5>
      <p className={styles.intro}>Choose a part below. See why it helps and how you use it.</p>

      <div className={styles.tools} aria-label="Explore PowerPoint tools">
        {tools.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected === index}
            onClick={() => {
              setSelected(index);
              setVisited((previous) =>
                previous.includes(item.id) ? previous : [...previous, item.id],
              );
            }}
          >
            {item.name}
            {visited.includes(item.id) && <span aria-label="Explored"> ✓</span>}
          </button>
        ))}
      </div>

      <div className={styles.explanation} aria-live="polite">
        <p className={styles.eyebrow}>{tool.name}</p>
        <h6>{tool.why}</h6>
        <p>{tool.how}</p>
        <div className={styles.example}>
          <span>FOR EXAMPLE</span>
          <strong>{tool.example}</strong>
        </div>
      </div>

      <p className={styles.note}>
        This is a simple guide. PowerPoint’s layout can look different on a phone, computer or in a browser.
      </p>
      <div className={styles.footer}>
        <span>{visited.length} of {tools.length} parts explored</span>
        {onContinue && (
          <button
            type="button"
            className={styles.primary}
            disabled={visited.length !== tools.length}
            onClick={onContinue}
          >
            Try the quick check →
          </button>
        )}
      </div>
    </section>
  );
}
