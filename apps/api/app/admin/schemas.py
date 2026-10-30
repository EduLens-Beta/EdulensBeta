from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.student.schemas import EducationStage, StudyGroup


class AdminAccountResponse(BaseModel):
    id: UUID
    name: str
    email: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    education_stage: EducationStage | None
    school_class: int | None
    study_group: StudyGroup | None


class AdminAccountListResponse(BaseModel):
    accounts: list[AdminAccountResponse]
    total: int
    limit: int
    offset: int
