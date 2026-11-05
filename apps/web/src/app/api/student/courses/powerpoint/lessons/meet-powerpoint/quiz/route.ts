import { checkOrigin, forwardCourses, reply } from "../../../../proxy";

export async function POST(request: Request) {
  if (!checkOrigin(request)) {
    return reply({ message: "This request is not allowed." }, 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return reply({ message: "Send your answers as JSON." }, 415);
  }

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return reply({ message: "Your answers could not be read." }, 400);
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return reply({ message: "Choose an answer for both questions." }, 422);
  }

  const body = value as Record<string, unknown>;
  if (Object.keys(body).length !== 1 ||
      !Array.isArray(body.answers) ||
      body.answers.length !== 2 ||
      !body.answers.every((answer: unknown) =>
        typeof answer === "number" && Number.isInteger(answer) &&
        answer >= 0 && answer <= 2)) {
    return reply({ message: "Choose an answer for both questions." }, 422);
  }

  if (body.answers[0] !== 0 || body.answers[1] !== 1) {
    return reply({
      message: "Not quite. Read the explanations and try again.",
    }, 422);
  }

  return forwardCourses(
    "POST",
    "/powerpoint/lessons/meet-powerpoint/quiz",
    { answers: body.answers },
  );
}
