import { scienceExplorerRoadmap } from "./science-roadmap";

export type ActivityProgress = {
  step_id: string;
  work_text: string;
  completed_at: string | null;
  awarded_xp: number;
};

export type JourneyProgress = {
  roadmap_id: string;
  roadmap_version: number;
  started_at: string | null;
  activities: ActivityProgress[];
  completed_count: number;
  total_activities: number;
  total_xp: number;
  progress_percent: number;
  next_step_id: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function readJourney(value: unknown): JourneyProgress | null {
  const roadmap = scienceExplorerRoadmap;
  if (
    !isRecord(value) ||
    value.roadmap_id !== roadmap.id ||
    value.roadmap_version !== roadmap.version ||
    !(value.started_at === null || isDate(value.started_at)) ||
    !Array.isArray(value.activities) ||
    value.activities.length !== roadmap.steps.length
  ) {
    return null;
  }

  const activities: ActivityProgress[] = [];
  let foundIncomplete = false;

  for (const [index, step] of roadmap.steps.entries()) {
    const activity: unknown = value.activities[index];
    if (
      !isRecord(activity) ||
      activity.step_id !== step.id ||
      typeof activity.work_text !== "string" ||
      !(activity.completed_at === null || isDate(activity.completed_at))
    ) {
      return null;
    }

    const completed = activity.completed_at !== null;
    if (
      activity.awarded_xp !== (completed ? 25 : 0) ||
      (completed && (foundIncomplete || !activity.work_text.trim()))
    ) {
      return null;
    }
    if (!completed) foundIncomplete = true;

    activities.push({
      step_id: step.id,
      work_text: activity.work_text,
      completed_at: activity.completed_at,
      awarded_xp: completed ? 25 : 0,
    });
  }

  const completed = activities.filter((item) => item.completed_at !== null).length;
  const xp = activities.reduce((sum, item) => sum + item.awarded_xp, 0);
  const next = activities.find((item) => item.completed_at === null)?.step_id ?? null;
  const percent = Math.floor(completed * 100 / activities.length);

  if (
    value.completed_count !== completed ||
    value.total_activities !== activities.length ||
    value.total_xp !== xp ||
    value.progress_percent !== percent ||
    value.next_step_id !== next ||
    (value.started_at === null &&
      activities.some((item) => item.work_text !== "" || item.completed_at !== null))
  ) {
    return null;
  }

  return {
    roadmap_id: roadmap.id,
    roadmap_version: roadmap.version,
    started_at: value.started_at,
    activities,
    completed_count: completed,
    total_activities: activities.length,
    total_xp: xp,
    progress_percent: percent,
    next_step_id: next,
  };
}
