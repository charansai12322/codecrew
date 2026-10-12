# Code Crew — Groq Testing & Verification Guide

This document explains how to run the automated test suite, verify offline mock coverage, and safely execute opt-in live integration tests against GroqCloud.

---

## 1. Environment & Configuration Prerequisites

### Required Environment Variables

All configuration is managed in `backend/.env` (which is excluded from Git via `.gitignore`):

| Variable | Description | Default | Example |
|---|---|---|---|
| `GROQ_API_KEY` | GroqCloud API key | None | `gsk_...` (Never commit or print) |
| `GROQ_MODEL` | Target Groq model identifier | `openai/gpt-oss-120b` | `openai/gpt-oss-120b` |
| `ENVIRONMENT` | Runtime environment | `development` | `development` / `production` |
| `CORS_ORIGINS` | JSON list of allowed origins | `["http://localhost:5173"]` | `["http://localhost:5173"]` |

> **Security Rule:** Never commit `.env` or paste actual API key values in issue trackers, logs, or commit messages.

### Python Environment Setup

```bash
cd backend
# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Verify installed packages
python -m pip list
```

---

## 2. Automated Offline Test Suite (Default)

The primary test suite is completely **offline and deterministic**. It mocks all Groq and CrewAI network calls, ensuring that continuous integration pipelines never require API keys or incur token costs.

### Running Backend Tests (61 Tests)

```bash
cd backend
.\.venv\Scripts\python.exe -m pytest -v tests/
```

### Running Root Architecture & Notebook Regression Tests (29 Tests)

```bash
# From repository root
.\backend\.venv\Scripts\python.exe -m pytest -v tests/
```

### Running Frontend Tests (7 Tests)

```bash
cd frontend
npm test -- --run
```

### Running the Entire Offline Suite (97 Tests)

```bash
# 1. Backend tests
cd backend && .\.venv\Scripts\python.exe -m pytest -v tests/
# 2. Root regression tests
cd .. && .\backend\.venv\Scripts\python.exe -m pytest -v tests/
# 3. Frontend tests
cd frontend && npm test -- --run
```

---

## 3. Opt-in Live Groq Integration Testing

Live network tests against Groq are **opt-in only** and explicitly guarded behind the `RUN_LIVE_GROQ_TESTS=1` environment variable flag.

### Prerequisites for Live Testing

1. Ensure a valid `GROQ_API_KEY` is present in `backend/.env`.
2. Confirm the key has active access to `openai/gpt-oss-120b`.

### Executing Live Provider Connectivity Test

```bash
cd backend

# Windows PowerShell:
$env:RUN_LIVE_GROQ_TESTS="1"
.\.venv\Scripts\python.exe -m pytest -v -k "test_live_groq_provider_connectivity" tests/test_groq_deep_audit.py

# Bash / Linux / macOS:
export RUN_LIVE_GROQ_TESTS=1
python -m pytest -v -k "test_live_groq_provider_connectivity" tests/test_groq_deep_audit.py
```

### Executing End-to-End Live Crew Workflow Test

A standalone scratch verification script is provided to test the live 3-agent pipeline against Groq:

```bash
cd backend
.\.venv\Scripts\python.exe -c "
import asyncio, os
from dotenv import load_dotenv
load_dotenv('.env')
from app.crew import CodeReviewCrew

async def run():
    crew = CodeReviewCrew(code='def add(a, b): return a - b', language='python', focus='bugs')
    res = await crew.kickoff_resilient()
    print('Status:', res['status'])
    print('Execution time:', res['execution_time_seconds'], 's')
    print('Analysis report:', res['analysis_report'][:150])
    print('Proposed code:\n', res['proposed_code'])
    print('Review findings:', res['review_findings'][:150])

asyncio.run(run())
"
```

---

## 4. Test Categories & Coverage Map

| Test File | Category | Focus |
|---|---|---|
| `backend/tests/test_groq_deep_audit.py` | Groq Deep Audit & Edge Cases | Provider auth, 400/401/403/429/502/503/504 errors, unicode, boundary limits, sanitized endpoints, live test |
| `backend/tests/test_api_endpoints.py` | API Contracts | FastAPI endpoints, schema validation, HTTP error status codes, CORS |
| `backend/tests/test_crew_resilience.py` | Workflow Resilience | Bounded exponential backoff, transient vs permanent errors, partial workflow failure detection |
| `backend/tests/test_agents_and_tasks.py` | Agent Structure | Agent roles, task dependencies, model assignment, LLM factory |
| `backend/tests/test_health_and_schemas.py` | Health & AST | AST syntax checking, schema validation, code block extraction |
| `tests/test_reviewed_code_and_fixes.py` | Functional Fixes | Verification of original Colab bugs (`calculate_average`, `find_max`, `remove_duplicates`) and Senior Debugger repairs |
| `tests/test_environment_and_security.py` | Security & Environment | Gitignore integrity, secret isolation, Colab separation |
| `tests/test_notebook_structure_and_syntax.py` | Notebook Preservation | AST and JSON integrity of `codereviewcrew.ipynb` |
| `frontend/tests/api.test.ts` | Frontend Client | API client request formatting, timeout handling, error propagation |

---

## 5. Scope & Limitations

- **Bounded Concurrency:** Groq enforces strict rate limits per minute (RPM) and tokens per minute (TPM). Never run unbounded load tests or parallel benchmark scripts against live credentials.
- **Deterministic CI:** Automated CI runners should keep `RUN_LIVE_GROQ_TESTS=0` (the default) to prevent spurious test failures due to upstream network fluctuations.
