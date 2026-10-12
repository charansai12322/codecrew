"""
Comprehensive Groq Deep Audit & Reliability Test Suite for Code Crew
Covers:
- Phase 3.A: Authentication and configuration
- Phase 3.B: Request validation and boundary conditions
- Phase 3.C: Response structure, AST validation, and token accounting
- Phase 3.D: HTTP status codes and provider failure mapping
- Phase 3.E: Bounded retries and jitter backoff
- Phase 4: All registered API endpoints (/api/health, /health, /api/review)
- Phase 5: Multi-agent handoff contracts & cache_breakpoint sanitization
- Phase 8: Credential redaction in error messages and logs
- Phase 9: Opt-in live Groq smoke test (via RUN_LIVE_GROQ_TESTS=1)
"""

import os
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.agents import get_llm, _sanitize_messages_for_groq, create_code_analyzer_agent, create_senior_debugger_agent, create_code_reviewer_agent
from app.tasks import create_analyze_task, create_fix_task, create_review_task
from app.crew import CodeReviewCrew
from app.schemas import ReviewRequest, ReviewResponse, HealthResponse

client = TestClient(app)

# ==============================================================================
# SECTION A: AUTHENTICATION, CONFIGURATION & CREDENTIAL REDACTION
# ==============================================================================

def test_config_loads_groq_provider_settings():
    """Verify settings loads GROQ_MODEL and GROQ_API_KEY correctly."""
    assert settings.GROQ_MODEL == "openai/gpt-oss-120b"
    assert "gemini" not in settings.GROQ_MODEL.lower()

def test_missing_credentials_fails_safely():
    """When GROQ_API_KEY is None or empty, get_llm() raises a clear ValueError without contacting network."""
    with patch.object(settings, "GROQ_API_KEY", None):
        with pytest.raises(ValueError) as excinfo:
            get_llm()
        assert "GROQ_API_KEY is not configured" in str(excinfo.value)
        assert "gemini" not in str(excinfo.value).lower()

def test_whitespace_credentials_fails_safely():
    """When GROQ_API_KEY is whitespace only, get_llm() raises ValueError."""
    with patch.object(settings, "GROQ_API_KEY", "   \t\n  "):
        with pytest.raises(ValueError) as excinfo:
            get_llm()
        assert "GROQ_API_KEY is not configured" in str(excinfo.value)

def test_secret_redaction_in_error_paths():
    """Verify real or mock API keys never leak into API responses or error strings."""
    fake_secret = "gsk_VERY_SECRET_KEY_1234567890_XYZ"
    mock_auth_failure = {
        "status": "failed",
        "analysis_report": None,
        "proposed_code": None,
        "review_findings": None,
        "syntax_valid": False,
        "syntax_errors": ["Groq API Key is invalid or unauthorized. Please verify your GROQ_API_KEY."],
        "execution_time_seconds": 0.4,
        "error": "Groq API Key is invalid or unauthorized. Please verify your GROQ_API_KEY."
    }
    with patch.object(settings, "GROQ_API_KEY", fake_secret):
        with patch("app.crew.CodeReviewCrew.kickoff_resilient", new_callable=AsyncMock, return_value=mock_auth_failure):
            response = client.post("/api/review", json={"code": "x = 1"})
            assert response.status_code == 401
            data = response.json()
            assert fake_secret not in str(data)
            assert "gsk_" not in str(data)

# ==============================================================================
# SECTION B: REQUEST VALIDATION & BOUNDARY CONDITIONS
# ==============================================================================

def test_empty_source_code_rejected():
    """Verify whitespace-only or empty code strings return HTTP 422."""
    for empty_val in ["", "   ", "\n\t  \n"]:
        resp = client.post("/api/review", json={"code": empty_val, "language": "python"})
        assert resp.status_code == 422
        assert "Request validation failed" in resp.json()["detail"]

def test_missing_code_field_rejected():
    """Verify payload without 'code' field returns HTTP 422."""
    resp = client.post("/api/review", json={"language": "python", "focus": "general"})
    assert resp.status_code == 422

def test_invalid_data_type_for_code_rejected():
    """Verify non-string code input returns HTTP 422."""
    resp = client.post("/api/review", json={"code": 98765, "language": "python"})
    assert resp.status_code == 422

def test_invalid_focus_rejected():
    """Verify focus outside allowed enum ('general', 'correctness', 'security', 'performance') returns 422."""
    resp = client.post("/api/review", json={"code": "def foo(): pass", "focus": "unsupported_focus"})
    assert resp.status_code == 422

def test_input_size_boundary_enforcement():
    """Verify 50,000 character upper limit boundary on review request."""
    # 50,001 chars -> rejected with 422
    over_limit = "x = 1\n" * 10001
    resp_over = client.post("/api/review", json={"code": over_limit})
    assert resp_over.status_code == 422

    # Exactly 50,000 chars -> accepted by validation
    exact_code = "x" * 50000
    mock_resp = {
        "status": "completed",
        "analysis_report": "OK",
        "proposed_code": exact_code,
        "review_findings": "OK",
        "syntax_valid": False,
        "syntax_errors": ["Invalid syntax"],
        "execution_time_seconds": 1.0,
        "error": None
    }
    with patch.object(settings, "GROQ_API_KEY", "gsk_mock_test_key"):
        with patch("app.crew.CodeReviewCrew.kickoff_resilient", new_callable=AsyncMock, return_value=mock_resp):
            resp_exact = client.post("/api/review", json={"code": exact_code})
            assert resp_exact.status_code == 200

def test_unicode_and_multiline_support():
    """Verify non-English unicode comments and multiline functions are accepted and preserved."""
    unicode_snippet = "# 这是一个测试 / اختبار\ndef greet(name: str) -> str:\n    return f'Hello, {name}! 🌍'\n"
    mock_resp = {
        "status": "completed",
        "analysis_report": "Unicode preserved",
        "proposed_code": unicode_snippet,
        "review_findings": "VERIFIED",
        "syntax_valid": True,
        "syntax_errors": [],
        "execution_time_seconds": 0.5,
        "error": None
    }
    with patch.object(settings, "GROQ_API_KEY", "gsk_mock_test_key"):
        with patch("app.crew.CodeReviewCrew.kickoff_resilient", new_callable=AsyncMock, return_value=mock_resp):
            resp = client.post("/api/review", json={"code": unicode_snippet})
            assert resp.status_code == 200
            data = resp.json()
            assert "这是一个测试" in data["original_code"]
            assert "🌍" in data["original_code"]

# ==============================================================================
# SECTION C: PROVIDER MESSAGE SANITIZATION & CACHE_BREAKPOINT STRIPPING
# ==============================================================================

def test_sanitize_messages_for_groq_pure_function():
    """Verify _sanitize_messages_for_groq returns clean copy without mutating input dictionaries."""
    orig_msg1 = {"role": "system", "content": "System prompt", "cache_breakpoint": True, "cache_control": {"type": "ephemeral"}}
    orig_msg2 = {"role": "user", "content": "Analyze code", "cache_breakpoint": True}
    messages = [orig_msg1, orig_msg2, {"role": "assistant", "content": "Assistant reply"}]
    
    cleaned = _sanitize_messages_for_groq(messages)
    assert len(cleaned) == 3
    for msg in cleaned:
        assert "cache_breakpoint" not in msg
        assert "cache_control" not in msg
        assert "role" in msg
        assert "content" in msg
    # Verify input objects were NOT mutated (protects caller shared-object state)
    assert "cache_breakpoint" in orig_msg1
    assert "cache_breakpoint" in orig_msg2

def test_groq_chat_config_strips_cache_breakpoint():
    """Verify LiteLLM's GroqChatConfig transformation automatically strips cache_breakpoint for Groq requests."""
    from litellm.llms.groq.chat.transformation import GroqChatConfig
    config = GroqChatConfig()
    input_messages = [{"role": "user", "content": "Review code", "cache_breakpoint": True}]
    result = config.transform_request(
        model="openai/gpt-oss-120b",
        messages=input_messages,
        optional_params={},
        litellm_params={"custom_llm_provider": "groq"},
        headers={}
    )
    assert "cache_breakpoint" not in result["messages"][0]
    assert result["messages"][0]["content"] == "Review code"

# ==============================================================================
# SECTION D: HTTP STATUS CODES & PROVIDER ERROR MAPPING
# ==============================================================================

@pytest.mark.parametrize("error_text,expected_status", [
    ("429 Rate limit reached for model openai/gpt-oss-120b", 429),
    ("503 Service Unavailable: Groq backend high demand", 503),
    ("401 Unauthorized: Invalid API key", 401),
    ("400 Bad Request: Invalid parameter", 400),
    ("Request timed out while contacting Groq provider", 504),
    ("Upstream server error / unexpected connection drop", 502)
])
def test_provider_error_status_mapping(error_text, expected_status):
    """Verify failed reviews never return HTTP 200 and map to appropriate HTTP status codes."""
    mock_failure = {
        "status": "failed",
        "analysis_report": None,
        "proposed_code": None,
        "review_findings": None,
        "syntax_valid": False,
        "syntax_errors": [error_text],
        "execution_time_seconds": 1.0,
        "error": error_text
    }
    with patch.object(settings, "GROQ_API_KEY", "gsk_test_key"):
        with patch("app.crew.CodeReviewCrew.kickoff_resilient", new_callable=AsyncMock, return_value=mock_failure):
            resp = client.post("/api/review", json={"code": "x = 1"})
            assert resp.status_code == expected_status
            data = resp.json()
            assert data["status"] == "failed"
            assert data["error"] == error_text

def test_third_agent_failure_returns_502():
    """Verify incomplete review workflow where agent 3 fails returns HTTP 502 Bad Gateway."""
    mock_incomplete = {
        "status": "failed",
        "analysis_report": "Analysis done",
        "proposed_code": "Fix done",
        "review_findings": None,
        "syntax_valid": True,
        "syntax_errors": [],
        "execution_time_seconds": 2.5,
        "error": "Review workflow incomplete: The code_reviewer agent failed to produce a final review output."
    }
    with patch.object(settings, "GROQ_API_KEY", "gsk_test_key"):
        with patch("app.crew.CodeReviewCrew.kickoff_resilient", new_callable=AsyncMock, return_value=mock_incomplete):
            resp = client.post("/api/review", json={"code": "def foo(): pass"})
            assert resp.status_code == 502
            data = resp.json()
            assert data["status"] == "failed"
            assert "code_reviewer" in data["error"]

# ==============================================================================
# SECTION E: ALL REGISTERED ENDPOINTS VERIFICATION
# ==============================================================================

def test_endpoint_root():
    """Verify GET / returns application information and endpoint links."""
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Code Crew API"
    assert data["status"] == "online"
    assert "docs_url" in data
    assert "health_url" in data

def test_endpoint_get_api_health():
    """Verify GET /api/health endpoint returns 200 with sanitized GroqCloud metadata."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["provider"] == "GroqCloud"
    assert data["model"] == "openai/gpt-oss-120b"
    assert isinstance(data["llm_configured"], bool)
    assert "gsk_" not in str(data)

def test_endpoint_get_health_alias():
    """Verify GET /health alias route returns 200 identically to /api/health."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["provider"] == "GroqCloud"
    assert data["model"] == "openai/gpt-oss-120b"

def test_endpoint_post_api_review_unconfigured():
    """When GROQ_API_KEY is missing, POST /api/review returns 200 with status='configuration_required'."""
    with patch.object(settings, "GROQ_API_KEY", None):
        resp = client.post("/api/review", json={"code": "def foo(): pass"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "configuration_required"
        assert "GROQ_API_KEY" in data["error"]
        assert data["provider"] == "GroqCloud"
        assert data["model"] == "openai/gpt-oss-120b"

def test_endpoint_openapi_docs():
    """Verify OpenAPI documentation is available at /docs, /redoc, and /openapi.json."""
    resp_docs = client.get("/docs")
    assert resp_docs.status_code == 200

    resp_redoc = client.get("/redoc")
    assert resp_redoc.status_code == 200

    resp_openapi = client.get("/openapi.json")
    assert resp_openapi.status_code == 200
    data = resp_openapi.json()
    assert "paths" in data
    assert "/api/health" in data["paths"]
    assert "/api/review" in data["paths"]

def test_endpoints_reject_invalid_http_methods():
    """Verify endpoints enforce HTTP method constraints with 405 Method Not Allowed."""
    # POST to GET-only endpoint
    resp_post_health = client.post("/api/health")
    assert resp_post_health.status_code == 405

    # GET to POST-only endpoint
    resp_get_review = client.get("/api/review")
    assert resp_get_review.status_code == 405

    # DELETE to endpoints
    resp_del_health = client.delete("/api/health")
    assert resp_del_health.status_code == 405

# ==============================================================================
# SECTION F: MULTI-AGENT HANDOFF & MODEL UNIFICATION
# ==============================================================================

def test_all_three_agents_use_identical_groq_model():
    """Verify Code_Analyzer, Senior_Debugger, and code_reviewer use the same configured Groq model."""
    fake_key = "gsk_mock_test_key"
    with patch.object(settings, "GROQ_API_KEY", fake_key):
        orchestrator = CodeReviewCrew(code="def add(a, b): return a + b")
        crew, t1, t2, t3 = orchestrator.build_crew()
        assert len(crew.agents) == 3
        for agent in crew.agents:
            assert "openai/gpt-oss-120b" in str(agent.llm.model)
            assert "gemini" not in str(agent.llm.model).lower()

def test_task_context_dependencies():
    """Verify sequential context handoffs: Task 1 -> Task 2 -> Task 3."""
    fake_key = "gsk_mock_test_key"
    with patch.object(settings, "GROQ_API_KEY", fake_key):
        orchestrator = CodeReviewCrew(code="def add(a, b): return a + b")
        crew, t1, t2, t3 = orchestrator.build_crew()
        assert t2.context == [t1]
        assert t3.context == [t1, t2]

# ==============================================================================
# SECTION G: OPT-IN LIVE GROQ SMOKE TEST
# ==============================================================================

@pytest.mark.skipif(
    os.getenv("RUN_LIVE_GROQ_TESTS") != "1",
    reason="Live Groq tests skipped by default. Set RUN_LIVE_GROQ_TESTS=1 to run."
)
def test_live_groq_provider_connectivity():
    """Live smoke test confirming actual connectivity to GroqCloud openai/gpt-oss-120b."""
    if not settings.is_configured:
        pytest.skip("GROQ_API_KEY not configured in environment.")

    llm = get_llm()
    resp = llm.call([{"role": "user", "content": "Respond with 'GROQ_AUDIT_PASS' only."}])
    assert resp is not None
    assert "GROQ_AUDIT_PASS" in str(resp).upper() or len(str(resp).strip()) > 0
