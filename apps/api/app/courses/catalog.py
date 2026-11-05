from dataclasses import dataclass


@dataclass(frozen=True)
class Lesson:
    id: str
    title: str


@dataclass(frozen=True)
class Course:
    id: str
    title: str
    lessons: tuple[Lesson, ...]
    version: int = 2


COURSES = (
    Course("powerpoint", "PowerPoint", (
        Lesson("meet-powerpoint", "Meet PowerPoint"),
        Lesson("first-slides", "Create your first slide"),
        Lesson("text-basics", "Work with text"),
        Lesson("pictures-and-shapes", "Add pictures and shapes"),
        Lesson("arrange-slides", "Add and arrange slides"),
        Lesson("save-and-open", "Save and open your work"),
        Lesson("present-project", "Present your project"),
    ), version=3),
    Course("word", "Microsoft Word", (
        Lesson("create-and-save", "Create and save your first document"),
        Lesson("format-text", "Format headings and paragraphs"),
        Lesson("images-and-tables", "Add pictures and tables"),
        Lesson("export-pdf", "Finish and export your report"),
    )),
    Course("excel", "Excel", (
        Lesson("cells-and-columns", "Cells, rows and columns"),
        Lesson("enter-and-format", "Enter and format information"),
        Lesson("sum-and-average", "SUM and AVERAGE"),
        Lesson("sort-and-filter", "Sort and filter"),
        Lesson("simple-chart", "Create a simple chart"),
        Lesson("expense-tracker", "Make a small expense tracker"),
    )),
    Course("python", "Python", (
        Lesson("print-message", "Print a message"),
        Lesson("variables-and-numbers", "Variables and numbers"),
        Lesson("user-input", "Ask for input"),
        Lesson("conditions", "Make decisions with conditions"),
        Lesson("loops", "Repeat with loops"),
        Lesson("simple-quiz", "Build a simple quiz"),
    )),
    Course("java", "Java", (
        Lesson("first-program", "Your first Java program"),
        Lesson("variables-and-input", "Variables and input"),
        Lesson("java-conditions", "Make decisions"),
        Lesson("java-loops", "Repeat with loops"),
        Lesson("methods", "Create a simple method"),
        Lesson("console-project", "Build a small console project"),
    )),
)


def get_course(course_id: str) -> Course:
    for course in COURSES:
        if course.id == course_id:
            return course
    raise ValueError("Course not found.")


def course_is_unlocked(
    course_id: str,
    completed_courses: set[tuple[str, int]],
) -> bool:
    course = get_course(course_id)
    position = COURSES.index(course)
    return all(
        (previous.id, previous.version) in completed_courses
        for previous in COURSES[:position]
    )


def lesson_is_unlocked(
    course_id: str,
    lesson_id: str,
    completed_lessons: set[str],
) -> bool:
    course = get_course(course_id)
    lesson_ids = [lesson.id for lesson in course.lessons]
    if lesson_id not in lesson_ids:
        raise ValueError("Lesson not found.")
    position = lesson_ids.index(lesson_id)
    return all(
        previous in completed_lessons
        for previous in lesson_ids[:position]
    )
