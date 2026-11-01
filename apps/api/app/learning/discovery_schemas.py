from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.learning.schemas import JourneyResponse


InterestId = Literal[
    "nature",
    "technology",
    "health",
    "building",
    "communication",
    "data",
]

ExplorationActivityId = Literal[
    "notice-and-question",
    "explain-an-idea",
    "design-a-solution",
]


class SaveDiscoveryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    interests: list[InterestId] = Field(default_factory=list, max_length=3)
    unsure: bool = False
    activity_id: ExplorationActivityId | None = None
    work_text: str = Field(default="", max_length=10000)
    reflection: str = Field(default="", max_length=2000)
    complete: bool = False

    @model_validator(mode="after")
    def validate_discovery(self):
        if len(self.interests) != len(set(self.interests)):
            raise ValueError("Choose each interest only once.")

        if self.unsure and self.interests:
            raise ValueError(
                "Choose interests or 'I'm not sure yet', not both."
            )

        self.work_text = self.work_text.strip()
        self.reflection = self.reflection.strip()

        if self.complete:
            if not self.interests and not self.unsure:
                raise ValueError(
                    "Choose an interest or 'I'm not sure yet'."
                )
            if self.activity_id is None:
                raise ValueError("Choose a small activity to try.")
            if len(self.work_text) < 20:
                raise ValueError("Describe your work in at least 20 characters.")
            if len(self.reflection) < 20:
                raise ValueError(
                    "Add at least 20 characters about how the activity felt."
                )

        return self


class DiscoveryDetailsResponse(BaseModel):
    interests: list[InterestId]
    unsure: bool
    activity_id: ExplorationActivityId | None
    work_text: str
    reflection: str


class DiscoveryJourneyResponse(BaseModel):
    journey: JourneyResponse
    discovery: DiscoveryDetailsResponse
