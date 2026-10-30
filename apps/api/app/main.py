from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.admin.routes import router as admin_router
from app.auth.routes import router as auth_router
from app.database import database_is_ready
from app.student.routes import router as student_router


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

@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request,
    error: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "detail": [
                {
                    "loc": item["loc"],
                    "msg": item["msg"],
                    "type": item["type"],
                }
                for item in error.errors()
            ]
        },
    )


app.include_router(auth_router)
app.include_router(student_router)
app.include_router(admin_router)


@app.middleware("http")
async def prevent_auth_response_caching(request: Request, call_next):
    response = await call_next(request)
    if (
        request.url.path in {"/auth", "/student", "/admin"}
        or request.url.path.startswith(("/auth/", "/student/", "/admin/"))
    ):
        response.headers["Cache-Control"] = "no-store"
    return response
