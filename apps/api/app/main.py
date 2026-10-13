from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel


class LivenessResponse(BaseModel):
    status: Literal["ok"]
    service: Literal["edulens-api"]


app = FastAPI(
    title="EduLens API",
    version="0.1.0",
    description="Backend API for the EduLens Student Operating System.",
)


@app.get(
    "/health/live",
    response_model=LivenessResponse,
    tags=["Health"],
    summary="Check whether the API is responding",
)
async def check_liveness() -> LivenessResponse:
    return LivenessResponse(status="ok", service="edulens-api")
