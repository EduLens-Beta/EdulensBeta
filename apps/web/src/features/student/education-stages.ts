export const educationStages = [
  {
    value: "class_6_8",
    label: "Class 6–8",
    description: "Explore your interests and build good learning habits.",
  },
  {
    value: "class_9_10",
    label: "Class 9–10",
    description: "Explore subjects, practise skills, and prepare for what's next.",
  },
  {
    value: "college",
    label: "College / HSC",
    description: "Explore university paths and plan your preparation.",
  },
  {
    value: "university",
    label: "University",
    description: "Build skills, work on projects, and explore career paths.",
  },
] as const;

export type EducationStage = (typeof educationStages)[number]["value"];

export function isEducationStage(value: unknown): value is EducationStage {
  return educationStages.some((stage) => stage.value === value);
}
