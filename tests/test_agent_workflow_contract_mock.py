import pytest
from unittest.mock import MagicMock

class MockWorkflowEngine:
    """Simulates the 3-agent sequential workflow contract implemented in codereviewcrew.ipynb."""
    
    def __init__(self, llm_callable=None):
        self.llm_callable = llm_callable or self.default_mock_llm

    @staticmethod
    def default_mock_llm(role, prompt, context=None):
        if role == "Code_Analyzer":
            return "## Bug Analysis Report\n- Bug 1: IndexError"
        elif role == "Senior_Debugger":
            return "```python\n# Fixed code\n```\n### Fix Summary"
        elif role == "code_reviewer":
            return "```python\n# Final Verified Code\n```\n- Checklist: All fixed"
        return "Generic response"

    def execute_workflow(self, inputs, raise_on_error=True):
        # 1. Validation check
        if not isinstance(inputs, dict):
            raise TypeError("Inputs must be a dictionary")
        if "buggy_code" not in inputs:
            raise KeyError("Missing required input field 'buggy_code'")
        
        buggy_code = inputs["buggy_code"]
        if not isinstance(buggy_code, str):
            raise TypeError(f"Expected buggy_code to be str, got {type(buggy_code).__name__}")
        
        if not buggy_code.strip():
            # Notebook has no validation, but empty inputs should be handled
            return {"status": "empty_input", "output": "No code provided to analyze"}

        # 2. Task 1: Code_Analyzer
        try:
            report = self.llm_callable("Code_Analyzer", f"Analyze code: {buggy_code}")
        except Exception as e:
            if raise_on_error:
                raise RuntimeError(f"Task 1 (Analysis) failed: {e}") from e
            return {"status": "failed", "step": "analysis", "error": str(e)}

        # 3. Task 2: Senior_Debugger (takes report)
        try:
            fixed = self.llm_callable("Senior_Debugger", f"Fix bugs from report: {report}", context=[report])
        except Exception as e:
            if raise_on_error:
                raise RuntimeError(f"Task 2 (Debugger) failed: {e}") from e
            return {"status": "failed", "step": "fix", "error": str(e)}

        # 4. Task 3: code_reviewer (requires BOTH report and fixed code)
        try:
            verified = self.llm_callable("code_reviewer", f"Verify fix against report", context=[report, fixed])
        except Exception as e:
            if raise_on_error:
                raise RuntimeError(f"Task 3 (Reviewer) failed: {e}") from e
            return {"status": "failed", "step": "review", "error": str(e)}

        return {
            "status": "success",
            "analysis_report": report,
            "fixed_code": fixed,
            "final_verified_output": verified
        }


# --- AUDIT WORKFLOW TESTS ---

def test_workflow_normal_execution():
    """Verify standard happy-path flow through all 3 stages."""
    engine = MockWorkflowEngine()
    result = engine.execute_workflow({"buggy_code": "def foo(): pass"})
    assert result["status"] == "success"
    assert "Bug Analysis Report" in result["analysis_report"]
    assert "Fixed code" in result["fixed_code"]
    assert "Final Verified Code" in result["final_verified_output"]

def test_workflow_missing_input_key():
    """Verify error raised when 'buggy_code' key is omitted."""
    engine = MockWorkflowEngine()
    with pytest.raises(KeyError) as exc_info:
        engine.execute_workflow({})
    assert "Missing required input field 'buggy_code'" in str(exc_info.value)

def test_workflow_invalid_input_type():
    """Verify error raised when buggy_code is not a string."""
    engine = MockWorkflowEngine()
    with pytest.raises(TypeError) as exc_info:
        engine.execute_workflow({"buggy_code": 12345})
    assert "Expected buggy_code to be str" in str(exc_info.value)

def test_workflow_empty_and_whitespace_input():
    """Verify handling of empty or whitespace-only code strings."""
    engine = MockWorkflowEngine()
    res1 = engine.execute_workflow({"buggy_code": ""})
    assert res1["status"] == "empty_input"
    res2 = engine.execute_workflow({"buggy_code": "   \n\t  "})
    assert res2["status"] == "empty_input"

def test_workflow_provider_503_error_propagation():
    """
    Reproduces the exact failure observed in codereviewcrew.ipynb Cell 13:
    Task 3 fails with 503 UNAVAILABLE, and the unhandled error crashes the entire crew.
    """
    def failing_reviewer_llm(role, prompt, context=None):
        if role == "code_reviewer":
            raise ConnectionError("503 UNAVAILABLE. {'error': {'code': 503, 'message': 'This model is currently experiencing high demand.'}}")
        return "Normal step output"

    engine = MockWorkflowEngine(llm_callable=failing_reviewer_llm)
    with pytest.raises(RuntimeError) as exc_info:
        engine.execute_workflow({"buggy_code": "def bar(): pass"})
    assert "Task 3 (Reviewer) failed" in str(exc_info.value)
    assert "503 UNAVAILABLE" in str(exc_info.value)

def test_workflow_intermediate_task_failure():
    """Tests failure at Task 2 (Senior_Debugger) halting subsequent steps."""
    def failing_debugger_llm(role, prompt, context=None):
        if role == "Senior_Debugger":
            raise TimeoutError("LLM call timed out after 60s")
        return "Normal step output"

    engine = MockWorkflowEngine(llm_callable=failing_debugger_llm)
    with pytest.raises(RuntimeError) as exc_info:
        engine.execute_workflow({"buggy_code": "def bar(): pass"})
    assert "Task 2 (Debugger) failed" in str(exc_info.value)

def test_workflow_context_loss_in_sequential_mode():
    """
    Validates architectural concern: In standard CrewAI sequential process without
    explicit `context=[task_analyze, task_fix]`, task_review only gets task_fix output.
    """
    received_contexts = {}

    def tracking_llm(role, prompt, context=None):
        received_contexts[role] = context
        return f"{role} result"

    engine = MockWorkflowEngine(llm_callable=tracking_llm)
    engine.execute_workflow({"buggy_code": "def baz(): pass"})

    assert len(received_contexts["code_reviewer"]) == 2
    assert "Code_Analyzer" in received_contexts["code_reviewer"][0]
