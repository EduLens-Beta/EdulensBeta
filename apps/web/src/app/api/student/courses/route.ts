import { forwardCourses } from "./proxy";

export async function GET() {
  return forwardCourses("GET");
}
