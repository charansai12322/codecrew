"""
Code Crew - Review Service Orchestration
Coordinates request validation, credential check, crew execution,
syntax analysis, and structured response construction.
"""

import uuid
import time
import logging
from typing import Optional
from app.config import settings
from app.schemas import ReviewRequest, ReviewResponse
from app.crew import CodeReviewCrew
from app.services.code_validation import validate_python_syntax

logger = logging.getLogger("codecrew.service")

class ReviewService:
    """Service layer coordinating code review requests."""

    @staticmethod
    async def execute_review(request: ReviewRequest) -> ReviewResponse:
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        # 1. Static validation of submitted code (for Python)
        syntax_valid = None
        syntax_errors = []
        if request.language.lower() == "python":
            syntax_valid, syntax_errors = validate_python_syntax(request.code)

        # 2. Check if LLM provider credentials are configured
        if not settings.is_configured:
            elapsed = round(time.time() - start_time, 2)
            config_msg = (
                "GroqCloud API key is not configured. "
                "Please configure GROQ_API_KEY in your environment or in backend/.env to enable live agent reviews."
            )
            logger.warning(f"[{request_id}] Review requested without LLM credentials.")
            return ReviewResponse(
                request_id=request_id,
                status="configuration_required",
                language=request.language,
                focus=request.focus,
                original_code=request.code,
                analysis_report=None,
                proposed_code=None,
                review_findings=None,
                syntax_valid=syntax_valid,
                syntax_errors=syntax_errors,
                execution_time_seconds=elapsed,
                error=config_msg,
                provider="GroqCloud",
                model=settings.GROQ_MODEL
            )

        # 3. Instantiate and execute the CodeReviewCrew
        try:
            crew_orchestrator = CodeReviewCrew(
                code=request.code,
                language=request.language,
                focus=request.focus,
                max_retries=settings.MAX_RETRIES,
                backoff_factor=settings.RETRY_BACKOFF_FACTOR
            )
            
            result = await crew_orchestrator.kickoff_resilient()

            return ReviewResponse(
                request_id=request_id,
                status=result["status"],
                language=request.language,
                focus=request.focus,
                original_code=request.code,
                analysis_report=result["analysis_report"],
                proposed_code=result["proposed_code"],
                review_findings=result["review_findings"],
                syntax_valid=result["syntax_valid"] if result["syntax_valid"] is not None else syntax_valid,
                syntax_errors=result["syntax_errors"] or syntax_errors,
                execution_time_seconds=result["execution_time_seconds"],
                error=result["error"],
                provider="GroqCloud",
                model=settings.GROQ_MODEL,
                token_usage=result.get("token_usage")
            )

        except Exception as e:
            elapsed = round(time.time() - start_time, 2)
            err_msg = f"Unexpected failure during review execution: {str(e)}"
            logger.error(f"[{request_id}] {err_msg}", exc_info=True)
            return ReviewResponse(
                request_id=request_id,
                status="failed",
                language=request.language,
                focus=request.focus,
                original_code=request.code,
                analysis_report=None,
                proposed_code=None,
                review_findings=None,
                syntax_valid=syntax_valid,
                syntax_errors=[err_msg],
                execution_time_seconds=elapsed,
                error=err_msg,
                provider="GroqCloud",
                model=settings.GROQ_MODEL
            )
