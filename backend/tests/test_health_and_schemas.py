import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient
from app.main import app
from app.schemas import ReviewRequest
from app.services.code_validation import validate_python_syntax, extract_code_blocks

client = TestClient(app)

def test_health_endpoint():
    """Verify GET /api/health returns 200 OK with sanitized status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "environment" in data
    assert "llm_configured" in data
    assert data["model"] == "openai/gpt-oss-120b"
    assert data["provider"] == "GroqCloud"
    # Ensure no secret strings leaked
    assert "AIzaSy" not in str(data)
    assert "gsk_" not in str(data)
    assert "key" not in data or data.get("key") is None

def test_health_endpoints_all_aliases():
    """Verify all health check paths (/api/health, /health, trailing slashes) return 200 OK."""
    paths = ["/api/health", "/health", "/api/health/", "/health/"]
    for path in paths:
        response = client.get(path)
        assert response.status_code == 200, f"Failed for path: {path}"
        data = response.json()
        assert data["status"] == "ok"
        assert data["provider"] == "GroqCloud"
        assert "version" in data

def test_review_request_empty_code_rejected():
    """Verify Pydantic validation rejects empty or whitespace-only code."""
    with pytest.raises(ValidationError):
        ReviewRequest(code="")
    
    with pytest.raises(ValidationError):
        ReviewRequest(code="   \n\t  ")

def test_review_request_oversized_code_rejected():
    """Verify Pydantic validation enforces 50,000 char maximum length limit."""
    with pytest.raises(ValidationError):
        ReviewRequest(code="x = 1\n" * 20000)

def test_review_request_valid_accepted():
    """Verify normal valid request passes validation."""
    req = ReviewRequest(code="def add(a, b): return a + b", language="python", focus="correctness")
    assert req.language == "python"
    assert req.focus == "correctness"

def test_ast_syntax_validation():
    """Verify safe AST syntax validation without executing code."""
    valid_code = "def greet(name):\n    return f'Hello, {name}!'"
    is_valid, errors = validate_python_syntax(valid_code)
    assert is_valid is True
    assert len(errors) == 0

    invalid_code = "def broken(:\n    return 1"
    is_valid, errors = validate_python_syntax(invalid_code)
    assert is_valid is False
    assert len(errors) > 0
    assert "Syntax" in errors[0] or "Line" in errors[0]

def test_extract_code_blocks():
    """Verify extraction of python code from markdown responses."""
    markdown = "Here is the fix:\n```python\ndef fixed():\n    return True\n```\nDone."
    blocks = extract_code_blocks(markdown)
    assert len(blocks) == 1
    assert "def fixed():" in blocks[0]
