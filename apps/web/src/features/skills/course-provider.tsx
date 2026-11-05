"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  readSkillsProgress,
  type SkillsProgress,
} from "./course-data";

type CourseState = {
  progress: SkillsProgress | null;
  loading: boolean;
  pending: boolean;
  message: string;
  notice: string;
  signedOut: boolean;
  reload: () => Promise<void>;
  startCourse: (courseId: string) => Promise<boolean>;
  saveLesson: (
    courseId: string,
    lessonId: string,
    work: string,
    complete: boolean,
  ) => Promise<boolean>;
};

const CourseContext = createContext<CourseState | null>(null);
const endpoint = "/api/student/courses";

function responseMessage(value: unknown, fallback: string) {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }
  return fallback;
}

export function CourseProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<SkillsProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [signedOut, setSignedOut] = useState(false);

  const busy = useRef(false);
  const mounted = useRef(false);
  const generation = useRef(0);

  const reload = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const requestGeneration = ++generation.current;

    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      const body: unknown = await response.json();
      if (!mounted.current || generation.current !== requestGeneration) return;

      if (response.status === 401) {
        setSignedOut(true);
        setProgress(null);
        throw new Error("Please sign in again.");
      }
      if (!response.ok) {
        throw new Error(responseMessage(body, "Your progress could not be loaded."));
      }

      const result = readSkillsProgress(body);
      if (!result) throw new Error("Your saved progress could not be confirmed.");

      setProgress(result);
      setSignedOut(false);
    } catch (error) {
      if (mounted.current && generation.current === requestGeneration) {
        setMessage(
          error instanceof Error ? error.message : "Please try loading again.",
        );
      }
    } finally {
      if (generation.current === requestGeneration) {
        busy.current = false;
        if (mounted.current) setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    busy.current = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    const requestGeneration = ++generation.current;
    let active = true;

    void fetch(endpoint, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => ({
        response,
        body: await response.json() as unknown,
      }))
      .then(({ response, body }) => {
        if (!active || generation.current !== requestGeneration) return;

        if (response.status === 401) {
          setSignedOut(true);
          setProgress(null);
          setMessage("Please sign in again.");
          return;
        }
        if (!response.ok) {
          setMessage(responseMessage(body, "Your progress could not be loaded."));
          return;
        }

        const result = readSkillsProgress(body);
        if (!result) {
          setMessage("Your saved progress could not be confirmed.");
          return;
        }

        setProgress(result);
        setSignedOut(false);
      })
      .catch(() => {
        if (active && generation.current === requestGeneration) {
          setMessage("Your progress could not be loaded. Please try again.");
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active && generation.current === requestGeneration) {
          busy.current = false;
          setLoading(false);
        }
      });

    return () => {
      active = false;
      mounted.current = false;
      generation.current += 1;
      busy.current = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  async function mutate(
    suffix: string,
    method: "POST" | "PUT",
    payload?: { work_text: string; complete: boolean },
    completedCourseId?: string,
  ) {
    if (busy.current || signedOut || !progress) return false;
    busy.current = true;
    setPending(true);
    setMessage("");
    setNotice("");

    const wasCompleted = progress.courses.find(
      (course) => course.id === completedCourseId,
    )?.status === "completed";

    try {
      const response = await fetch(`${endpoint}${suffix}`, {
        method,
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      const body: unknown = await response.json();
      if (!mounted.current) return false;

      if (response.status === 401) {
        setSignedOut(true);
        setProgress(null);
        throw new Error("Please sign in again. Your unsaved work is still here.");
      }
      if (!response.ok) {
        throw new Error(responseMessage(body, "Your work could not be saved."));
      }

      const result = readSkillsProgress(body);
      if (!result) {
        throw new Error("Could not confirm the save. Reload to check your progress.");
      }

      setProgress(result);
      const course = result.courses.find(
        (item) => item.id === completedCourseId,
      );

      if (course?.status === "completed" && !wasCompleted) {
        const next = result.courses.find(
          (item) => item.id === result.next_course_id,
        );
        setNotice(
          `Well done! ${course.title} completed.${
            next ? ` Next up: ${next.title}.` : " You finished this skill journey!"
          }`,
        );
      } else {
        setNotice(payload?.complete ? "Well done! Your next lesson is ready." : "Saved.");
      }
      return true;
    } catch (error) {
      if (mounted.current) {
        setMessage(
          error instanceof Error ? error.message : "Please try saving again.",
        );
      }
      return false;
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return (
    <CourseContext.Provider value={{
      progress,
      loading,
      pending,
      message,
      notice,
      signedOut,
      reload: async () => {
        if (busy.current) return;
        setLoading(true);
        setMessage("");
        await reload();
      },
      startCourse: (courseId) =>
        mutate(`/${encodeURIComponent(courseId)}/start`, "POST"),
      saveLesson: (courseId, lessonId, work, complete) =>
        mutate(
          `/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`,
          "PUT",
          { work_text: work, complete },
          courseId,
        ),
    }}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourses() {
  const context = useContext(CourseContext);
  if (!context) throw new Error("useCourses requires CourseProvider.");
  return context;
}

export function CourseFeedback() {
  const { loading, pending, message, notice, signedOut, reload } = useCourses();

  return (
    <>
      {loading && <p role="status">Loading your progress…</p>}
      {message && (
        <div role="alert">
          <p>{message}</p>
          {signedOut ? (
            <Link href="/login">Sign in</Link>
          ) : (
            <button
              type="button"
              disabled={loading || pending}
              onClick={() => void reload()}
            >
              Try loading again
            </button>
          )}
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
    </>
  );
}
