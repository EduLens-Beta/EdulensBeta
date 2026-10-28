import type { Metadata } from "next";
import StudentExperience from "@/features/student/student-experience";

export const metadata: Metadata = {
  title: "Welcome to EduLens",
  description: "Choose your education stage to get started.",
};

export default function WelcomePage() {
  return <StudentExperience screen="welcome" />;
}
