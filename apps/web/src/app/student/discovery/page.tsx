import type { Metadata } from "next";
import DiscoveryWorkspace from "@/features/skills/discovery-workspace";

export const metadata: Metadata = {
  title: "Discover your interests | EduLens",
};

export default function DiscoveryPage() {
  return <DiscoveryWorkspace />;
}
