import styles from "./landing.module.css";

const illustrations = [
  <>
    <path d="M16 22c8-5 17-5 24 0v37c-7-5-16-5-24 0V22Z" />
    <path d="M40 22c7-5 16-5 24 0v37c-8-5-17-5-24 0" />
    <path d="M23 30h9m-9 9h9m16-9h9m-9 9h9" />
    <path d="m61 9 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
  </>,
  <>
    <circle cx="40" cy="37" r="23" />
    <path d="m49 28-5 13-13 5 5-13 13-5Z" />
    <path d="M40 8v6m0 46v6M11 37h6m46 0h6" />
    <circle cx="40" cy="37" r="2" />
  </>,
  <>
    <path d="m10 29 30-14 30 14-30 14-30-14Z" />
    <path d="M23 36v16c10 8 24 8 34 0V36M67 31v23" />
    <path d="m58 60 4 4 9-10" />
    <path d="M27 66h23" />
  </>,
  <>
    <path d="M21 32h38v31H21V32Z" />
    <path d="M30 32v-9h20v9M21 43h38M35 43v8h10v-8" />
    <path d="m54 16 10-5m0 0-2 9m2-9-9-2" />
    <path d="M13 59h8" />
  </>,
];

export default function StageIllustration({ index }: { index: number }) {
  return (
    <div className={styles.chapterArtwork} aria-hidden="true">
      <svg
        viewBox="0 0 80 80"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {illustrations[index]}
      </svg>
      <span>{["Explore", "Discover", "Prepare", "Build"][index]}</span>
    </div>
  );
}
