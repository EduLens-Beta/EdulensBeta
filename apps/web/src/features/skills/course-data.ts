export type CourseStatus = "locked" | "current" | "completed";

export type CourseLesson = {
  id: string;
  title: string;
  status: CourseStatus;
  work_text: string;
  completed_at: string | null;
};

export type CourseProgress = {
  id: string;
  title: string;
  version: number;
  status: CourseStatus;
  started_at: string | null;
  completed_at: string | null;
  completed_lessons: number;
  total_lessons: number;
  progress_percent: number;
  next_lesson_id: string | null;
  lessons: CourseLesson[];
};

export type SkillsProgress = {
  courses: CourseProgress[];
  next_course_id: string | null;
};

const catalog = [
  ["powerpoint", [
    "meet-powerpoint", "first-slides", "text-basics",
    "pictures-and-shapes", "arrange-slides", "save-and-open",
    "present-project",
  ]],
  ["word", [
    "create-and-save", "format-text", "images-and-tables", "export-pdf",
  ]],
  ["excel", [
    "cells-and-columns", "enter-and-format", "sum-and-average",
    "sort-and-filter", "simple-chart", "expense-tracker",
  ]],
  ["python", [
    "print-message", "variables-and-numbers", "user-input",
    "conditions", "loops", "simple-quiz",
  ]],
  ["java", [
    "first-program", "variables-and-input", "java-conditions",
    "java-loops", "methods", "console-project",
  ]],
] as const;

export function isCourseId(value: string) {
  return catalog.some(([id]) => id === value);
}

export function isCourseLesson(courseId: string, lessonId: string) {
  return catalog.some(([id, lessons]) =>
    id === courseId && lessons.some((lesson) => lesson === lessonId),
  );
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function timestamp(value: unknown) {
  return value === null ||
    (typeof value === "string" && Number.isFinite(Date.parse(value)));
}

export function readSkillsProgress(value: unknown): SkillsProgress | null {
  if (!record(value) || !Array.isArray(value.courses) ||
      value.courses.length !== catalog.length) return null;

  let earlierCoursesDone = true;
  let nextCourse: string | null = null;

  for (let index = 0; index < catalog.length; index += 1) {
    const course: unknown = value.courses[index];
    const [id, lessonIds] = catalog[index];
    if (!record(course) || course.id !== id || course.version !== (id === "powerpoint" ? 3 : 2) ||
        typeof course.title !== "string" || !course.title.trim() ||
        !timestamp(course.started_at) || !timestamp(course.completed_at) ||
        !Array.isArray(course.lessons) ||
        course.lessons.length !== lessonIds.length) return null;

    const courseDone = course.completed_at !== null;
    const expectedStatus = courseDone ? "completed" :
      earlierCoursesDone ? "current" : "locked";
    if (course.status !== expectedStatus ||
        (courseDone && (!earlierCoursesDone || course.started_at === null))) {
      return null;
    }

    let count = 0;
    let firstUnfinished: string | null = null;
    for (let lessonIndex = 0; lessonIndex < lessonIds.length; lessonIndex += 1) {
      const lesson: unknown = course.lessons[lessonIndex];
      if (!record(lesson) || lesson.id !== lessonIds[lessonIndex] ||
          typeof lesson.title !== "string" || !lesson.title.trim() ||
          typeof lesson.work_text !== "string" ||
          Array.from(lesson.work_text).length > 10000 ||
          !timestamp(lesson.completed_at)) return null;

      const done = lesson.completed_at !== null;
      if (done) {
        if (firstUnfinished !== null || !earlierCoursesDone ||
            course.started_at === null || !lesson.work_text.trim()) return null;
        count += 1;
      } else if (firstUnfinished === null) {
        firstUnfinished = lesson.id as string;
      }

      const expectedLessonStatus = done ? "completed" :
        earlierCoursesDone && lesson.id === firstUnfinished ? "current" : "locked";
      if (lesson.status !== expectedLessonStatus) return null;
    }

    if (courseDone !== (count === lessonIds.length) ||
        course.completed_lessons !== count ||
        course.total_lessons !== lessonIds.length ||
        course.progress_percent !== Math.floor(count * 100 / lessonIds.length) ||
        course.next_lesson_id !== (earlierCoursesDone ? firstUnfinished : null)) {
      return null;
    }
    if (expectedStatus === "current") nextCourse = id;
    earlierCoursesDone = earlierCoursesDone && courseDone;
  }

  if (value.next_course_id !== nextCourse) return null;
  return value as SkillsProgress;
}
