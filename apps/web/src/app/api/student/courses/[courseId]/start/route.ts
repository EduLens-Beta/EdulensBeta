import { isCourseId } from "@/features/skills/course-data";
import { checkOrigin, forwardCourses, reply } from "../../proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string }> },
) {
  if (!checkOrigin(request)) {
    return reply({ message: "This request is not allowed." }, 403);
  }
  const { courseId } = await context.params;
  if (!isCourseId(courseId)) {
    return reply({ message: "Course not found." }, 404);
  }
  return forwardCourses("POST", `/${courseId}/start`);
}
