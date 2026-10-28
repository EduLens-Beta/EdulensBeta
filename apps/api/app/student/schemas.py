from typing import Literal

from pydantic import BaseModel, ConfigDict


EducationStage = Literal[
    "class_6_8",
    "class_9_10",
    "college",
    "university",
]


class StudentProfileRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    education_stage: EducationStage


class StudentProfileResponse(BaseModel):
    education_stage: EducationStage | None
