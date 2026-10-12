from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator

ReviewFocusType = Literal["general", "correctness", "security", "performance"]

class ReviewRequest(BaseModel):
    """Payload for code review and debugging analysis."""
    code: str = Field(
        ...,
        min_length=1,
        max_length=50000,
        description="The source code to be analyzed, debugged, and reviewed."
    )
    language: str = Field(
        default="python",
        description="Programming language of the submitted code."
    )
    focus: ReviewFocusType = Field(
        default="general",
        description="Specific focal area for review."
    )

    @field_validator("code")
    @classmethod
    def validate_code_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Submitted code must not be empty or whitespace-only.")
        return v

    @field_validator("language")
    @classmethod
    def sanitize_language(cls, v: str) -> str:
        return v.strip().lower() or "python"


class SyntaxValidationResult(BaseModel):
    """Result of static syntax analysis."""
    syntax_valid: bool
    syntax_errors: List[str] = []
    message: Optional[str] = None


class TokenUsageMetrics(BaseModel):
    """Observed token usage metadata from provider."""
    total_tokens: Optional[int] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    successful_requests: Optional[int] = None


class ReviewResponse(BaseModel):
    """Complete structured response from the Code Crew review pipeline."""
    request_id: str
    status: Literal["completed", "partial", "failed", "configuration_required"]
    language: str
    focus: str
    original_code: str
    analysis_report: Optional[str] = None
    proposed_code: Optional[str] = None
    review_findings: Optional[str] = None
    syntax_valid: Optional[bool] = None
    syntax_errors: List[str] = []
    execution_time_seconds: float = 0.0
    error: Optional[str] = None
    provider: str = "GroqCloud"
    model: str = "openai/gpt-oss-120b"
    token_usage: Optional[TokenUsageMetrics] = None


class HealthResponse(BaseModel):
    """Sanitized system health and configuration status."""
    status: str = "ok"
    version: str
    environment: str
    llm_configured: bool
    provider: str = "GroqCloud"
    model: str = "openai/gpt-oss-120b"
