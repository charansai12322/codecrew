"""
Code Crew - Agent Definitions
Three specialized, cooperative software engineering agents:
1. Code_Analyzer - Software architect detecting bugs and root causes
2. Senior_Debugger - Senior engineer generating clean, runnable fixes
3. code_reviewer - Independent verification and edge-case tester
"""

import os
from typing import Optional, Any, List
import litellm
from crewai import Agent, LLM
from app.config import settings

# --- Groq Provider Message Compatibility Adapter ---
# CrewAI injects `cache_breakpoint: True` intended for Anthropic prompt caching.
# GroqCloud's OpenAPI schema strictly rejects unknown properties on system/user messages with 400 Bad Request.
# We integrate into LiteLLM's Groq provider transformation pipeline (GroqChatConfig)
# which already manages stripping unsupported cache directives for Groq endpoints.

def _sanitize_messages_for_groq(messages: Any) -> Any:
    """
    Sanitizes message payloads by removing Groq-incompatible cache flags (cache_breakpoint, cache_control).
    Does NOT mutate input message dictionaries in-place to protect shared-object caller state.
    """
    if not isinstance(messages, list):
        return messages
    cleaned = []
    for msg in messages:
        if isinstance(msg, dict) and ("cache_breakpoint" in msg or "cache_control" in msg):
            cleaned.append({k: v for k, v in msg.items() if k not in ("cache_breakpoint", "cache_control")})
        else:
            cleaned.append(msg)
    return cleaned

try:
    from litellm.llms.groq.chat.transformation import GroqChatConfig
    _orig_groq_remove_cache_flags = GroqChatConfig.remove_cache_control_flag_from_messages_and_tools

    def _groq_safe_remove_cache_flags(self, model: str, messages: list, tools: Optional[list] = None):
        msgs, tls = _orig_groq_remove_cache_flags(self, model=model, messages=messages, tools=tools)
        if isinstance(msgs, list):
            for i, msg in enumerate(msgs):
                if isinstance(msg, dict) and "cache_breakpoint" in msg:
                    msgs[i] = {k: v for k, v in msg.items() if k != "cache_breakpoint"}
        return msgs, tls

    GroqChatConfig.remove_cache_control_flag_from_messages_and_tools = _groq_safe_remove_cache_flags
except Exception:
    pass

def get_llm(
    api_key: Optional[str] = None,
    model_name: Optional[str] = None,
    max_tokens: Optional[int] = None
) -> LLM:
    """
    Constructs a verified LLM instance for CrewAI using GroqCloud.
    Model: openai/gpt-oss-120b
    CrewAI / LiteLLM format: 'groq/<model_name>'
    """
    key = api_key or settings.effective_api_key
    if not key or not str(key).strip():
        raise ValueError(
            "GROQ_API_KEY is not configured or is empty. "
            "Please configure GROQ_API_KEY in backend/.env to enable live agent reviews."
        )

    model = model_name or settings.GROQ_MODEL
    
    # CrewAI / LiteLLM expects 'groq/<model_name>' format for GroqCloud models
    formatted_model = model if model.startswith("groq/") else f"groq/{model}"
    
    # LiteLLM reads GROQ_API_KEY from environment or parameter
    clean_key = str(key).strip()
    os.environ["GROQ_API_KEY"] = clean_key
    
    return LLM(
        model=formatted_model,
        api_key=clean_key,
        max_tokens=max_tokens or settings.MAX_OUTPUT_TOKENS,
        temperature=0.1,
    )

def create_code_analyzer_agent(llm: Optional[LLM] = None) -> Agent:
    """
    AGENT 1 — Code Analyzer
    Inspects user-submitted code, understands intent, diagnoses all syntax,
    runtime, and logical bugs, and formats a concise Bug Analysis Report.
    """
    active_llm = llm or get_llm()
    return Agent(
        role="Code_Analyzer",
        goal="Analyze submitted code, understand intended functionality, and identify confirmed defects and root causes.",
        backstory="""You are a senior software architect specializing in defect diagnosis.
You accurately identify syntax errors, logical defects, runtime issues, and edge cases.
You produce concise, structured bug reports so the debugger can fix all identified issues.""",
        verbose=False,
        llm=active_llm,
        allow_delegation=False,
        tools=[]
    )

def create_senior_debugger_agent(llm: Optional[LLM] = None) -> Agent:
    """
    AGENT 2 — Senior Debugger
    Consumes the bug analysis report, fixes all identified bugs, preserves intended
    structure, and produces a complete, clean, runnable corrected implementation.
    """
    active_llm = llm or get_llm()
    return Agent(
        role="Senior_Debugger",
        goal="Produce clean, working, and minimal code corrections addressing reported bugs.",
        backstory="""You are a senior software engineer specialized in debugging and remediating code.
You write clean, runnable fixes with:
- A targeted fix for each confirmed bug
- Concise inline comments explaining changes
- Preservation of original intent and interface.""",
        verbose=False,
        llm=active_llm,
        allow_delegation=False,
        tools=[]
    )

def create_code_reviewer_agent(llm: Optional[LLM] = None) -> Agent:
    """
    AGENT 3 — Independent Code Reviewer
    Critically inspects both the original bug report and the proposed fix,
    tests mentally for regressions and edge cases, and provides a final verdict.
    """
    active_llm = llm or get_llm()
    return Agent(
        role="code_reviewer",
        goal="Independently verify fixed code against diagnosed bugs, test edge cases, and provide final verdict.",
        backstory="""You are a meticulous, independent code reviewer and QA architect.
You verify that all diagnosed bugs are fixed without regressions, check boundary conditions,
and output the final verified code and verification summary.""",
        verbose=False,
        llm=active_llm,
        allow_delegation=False,
        tools=[]
    )
