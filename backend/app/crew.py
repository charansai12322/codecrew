"""
Code Crew - Multi-Agent Review Orchestrator
Coordinates sequential agent execution, extracts intermediate outputs,
and manages bounded retries and resilient failure handling.
"""

import time
import asyncio
import logging
import random
import re
from typing import Optional, Dict, Any, Tuple
from crewai import Crew, Process, LLM
from app.config import settings
from app.agents import (
    create_code_analyzer_agent,
    create_senior_debugger_agent,
    create_code_reviewer_agent,
    get_llm
)
from app.tasks import (
    create_analyze_task,
    create_fix_task,
    create_review_task
)
from app.services.code_validation import extract_code_blocks, validate_python_syntax

logger = logging.getLogger("codecrew.crew")

class CodeReviewCrew:
    """
    Orchestrates the 3-agent Code Crew workflow backed by GroqCloud:
    1. Code_Analyzer -> 2. Senior_Debugger -> 3. code_reviewer
    """

    def __init__(
        self,
        code: str,
        language: str = "python",
        focus: str = "general",
        llm: Optional[LLM] = None,
        max_retries: int = 2,
        backoff_factor: float = 2.0,
        pacing_seconds: float = 1.0
    ):
        self.code = code
        self.language = language
        self.focus = focus
        self.llm = llm
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.pacing_seconds = pacing_seconds

    def _task_pacing_callback(self, task_output: Any) -> None:
        """Paces sequential tasks to respect GroqCloud rate limits."""
        if self.pacing_seconds > 0:
            time.sleep(self.pacing_seconds)

    def build_crew(self) -> Tuple[Crew, Any, Any, Any]:
        """Constructs and wires agents, tasks, and sequential Crew."""
        active_llm = self.llm or get_llm()
        
        analyzer_agent = create_code_analyzer_agent(llm=active_llm)
        debugger_agent = create_senior_debugger_agent(llm=active_llm)
        reviewer_agent = create_code_reviewer_agent(llm=active_llm)

        task_analyze = create_analyze_task(
            agent=analyzer_agent,
            code=self.code,
            language=self.language,
            focus=self.focus
        )
        task_fix = create_fix_task(
            agent=debugger_agent,
            analyze_task=task_analyze,
            code=self.code,
            language=self.language
        )
        task_review = create_review_task(
            agent=reviewer_agent,
            analyze_task=task_analyze,
            fix_task=task_fix,
            code=self.code,
            language=self.language,
            focus=self.focus
        )

        crew = Crew(
            agents=[analyzer_agent, debugger_agent, reviewer_agent],
            tasks=[task_analyze, task_fix, task_review],
            process=Process.sequential,
            verbose=False,
            memory=False,
            task_callback=self._task_pacing_callback if self.pacing_seconds > 0 else None
        )

        return crew, task_analyze, task_fix, task_review

    async def kickoff_resilient(self) -> Dict[str, Any]:
        """
        Executes Crew workflow with bounded exponential backoff retries
        for transient GroqCloud provider failures (HTTP 429, 500, 502, 503, timeouts).
        """
        start_time = time.time()
        last_exception = None

        for attempt in range(1, self.max_retries + 1):
            try:
                crew, task_analyze, task_fix, task_review = self.build_crew()
                
                # Execute kickoff asynchronously
                result = await crew.kickoff_async(
                    inputs={
                        "code": self.code,
                        "language": self.language,
                        "focus": self.focus
                    }
                )

                elapsed = round(time.time() - start_time, 2)
                
                # Verify that third agent completed; cannot masquerade as success if empty
                task_rev_raw = getattr(task_review, "output", None)
                if not task_rev_raw or not str(task_rev_raw).strip():
                    raise RuntimeError("Review workflow incomplete: The code_reviewer agent failed to produce a final review output.")

                # Extract individual task outputs
                analysis_out = str(getattr(task_analyze, "output", "") or "")
                fix_out = str(getattr(task_fix, "output", "") or "")
                review_out = str(task_rev_raw)

                # Extract token usage metadata if available (from result or crew.usage_metrics)
                token_usage = None
                usage = getattr(result, "token_usage", None) or getattr(crew, "usage_metrics", None)
                if usage:
                    token_usage = {
                        "total_tokens": getattr(usage, "total_tokens", None),
                        "prompt_tokens": getattr(usage, "prompt_tokens", None),
                        "completion_tokens": getattr(usage, "completion_tokens", None),
                        "successful_requests": getattr(usage, "successful_requests", None)
                    }

                # Extract proposed code snippet from fix_out or review_out
                proposed_code = ""
                extracted_blocks = extract_code_blocks(review_out) or extract_code_blocks(fix_out)
                if extracted_blocks:
                    proposed_code = extracted_blocks[0]
                else:
                    proposed_code = fix_out

                # Static syntax validation for Python
                syntax_valid = None
                syntax_errors = []
                if self.language.lower() == "python" and proposed_code:
                    syntax_valid, syntax_errors = validate_python_syntax(proposed_code)

                return {
                    "status": "completed",
                    "analysis_report": analysis_out or "Analysis completed successfully.",
                    "proposed_code": proposed_code,
                    "review_findings": review_out,
                    "syntax_valid": syntax_valid,
                    "syntax_errors": syntax_errors,
                    "execution_time_seconds": elapsed,
                    "token_usage": token_usage,
                    "error": None
                }

            except Exception as e:
                last_exception = e
                err_str = str(e)
                logger.warning(f"Crew kickoff attempt {attempt}/{self.max_retries} failed: {err_str}")

                # Fast-fail permanent errors (invalid API key, 401, 403, 400 bad request)
                is_permanent = any(code in err_str.lower() for code in ["401", "authenticationerror", "invalid_api_key", "unauthorized", "403", "permission", "400", "badrequest"])
                if is_permanent:
                    break

                # Check if error is transient
                is_transient = any(code in err_str.lower() for code in ["503", "429", "500", "502", "504", "ratelimit", "timeout", "connectionerror", "unavailable"])
                
                if is_transient and attempt < self.max_retries:
                    wait_time = (self.backoff_factor ** attempt) + random.uniform(0.1, 0.5)
                    # Respect provider retry-after if present
                    retry_match = re.search(r"retry\s+(?:in|after)\s+([0-9.]+)\s*s", err_str, re.IGNORECASE)
                    if retry_match:
                        try:
                            provider_wait = float(retry_match.group(1))
                            if provider_wait <= 30.0:
                                wait_time = max(wait_time, provider_wait + 0.5)
                            else:
                                logger.warning(f"Provider requested long wait ({provider_wait}s). Stopping retries.")
                                break
                        except Exception:
                            pass
                    logger.info(f"Retrying transient provider failure after {wait_time:.1f}s backoff...")
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    break

        elapsed = round(time.time() - start_time, 2)
        err_msg = str(last_exception) if last_exception else "Unknown execution error"
        
        # User-friendly GroqCloud error mapping
        err_lower = err_msg.lower()
        if "401" in err_lower or "authenticationerror" in err_lower or "invalid_api_key" in err_lower or "unauthorized" in err_lower:
            err_msg = "Groq API Key is invalid or unauthorized. Please verify your GROQ_API_KEY."
        elif "429" in err_lower or "ratelimit" in err_lower or "rate limit" in err_lower:
            err_msg = "Groq API rate limit or quota exceeded (429 Rate Limit). Please wait before submitting another review."
        elif "503" in err_lower or "500" in err_lower or "502" in err_lower or "unavailable" in err_lower:
            err_msg = "GroqCloud service is currently experiencing high demand or temporary downtime. Please retry shortly."
        elif "timeout" in err_lower:
            err_msg = "Request timed out while contacting Groq provider."

        return {
            "status": "failed",
            "analysis_report": None,
            "proposed_code": None,
            "review_findings": None,
            "syntax_valid": False,
            "syntax_errors": [err_msg],
            "execution_time_seconds": elapsed,
            "token_usage": None,
            "error": err_msg
        }
