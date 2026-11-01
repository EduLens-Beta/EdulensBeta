export const scienceExplorerRoadmap = {
  id: "science-explorer",
  version: 1,
  title: "Discover your skills through science",
  description:
    "Explore an interest, investigate a small question, and share what you learn.",
  steps: [
    {
      id: "notice-your-interests",
      title: "Find something that sparks your curiosity",
      skill: "Self-reflection",
      activity:
        "Choose something you enjoy: nature, technology, building things, helping people, or another interest. Write what makes you curious about it.",
      outcome: "A short note about an interest you want to explore.",
    },
    {
      id: "ask-and-investigate",
      title: "Turn your curiosity into a question",
      skill: "Research and critical thinking",
      activity:
        "Write one small question about your interest. Look for two reliable sources and note what they explain, where they agree, and anything you are still unsure about.",
      outcome: "Your question, source links, and a few notes in your own words.",
    },
    {
      id: "make-something",
      title: "Make your first small project",
      skill: "Problem-solving and digital creativity",
      activity:
        "Use your findings to make a simple diagram, a short slide presentation, or a small spreadsheet. Choose a format you can try with the tools available to you.",
      outcome: "One small piece of work that shows what you learned.",
    },
    {
      id: "share-and-reflect",
      title: "Explain it and discover your next interest",
      skill: "Communication and reflection",
      activity:
        "Explain your project to someone you trust. Reflect on what you enjoyed, what was difficult, and whether you would like to explore this further.",
      outcome: "A short reflection and an idea for what to try next.",
    },
  ],
} as const;
