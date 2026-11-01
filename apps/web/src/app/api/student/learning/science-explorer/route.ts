import { checkOrigin, forwardLearning, reply } from "./proxy";

export async function GET() {
  return forwardLearning("GET");
}

export async function POST(request: Request) {
  if (!checkOrigin(request)) {
    return reply({ message: "This request is not allowed." }, 403);
  }
  return forwardLearning("POST", "/start");
}
