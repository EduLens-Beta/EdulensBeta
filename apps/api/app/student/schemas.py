from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator


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


StudyGroup = Literal["science", "business_studies", "humanities"]


class SchoolDetailsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    school_class: Literal[9, 10]
    study_group: StudyGroup

    @field_validator("school_class", mode="before")
    @classmethod
    def require_integer_class(cls, value: object) -> object:
        if type(value) is not int:
            raise ValueError("Choose Class 9 or Class 10.")
        return value


class SchoolDetailsResponse(BaseModel):
    school_class: Literal[9, 10] | None
    study_group: StudyGroup | None
