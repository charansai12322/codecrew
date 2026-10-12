"""
Code Crew - FastAPI Application Entry Point
Exposes sanitized REST API endpoints:
- GET /api/health
- POST /api/review
"""

import logging
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.config import settings
from app.schemas import ReviewRequest, ReviewResponse, HealthResponse
from app.services.review_service import ReviewService

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("codecrew.api")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Multi-Agent Automated Code Review and Debugging Engine powered by CrewAI and GroqCloud.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Sanitized validation error response."""
    errors = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "Validation error")
        errors.append(f"{loc}: {msg}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "detail": "Request validation failed",
            "errors": errors
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Sanitized fallback error response to prevent credential or stack leak."""
    logger.error(f"Unhandled server error on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred while processing the request.",
            "status": "error"
        }
    )

@app.get("/", tags=["Root"])
async def root():
    """Returns application name, version, and links to documentation and health check."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": "/docs",
        "health_url": "/api/health"
    }

@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
@app.get("/health", response_model=HealthResponse, include_in_schema=False)
@app.get("/api/health/", response_model=HealthResponse, include_in_schema=False)
@app.get("/health/", response_model=HealthResponse, include_in_schema=False)
async def get_health():
    """
    Returns sanitized health status, environment, and configuration readiness.
    Never exposes real API keys or sensitive infrastructure details.
    """
    return HealthResponse(
        status="ok",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        llm_configured=settings.is_configured,
        provider="GroqCloud",
        model=settings.GROQ_MODEL
    )

@app.post("/api/review", response_model=ReviewResponse, tags=["Review"])
async def create_review(request: ReviewRequest):
    """
    Initiates the 3-agent code review workflow:
    1. Code_Analyzer (Defect diagnosis & root-cause report)
    2. Senior_Debugger (Runnable fix with fix comments)
    3. code_reviewer (Verification & edge-case test verdict)
    """
    logger.info(f"Incoming review request: language='{request.language}', focus='{request.focus}', code_len={len(request.code)}")
    response = await ReviewService.execute_review(request)
    if response.status == "failed":
        err_lower = (response.error or "").lower()
        if "429" in err_lower or "rate limit" in err_lower or "resource exhausted" in err_lower:
            status_code = status.HTTP_429_TOO_MANY_REQUESTS
        elif "503" in err_lower or "service unavailable" in err_lower or "high demand" in err_lower:
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        elif "401" in err_lower or "unauthorized" in err_lower or "api key is invalid" in err_lower or "unauthenticated" in err_lower:
            status_code = status.HTTP_401_UNAUTHORIZED
        elif "400" in err_lower or "bad request" in err_lower or "invalid request" in err_lower:
            status_code = status.HTTP_400_BAD_REQUEST
        elif "timed out" in err_lower or "timeout" in err_lower:
            status_code = status.HTTP_504_GATEWAY_TIMEOUT
        else:
            status_code = status.HTTP_502_BAD_GATEWAY
        return JSONResponse(status_code=status_code, content=response.model_dump())
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
