from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SaveLessonRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    work_text: str = Field(max_length=10000)
    complete: bool = False

    @field_validator("work_text")
    @classmethod
    def trim_work(cls, value: str) -> str:
        return value.strip()


class LessonProgressResponse(BaseModel):
    id: str
    title: str
    status: Literal["locked", "current", "completed"]
    work_text: str
    completed_at: datetime | None


class CourseProgressResponse(BaseModel):
    id: str
    title: str
    version: int
    status: Literal["locked", "current", "completed"]
    started_at: datetime | None
    completed_at: datetime | None
    completed_lessons: int
    total_lessons: int
    progress_percent: int
    next_lesson_id: str | None
    lessons: list[LessonProgressResponse]


class SkillsProgressResponse(BaseModel):
    courses: list[CourseProgressResponse]
    next_course_id: str | None
