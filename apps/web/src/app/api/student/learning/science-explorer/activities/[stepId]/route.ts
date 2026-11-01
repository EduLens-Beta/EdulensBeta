import { scienceExplorerRoadmap } from "@/features/skills/science-roadmap";
import {
  checkOrigin,
  forwardLearning,
  reply,
} from "../../proxy";

export async function PUT(
  request: Request,
  context: { params: Promise<{ stepId: string }> },
) {
  if (!checkOrigin(request)) {
    return reply({ message: "This request is not allowed." }, 403);
  }

  const { stepId } = await context.params;
  if (!scienceExplorerRoadmap.steps.some((step) => step.id === stepId)) {
    return reply({ message: "Activity not found." }, 404);
  }

  const contentType = request.headers.get("content-type")
    ?.split(";")[0].trim().toLowerCase();

  if (contentType !== "application/json") {
    return reply({ message: "Send your work as JSON." }, 415);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return reply({ message: "Your work could not be read." }, 400);
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload) ||
    !("work_text" in payload) ||
    typeof payload.work_text !== "string" ||
    !("complete" in payload) ||
    typeof payload.complete !== "boolean" ||
    Object.keys(payload).length !== 2 ||
    Array.from(payload.work_text).length > 10000 ||
    (payload.complete && Array.from(payload.work_text.trim()).length < 20)
  ) {
    return reply({ message: "Check your work before saving." }, 422);
  }

  return forwardLearning("PUT", `/activities/${encodeURIComponent(stepId)}`, {
    work_text: payload.work_text,
    complete: payload.complete,
  });
}
