import { checkOrigin, forwardCourses, reply } from "../../../../proxy";

export async function POST(request: Request) {
  if (!checkOrigin(request)) {
    return reply({ message: "This request is not allowed." }, 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return reply({ message: "Send your answers as JSON." }, 415);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({ message: "Your answers could not be read." }, 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body) ||
      !("answers" in body) || Object.keys(body).length !== 1 ||
      !Array.isArray(body.answers) || body.answers.length !== 2 ||
      !body.answers.every((answer: unknown) =>
        typeof answer === "number" && Number.isInteger(answer) &&
        answer >= 0 && answer <= 2)) {
    return reply({ message: "Choose an answer for both questions." }, 422);
  }
  return forwardCourses("POST", "/powerpoint/lessons/first-slides/quiz", {
    answers: body.answers,
  });
}
