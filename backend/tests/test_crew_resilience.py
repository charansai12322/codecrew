import pytest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from crewai import LLM
from app.crew import CodeReviewCrew

@pytest.fixture
def mock_llm():
    return LLM(model="groq/openai/gpt-oss-120b", api_key="test_fake_key")

@pytest.mark.asyncio
async def test_crew_resilient_transient_retry_success(mock_llm):
    """
    Verifies that transient errors (e.g. 503 Service Unavailable) trigger
    bounded exponential backoff retries and succeed if a subsequent attempt passes.
    """
    crew_orchestrator = CodeReviewCrew(
        code="def add(a, b): return a + b",
        language="python",
        focus="correctness",
        llm=mock_llm,
        max_retries=2,
        backoff_factor=1.1
    )

    mock_crew = MagicMock()
    mock_crew.kickoff_async = AsyncMock(side_effect=[
        Exception("503 Service Unavailable: Groq service high demand"),
        "## Final Verified Code\n```python\ndef add(a, b):\n    return a + b\n```"
    ])
    mock_crew.usage_metrics = MagicMock(prompt_tokens=150, completion_tokens=80, total_tokens=230)

    task1 = MagicMock(output="Bug analysis report")
    task2 = MagicMock(output="Fixed code")
    task3 = MagicMock(output="## Final Verified Code\n```python\ndef add(a, b):\n    return a + b\n```")

    with patch.object(crew_orchestrator, "build_crew", return_value=(mock_crew, task1, task2, task3)):
        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            result = await crew_orchestrator.kickoff_resilient()
            assert result["status"] == "completed"
            assert mock_sleep.called
            assert "def add" in result["proposed_code"]
            assert result["syntax_valid"] is True
            assert result["token_usage"] is not None
            assert result["token_usage"]["total_tokens"] == 230

@pytest.mark.asyncio
async def test_crew_resilient_permanent_error_no_retry(mock_llm):
    """
    Verifies that permanent errors (e.g. 401 Unauthorized / invalid Groq API key)
    do NOT retry and immediately return a sanitized failure response.
    """
    crew_orchestrator = CodeReviewCrew(
        code="def add(a, b): return a + b",
        language="python",
        focus="correctness",
        llm=mock_llm,
        max_retries=3
    )

    mock_crew = MagicMock()
    mock_crew.kickoff_async = AsyncMock(side_effect=Exception("401 Unauthorized: Invalid Groq API Key"))

    task1 = MagicMock()
    task2 = MagicMock()
    task3 = MagicMock()

    with patch.object(crew_orchestrator, "build_crew", return_value=(mock_crew, task1, task2, task3)):
        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            result = await crew_orchestrator.kickoff_resilient()
            assert result["status"] == "failed"
            assert not mock_sleep.called  # Permanent error: must NOT retry
            assert "invalid or unauthorized" in result["error"].lower()

@pytest.mark.asyncio
async def test_crew_resilient_rate_limit_429(mock_llm):
    """
    Verifies that HTTP 429 rate limits are classified correctly and retry
    up to max_retries before returning a clean rate limit message.
    """
    crew_orchestrator = CodeReviewCrew(
        code="def add(a, b): return a + b",
        language="python",
        focus="correctness",
        llm=mock_llm,
        max_retries=2,
        backoff_factor=1.0
    )

    mock_crew = MagicMock()
    mock_crew.kickoff_async = AsyncMock(side_effect=Exception("Rate limit reached for model openai/gpt-oss-120b (429)"))

    task1 = MagicMock()
    task2 = MagicMock()
    task3 = MagicMock()

    with patch.object(crew_orchestrator, "build_crew", return_value=(mock_crew, task1, task2, task3)):
        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            result = await crew_orchestrator.kickoff_resilient()
            assert result["status"] == "failed"
            assert mock_sleep.call_count == 1  # Retried once after attempt 1
            assert "429" in result["error"] or "rate limit" in result["error"].lower()

@pytest.mark.asyncio
async def test_third_agent_failure_cannot_masquerade_as_success(mock_llm):
    """
    Verifies requirement: A third-agent failure cannot masquerade as a successful review.
    If the review task produces no output or fails, status is marked as 'failed'.
    """
    crew_orchestrator = CodeReviewCrew(
        code="def add(a, b): return a + b",
        language="python",
        focus="correctness",
        llm=mock_llm,
        max_retries=1
    )

    mock_crew = MagicMock()
    mock_crew.kickoff_async = AsyncMock(return_value="Some intermediate text")
    mock_crew.usage_metrics = None

    task1 = MagicMock(output="Bug analysis report")
    task2 = MagicMock(output="Fixed code")
    task3 = MagicMock(output="")  # Third agent failed to produce output!

    with patch.object(crew_orchestrator, "build_crew", return_value=(mock_crew, task1, task2, task3)):
        result = await crew_orchestrator.kickoff_resilient()
        assert result["status"] == "failed"
        assert "incomplete" in result["error"].lower() or "reviewer" in result["error"].lower()
        assert result["token_usage"] is None

def test_all_agents_share_configured_groq_llm(mock_llm):
    """Verifies that all three agents share the same configured Groq LLM instance."""
    crew_orchestrator = CodeReviewCrew(
        code="x = 1",
        language="python",
        focus="general",
        llm=mock_llm
    )
    crew, t1, t2, t3 = crew_orchestrator.build_crew()
    assert len(crew.agents) == 3
    for agent in crew.agents:
        assert agent.llm == mock_llm
        assert "openai/gpt-oss-120b" in str(agent.llm.model)
        assert "gemini" not in str(agent.llm.model).lower()
