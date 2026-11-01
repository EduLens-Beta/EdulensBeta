from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SaveActivityRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    work_text: str = Field(max_length=10000)
    complete: bool = False


class ActivityResponse(BaseModel):
    step_id: str
    work_text: str
    completed_at: datetime | None
    awarded_xp: int


class JourneyResponse(BaseModel):
    roadmap_id: str
    roadmap_version: int
    started_at: datetime | None
    activities: list[ActivityResponse]
    completed_count: int
    total_activities: int
    total_xp: int
    progress_percent: int
    next_step_id: str | None
