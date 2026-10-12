import pytest
from unittest.mock import patch
from crewai import LLM
from app.config import settings
from app.agents import (
    get_llm,
    create_code_analyzer_agent,
    create_senior_debugger_agent,
    create_code_reviewer_agent
)
from app.tasks import (
    create_analyze_task,
    create_fix_task,
    create_review_task
)
from app.crew import CodeReviewCrew

@pytest.fixture
def mock_llm():
    return LLM(model="groq/openai/gpt-oss-120b", api_key="dummy_test_key")

def test_agent_construction_and_roles(mock_llm):
    """Verify agents are initialized with proper roles, goals, and streamlined backstories."""
    analyzer = create_code_analyzer_agent(llm=mock_llm)
    assert analyzer.role == "Code_Analyzer"
    assert "senior software architect" in analyzer.backstory
    assert analyzer.llm.model == "groq/openai/gpt-oss-120b"

    debugger = create_senior_debugger_agent(llm=mock_llm)
    assert debugger.role == "Senior_Debugger"
    assert "clean, runnable fixes" in debugger.backstory
    assert debugger.llm.model == "groq/openai/gpt-oss-120b"

    reviewer = create_code_reviewer_agent(llm=mock_llm)
    assert reviewer.role == "code_reviewer"
    assert "independent code reviewer" in reviewer.backstory
    assert reviewer.llm.model == "groq/openai/gpt-oss-120b"

def test_task_context_and_original_code_wiring(mock_llm):
    """
    Validates architectural token optimization and context preservation:
    - Task 1 analyzes submitted code.
    - Task 2 receives Task 1 context AND original code.
    - Task 3 receives BOTH Task 1 and Task 2 context AND original code.
    """
    sample_code = "def add(a, b): return a - b"
    analyzer = create_code_analyzer_agent(llm=mock_llm)
    debugger = create_senior_debugger_agent(llm=mock_llm)
    reviewer = create_code_reviewer_agent(llm=mock_llm)

    task_analyze = create_analyze_task(analyzer, code=sample_code, language="python", focus="correctness")
    task_fix = create_fix_task(debugger, analyze_task=task_analyze, code=sample_code, language="python")
    task_review = create_review_task(reviewer, analyze_task=task_analyze, fix_task=task_fix, code=sample_code, language="python")

    assert task_fix.context == [task_analyze], "task_fix must have task_analyze in its context"
    assert task_review.context == [task_analyze, task_fix], "task_review must have BOTH task_analyze and task_fix in its context"
    assert sample_code in task_fix.description, "task_fix must preserve original source code"
    assert sample_code in task_review.description, "task_review must preserve original source code"

def test_code_review_crew_build(mock_llm):
    """Verify CodeReviewCrew correctly builds the 3-agent Crew with uniform Groq model."""
    orchestrator = CodeReviewCrew(
        code="def example(): return True",
        language="python",
        focus="security",
        llm=mock_llm
    )
    crew, t1, t2, t3 = orchestrator.build_crew()
    assert len(crew.agents) == 3
    assert len(crew.tasks) == 3
    assert crew.agents[0].role == "Code_Analyzer"
    assert crew.agents[1].role == "Senior_Debugger"
    assert crew.agents[2].role == "code_reviewer"
    for agent in crew.agents:
        assert agent.llm.model == "groq/openai/gpt-oss-120b"

def test_get_llm_factory_groq():
    """Verify get_llm factory produces Groq model and validates GROQ_API_KEY."""
    with patch.object(settings, "GROQ_API_KEY", "gsk_test_mock_key"):
        with patch.object(settings, "GROQ_MODEL", "openai/gpt-oss-120b"):
            llm = get_llm()
            assert llm.model == "groq/openai/gpt-oss-120b"
            assert "gemini" not in llm.model.lower()

def test_get_llm_factory_missing_key_error():
    """Verify get_llm raises ValueError if GROQ_API_KEY is not configured without fallback."""
    with patch.object(settings, "GROQ_API_KEY", None):
        with pytest.raises(ValueError) as excinfo:
            get_llm()
        assert "GROQ_API_KEY" in str(excinfo.value)
        assert "gemini" not in str(excinfo.value).lower()
