import type { Metadata } from "next";
import StudentExperience from "@/features/student/student-experience";

export const metadata: Metadata = {
  title: "Your space | EduLens",
  description: "Your student space on EduLens.",
};

export default function StudentPage() {
  return <StudentExperience screen="home" />;
}
