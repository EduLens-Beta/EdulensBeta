import { isCourseLesson } from "@/features/skills/course-data";
import { checkOrigin, forwardCourses, reply } from "../../../proxy";

export async function PUT(
  request: Request,
  context: { params: Promise<{ courseId: string; lessonId: string }> },
) {
  if (!checkOrigin(request)) {
    return reply({ message: "This request is not allowed." }, 403);
  }

  const { courseId, lessonId } = await context.params;
  if (!isCourseLesson(courseId, lessonId)) {
    return reply({ message: "Lesson not found." }, 404);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return reply({ message: "Send your work as JSON." }, 415);
  }

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return reply({ message: "Your work could not be read." }, 400);
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return reply({ message: "Check your work and try again." }, 422);
  }
  const body = value as Record<string, unknown>;
  if (typeof body.work_text !== "string" ||
      typeof body.complete !== "boolean" ||
      Array.from(body.work_text).length > 10000 ||
      Object.keys(body).some((key) => !["work_text", "complete"].includes(key))) {
    return reply({ message: "Check your work and try again." }, 422);
  }

  return forwardCourses("PUT", `/${courseId}/lessons/${lessonId}`, {
    work_text: body.work_text,
    complete: body.complete,
  });
}
