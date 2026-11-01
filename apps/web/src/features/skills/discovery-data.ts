import type { JourneyProgress } from "./journey-data";

export const discoverySteps = [
  "discover-interests",
  "ask-a-question",
  "work-with-information",
  "build-a-project",
  "explain-my-work",
  "choose-next-direction",
] as const;

export const interestOptions = [
  { id: "nature", label: "Nature and the environment" },
  { id: "technology", label: "Technology and coding" },
  { id: "health", label: "Health and helping people" },
  { id: "building", label: "Building and designing things" },
  { id: "communication", label: "Explaining ideas and storytelling" },
  { id: "data", label: "Numbers, patterns, and data" },
] as const;

export type InterestId = (typeof interestOptions)[number]["id"];
export type ExplorationId =
  | "notice-and-question"
  | "explain-an-idea"
  | "design-a-solution";

export type DiscoveryDetails = {
  interests: InterestId[];
  unsure: boolean;
  activity_id: ExplorationId | null;
  work_text: string;
  reflection: string;
};

export type DiscoverySubmission = DiscoveryDetails & { complete: boolean };

export type DiscoveryState = {
  journey: JourneyProgress;
  discovery: DiscoveryDetails;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isInterest(value: unknown): value is InterestId {
  return interestOptions.some((item) => item.id === value);
}

function isExploration(value: unknown): value is ExplorationId {
  return value === "notice-and-question" ||
    value === "explain-an-idea" || value === "design-a-solution";
}

export function readDiscoveryDetails(value: unknown): DiscoveryDetails | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.interests) ||
    !value.interests.every(isInterest) ||
    value.interests.length > 3 ||
    new Set(value.interests).size !== value.interests.length ||
    typeof value.unsure !== "boolean" ||
    (value.unsure && value.interests.length > 0) ||
    !(value.activity_id === null || isExploration(value.activity_id)) ||
    typeof value.work_text !== "string" ||
    Array.from(value.work_text).length > 10000 ||
    typeof value.reflection !== "string" ||
    Array.from(value.reflection).length > 2000
  ) return null;

  return {
    interests: value.interests,
    unsure: value.unsure,
    activity_id: value.activity_id,
    work_text: value.work_text,
    reflection: value.reflection,
  };
}

export function readDiscovery(value: unknown): DiscoveryState | null {
  if (!isRecord(value) || !isRecord(value.journey)) return null;
  const details = readDiscoveryDetails(value.discovery);
  const journey = value.journey;

  if (
    !details ||
    journey.roadmap_id !== "science-explorer" ||
    journey.roadmap_version !== 2 ||
    !(journey.started_at === null || isDate(journey.started_at)) ||
    !Array.isArray(journey.activities) ||
    journey.activities.length !== discoverySteps.length
  ) return null;

  const activities: JourneyProgress["activities"] = [];
  let incomplete = false;

  for (const [index, stepId] of discoverySteps.entries()) {
    const item: unknown = journey.activities[index];
    if (
      !isRecord(item) ||
      item.step_id !== stepId ||
      typeof item.work_text !== "string" ||
      !(item.completed_at === null || isDate(item.completed_at))
    ) return null;

    const complete = item.completed_at !== null;
    if (
      item.awarded_xp !== (complete ? 25 : 0) ||
      (complete && (incomplete || !item.work_text.trim()))
    ) return null;
    if (!complete) incomplete = true;

    activities.push({
      step_id: stepId,
      work_text: item.work_text,
      completed_at: item.completed_at,
      awarded_xp: complete ? 25 : 0,
    });
  }

  const completed = activities.filter((item) => item.completed_at !== null).length;
  const xp = activities.reduce((sum, item) => sum + item.awarded_xp, 0);
  const percent = Math.floor(completed * 100 / activities.length);
  const next = activities.find((item) => item.completed_at === null)?.step_id ?? null;

  if (
    journey.completed_count !== completed ||
    journey.total_activities !== activities.length ||
    journey.total_xp !== xp ||
    journey.progress_percent !== percent ||
    journey.next_step_id !== next ||
    details.work_text !== activities[0].work_text ||
    (journey.started_at === null &&
      (activities.some((item) => item.work_text || item.completed_at) ||
        details.interests.length > 0 || details.unsure ||
        details.activity_id !== null || details.reflection !== "")) ||
    (activities[0].completed_at !== null &&
      ((!details.interests.length && !details.unsure) ||
        details.activity_id === null ||
        Array.from(details.work_text.trim()).length < 20 ||
        Array.from(details.reflection.trim()).length < 20))
  ) return null;

  return {
    journey: {
      roadmap_id: "science-explorer",
      roadmap_version: 2,
      started_at: journey.started_at,
      activities,
      completed_count: completed,
      total_activities: activities.length,
      total_xp: xp,
      progress_percent: percent,
      next_step_id: next,
    },
    discovery: details,
  };
}
