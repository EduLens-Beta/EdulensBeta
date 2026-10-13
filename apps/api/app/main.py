from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Response
from pydantic import BaseModel

from app.database import database_is_ready


class LivenessResponse(BaseModel):
    status: Literal["ok"]
    service: Literal["edulens-api"]


class ReadinessResponse(BaseModel):
    status: Literal["ok", "unavailable"]
    database: Literal["ready", "unavailable"]


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


@app.get(
    "/health/ready",
    response_model=ReadinessResponse,
    responses={503: {"model": ReadinessResponse}},
    tags=["Health"],
    summary="Check whether the API can query PostgreSQL",
)
def check_readiness(
    response: Response,
    database_ready: Annotated[bool, Depends(database_is_ready)],
) -> ReadinessResponse:
    if not database_ready:
        response.status_code = 503
        return ReadinessResponse(
            status="unavailable",
            database="unavailable",
        )

    return ReadinessResponse(status="ok", database="ready")
