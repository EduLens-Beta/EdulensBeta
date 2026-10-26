import Link from "next/link";
import { questions, recognition, studentStages } from "./content";
import JourneyPreview from "./journey-preview";
import StageIllustration from "./stage-illustration";
import styles from "./landing.module.css";

function Brand() {
  return (
    <Link href="/" className={styles.brand} aria-label="EduLens home">
      <span className={styles.brandMark} aria-hidden="true">e</span>
      EduLens<span className={styles.brandDot}>.</span>
    </Link>
  );
}

function Navigation() {
  return (
    <header className={styles.header}>
      <div className={`${styles.container} ${styles.nav}`}>
        <Brand />
        <nav className={styles.desktopNav} aria-label="Main navigation">
          <a href="#experience">How it works</a>
          <a href="#students">For students</a>
          <a href="#story">About EduLens</a>
        </nav>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.signIn}>Sign in</Link>
          <Link href="/signup" className={styles.smallButton}>
            Sign up <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <details className={styles.mobileMenu}>
          <summary>Menu</summary>
          <nav aria-label="Mobile navigation">
            <a href="#experience">How it works</a>
            <a href="#students">For students</a>
            <a href="#story">About EduLens</a>
            <Link href="/login">Sign in</Link>
            <Link href="/signup">Sign up</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className={`${styles.container} ${styles.hero}`}>
      <div className={styles.heroCopy}>
        <div className={styles.heroBadge}>
          <span aria-hidden="true" />
          Built around the student. Starting in Bangladesh.
        </div>
        <h1>
          Your dreams.<br />
          A clearer <em>direction.</em>
        </h1>
        <p className={styles.heroDescription}>
          Meet EduLens, your personal Student OS. A growing space for your goals,
          progress, and next steps—from Class 6 to university and everything ahead.
        </p>
        <div className={styles.buttonRow}>
          <a href="#experience" className={styles.primaryButton}>
            See how EduLens works <span aria-hidden="true">↗</span>
          </a>

        </div>
        <p className={styles.heroFootnote}>
          Early product build. A long-term vision for student growth.
        </p>
        <div className={styles.chapterLine} aria-label="School through university">
          <span>School</span><i aria-hidden="true" /><span>College</span>
          <i aria-hidden="true" /><span>University</span><i aria-hidden="true" />
          <span className={styles.chapterFuture}>Your next chapter</span>
        </div>
      </div>

      <div className={styles.heroVisual}>
        <div className={styles.orbitLabel} aria-hidden="true">
          Many possible futures.<br /><strong>One evolving you.</strong>
        </div>
        <JourneyPreview />
        <div className={styles.visualCaption}>
          <span>01 / THE CONNECTED JOURNEY</span>
          <span>Choose your class or stage above</span>
        </div>
      </div>
    </section>
  );
}

function Experience() {
  const steps = [
    ["01", "Understand your starting point", "Bring your interests, goals, skills, and experience into one living profile."],
    ["02", "See the next useful step", "Connect what you have with what your chosen direction needs."],
    ["03", "Let progress move you forward", "Turn meaningful actions into evidence that informs your next step."],
  ];

  return (
    <section id="experience" className={styles.experience}>
      <div className={styles.container}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>A STUDENT JOURNEY, CONNECTED</p>
          <h2>Information is everywhere.<br /><span>Direction changes everything.</span></h2>
          <p>
            Goals in your head. Advice in a chat. Achievements in a folder.
            EduLens is being built to bring the journey together.
          </p>
        </div>
        <div className={styles.stepsGrid}>
          {steps.map(([number, title, description]) => (
            <article key={number} className={styles.step}>
              <span className={styles.stepNumber}>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <div className={styles.connectionStatement}>
          <span aria-hidden="true">↳</span>
          <p>One meaningful update.<br /><strong>A more connected journey.</strong></p>
          <p className={styles.connectionDetail}>
            The product vision: your profile, readiness, priorities, and guidance
            evolve together as you make progress.
          </p>
        </div>
      </div>
    </section>
  );
}

function StudentChapters() {
  return (
    <section id="students" className={`${styles.container} ${styles.section}`}>
      <div className={styles.splitHeading}>
        <div>
          <p className={styles.eyebrow}>FOR EVERY CHAPTER OF YOU</p>
          <h2>You don&apos;t need your<br />whole future figured out.</h2>
        </div>
        <p>
          Start with where you are. EduLens is being designed for the changing
          questions students face from school through university.
        </p>
      </div>
      <div className={styles.chapterGrid}>
        {studentStages.map((stage, index) => (
          <article key={stage.label} className={styles.chapterCard}>
            <div className={styles.chapterCardTop}>
              <span>{stage.label}</span>
              <span aria-hidden="true">0{index + 1}</span>
            </div>
            <StageIllustration index={index} />
            <h3>{stage.chapter}</h3>
            <p>{stage.description}</p>
            <ul className={styles.tags}>
              {stage.tags.map((tag) => <li key={tag}>{tag}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductVision() {
  return (
    <section className={styles.vision}>
      <div className={`${styles.container} ${styles.visionGrid}`}>
        <div>
          <p className={styles.eyebrow}>THE BIGGER PICTURE</p>
          <h2>One growing profile.<br /><em>Many possible futures.</em></h2>
          <p>
            Your journey can change direction without starting from zero.
            The ambition is to connect what you learn, build, and achieve with
            the opportunities and people that can help you move forward.
          </p>
          <a href="#story" className={styles.lightLink}>
            Read our story <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className={styles.pathMap} aria-label="A living profile connects different future pathways">
          <div className={styles.profileCore}>
            <span aria-hidden="true">◎</span>
            <strong>Your living profile</strong>
            <small>Interests · Goals · Experience · Progress</small>
          </div>
          <div className={styles.pathList}>
            {["Academics & skills", "University pathways", "Scholarships", "Internships & careers", "Research & entrepreneurship"].map((path) => (
              <div key={path}><span aria-hidden="true">↗</span>{path}</div>
            ))}
          </div>
          <p>Product vision · Capabilities will be introduced in stages</p>
        </div>
      </div>
    </section>
  );
}

function Story() {
  return (
    <section id="story" className={`${styles.container} ${styles.section}`}>
      <div className={styles.splitHeading}>
        <div>
          <p className={styles.eyebrow}>BUILT FROM THE STUDENT JOURNEY</p>
          <h2>A personal question.<br />A bigger possibility.</h2>
        </div>
        <div className={styles.storyCopy}>
          <p>
            EduLens grew from a student&apos;s experience of navigating education,
            opportunities, and scattered advice. An initial study-abroad product
            helped shape a broader question: what if the whole journey stayed connected?
          </p>
          <p>
            Founded by Tawsif Elahy, EduLens is building toward that answer,
            starting with students in Bangladesh.
          </p>
          <a href="mailto:tawsifelahy@edulens.app" className={styles.textLink}>
            Email the founder <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
      <div className={styles.recognitionHeading}>RECOGNITION & SUPPORT</div>
      <div className={styles.recognitionGrid}>
        {recognition.map((item) => (
          <article key={item.label} className={styles.recognitionCard}>
            <p>{item.label}</p>
            <h3>{item.title}</h3>
            <span>{item.detail}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function Questions() {
  return (
    <section className={`${styles.container} ${styles.faqSection}`}>
      <div>
        <p className={styles.eyebrow}>A LITTLE MORE CLARITY</p>
        <h2>Good questions.<br />Honest answers.</h2>
      </div>
      <div className={styles.faqList}>
        {questions.map((item) => (
          <details key={item.question}>
            <summary>{item.question}<span aria-hidden="true">+</span></summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Closing() {
  return (
    <>
      <section className={`${styles.container} ${styles.closing}`}>
        <p className={styles.eyebrow}>YOUR DREAMS DESERVE A CLEAR VISION</p>
        <h2>The future is a journey.<br /><em>Let&apos;s give it direction.</em></h2>
        <div className={styles.buttonRow}>
          <Link href="/signup" className={styles.primaryButton}>
            Sign up <span aria-hidden="true">↗</span>
          </Link>
          <a href="mailto:tawsifelahy@edulens.app" className={styles.textLink}>
            Contact us <span aria-hidden="true">→</span>
          </a>
        </div>
        <p className={styles.heroFootnote}>
          Account access is available. The Student OS experience is in development.
        </p>
      </section>
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <div><Brand /><p>The intelligence behind the student journey.</p></div>
          <div className={styles.footerLinks}>
            <Link href="/login">Sign in</Link>
            <a href="mailto:tawsifelahy@edulens.app">Contact</a>
            <a href="#story">About EduLens</a>
          </div>
          <span>Built for Bangladesh. Looking ahead.</span>
        </div>
      </footer>
    </>
  );
}

export default function LandingPage() {
  return (
    <div className={styles.landing}>
      <a href="#main-content" className={styles.skipLink}>Skip to content</a>
      <Navigation />
      <main id="main-content">
        <Hero />
        <Experience />
        <StudentChapters />
        <ProductVision />
        <Story />
        <Questions />
        <Closing />
      </main>
    </div>
  );
}
