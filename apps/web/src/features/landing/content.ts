export const studentStages = [
  {
    label: "Class 6–8",
    chapter: "Discover what sparks your curiosity.",
    description:
      "Make room for interests, small projects, and new experiences. Your journey can begin before you have a career plan.",
    goal: "Explore my interest in science",
    task: "Build a small science project",
    evidence: "Project notes and observations",
    next: "Reflect on what you enjoyed learning",
    tags: ["Interests", "Learning habits", "Activities"],
  },
  {
    label: "Class 9–10",
    chapter: "Turn interests into a direction.",
    description:
      "Connect your academic choices, activities, and developing skills. Explore possibilities while keeping your options open.",
    goal: "Explore technology and problem-solving",
    task: "Complete a beginner coding project",
    evidence: "A working project and learning notes",
    next: "Choose one skill to practise next",
    tags: ["Academic choices", "Skills", "Competitions"],
  },
  {
    label: "College / HSC",
    chapter: "Prepare for your next chapter.",
    description:
      "Explore university pathways and connect your preparation with the choices ahead. Build a clearer picture of what to work on.",
    goal: "Explore university pathways",
    task: "Compare two subjects that interest me",
    evidence: "Subject comparison and preferences",
    next: "Identify preparation needs for each path",
    tags: ["University pathways", "Preparation", "Direction"],
  },
  {
    label: "University",
    chapter: "Build the evidence behind your ambition.",
    description:
      "Bring projects, experience, and goals together as you prepare for internships, research, scholarships, and your first career steps.",
    goal: "Prepare for a data internship",
    task: "Complete a small data analysis project",
    evidence: "Project report and portfolio link",
    next: "Explain the project in your portfolio",
    tags: ["Internships", "Research", "Scholarships"],
  },
] as const;

export const recognition = [
  {
    label: "University Innovation Hub Program",
    title: "BDT 100K",
    detail: "Non-dilutive funding · UIHP, NSU IC-1",
  },
  {
    label: "Innovation World Cup 2026",
    title: "Silver Medal",
    detail: "Bangladesh National Round · Entrepreneurship",
  },
  {
    label: "LvlUp Ventures × Zendesk",
    title: "Cohort 2",
    detail: "CX Innovation Challenge · International program",
  },
] as const;

export const questions = [
  {
    question: "Who is EduLens being built for?",
    answer:
      "EduLens is being built for Bangladeshi students from Class 6 through university. The vision is to support different stages of the student journey, with international expansion planned for the future.",
  },
  {
    question: "What can I use today?",
    answer:
      "This early build supports account creation and sign-in. The connected profile, readiness, task, and guidance experience shown here is the product direction we are developing. Interactive examples on this page are illustrative previews.",
  },
  {
    question: "Is EduLens only for studying abroad?",
    answer:
      "The product began with a study-abroad focus and evolved toward a broader Student OS. Its direction includes academics, skills, projects, university pathways, internships, research, scholarships, and careers.",
  },
  {
    question: "Does readiness mean a guaranteed outcome?",
    answer:
      "No. Readiness is intended to explain your current evidence, relevant requirements, and possible next steps. It is not a ranking of your worth or a guarantee of admission, a scholarship, or employment.",
  },
] as const;
