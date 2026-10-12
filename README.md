# Code Crew — Multi-Agent Automated Code Review & Debugging System

Code Crew is an automated code review, debugging, and verification engine powered by **CrewAI**, **GroqCloud (`openai/gpt-oss-120b`)**, **FastAPI**, and **React 19 / TypeScript**.

The project originated as an experimental Google Colab prototype ([codereviewcrew.ipynb](file:///c:/Users/chara/OneDrive/Desktop/projects/codecrew/codecrew/codereviewcrew.ipynb)) and has been migrated into an enterprise-grade, decoupled backend and frontend application with comprehensive automated testing and static syntax verification.

---

## Architecture Overview

Code Crew coordinates a sequential cooperative workflow between three specialized AI agents:

```
[User Source Code] 
       │
       ▼
1. Code_Analyzer (Software Architect) ──> Diagnoses syntax, runtime, and logic bugs
       │                                  Produces: Bug Analysis Report
       ▼
2. Senior_Debugger (Senior Engineer)   ──> Fixes all identified bugs in code
       │                                  Produces: Complete Runnable Remediated Code
       ▼
3. code_reviewer (Test Architect)      ──> Independently verifies fixes & edge cases
       │                                  Produces: Final Verification Verdict & Code
       ▼
[Pydantic Structured Output & AST Syntax Validation]
```

---

## Repository Structure

```
codecrew/
├── backend/                  # FastAPI & CrewAI backend service
│   ├── app/
│   │   ├── agents.py         # 3 specialized CrewAI agent definitions (GroqCloud openai/gpt-oss-120b)
│   │   ├── tasks.py          # Sequential task definitions with explicit context
│   │   ├── crew.py           # Crew orchestrator with exponential backoff & retries
│   │   ├── config.py         # Pydantic settings & environment secret manager
│   │   ├── schemas.py        # Pydantic request/response schemas
│   │   ├── main.py           # FastAPI REST API (GET /api/health, POST /api/review)
│   │   └── services/         # AST syntax validation & review service orchestration
│   ├── tests/                # Pytest suite for backend endpoints, schemas, and agents
│   ├── requirements.txt      # Pinned backend dependencies
│   ├── .env.example          # Backend environment configuration template
│   └── README.md
├── frontend/                 # React 19 + TypeScript + Vite developer interface
│   ├── src/
│   │   ├── components/       # Dual-pane code editor, results tabs, pipeline status
│   │   ├── services/api.ts   # Typed API client with error & timeout handling
│   │   ├── types/            # Strict TypeScript data models
│   │   └── App.tsx           # Main application workspace layout
│   ├── tests/                # Vitest unit and contract tests
│   ├── package.json          # Frontend dependencies & build scripts
│   ├── .env.example          # Frontend environment configuration template
│   └── README.md
├── audit/                    # Phase 1 audit deliverables
│   ├── PHASE_1_AUDIT_REPORT.md
│   ├── FINDINGS.md
│   └── TEST_MATRIX.md
├── tests/                    # Root migration & regression test suite (29 tests)
├── codereviewcrew.ipynb      # Original Google Colab prototype notebook (preserved)
├── .gitignore                # Global ignore rules protecting secrets and caches
└── README.md                 # Project documentation
```

---

## Quickstart & Local Execution

### Prerequisites
- **Python:** Python 3.12 (Tested on `Python 3.12.10` on Windows x64)
- **Node.js:** Node.js v24 (Tested on `Node.js v24.18.0` & `npm 11.16.0`)
- **API Key:** GroqCloud API Key (`GROQ_API_KEY`)

---

### Step 1: Start the Backend Service

1. Open a terminal in the `backend/` directory:
   ```powershell
   cd backend
   ```
2. Set up the virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   ```
3. Configure your API key:
   ```powershell
   cp .env.example .env
   # Edit .env and set GROQ_API_KEY=your_key_here
   ```
4. Start the FastAPI server:
   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   Backend will be reachable at: `http://localhost:8000` (Docs at `/docs`).

---

### Step 2: Start the Frontend Application

1. Open a second terminal in the `frontend/` directory:
   ```powershell
   cd frontend
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Start the Vite development server:
   ```powershell
   npm run dev
   ```
   Frontend will be reachable at: `http://localhost:5173`.

---

## Running Automated Test Suites

### 1. Backend Automated Tests (Pytest)
```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -v tests/
```
*Result: 35 passed out of 35 tests.*

### 2. Frontend Automated Tests (Vitest)
```powershell
cd frontend
npm test
```
*Result: 7 passed out of 7 tests.*

### 3. Frontend Quality & Build Checks
```powershell
cd frontend
npm run lint      # Oxlint: 0 errors, 0 warnings
npm run build     # Production compilation with Vite
```

### 4. Root Migration & Regression Tests
```powershell
.\backend\.venv\Scripts\python.exe -m pytest -v tests/
```
*Result: 28 passed, 1 skipped (live key check) out of 29 tests.*

---

## Security Best Practices
- No API keys or credentials are hardcoded anywhere in the codebase.
- `.env` files are ignored by `.gitignore` in the root, backend, and frontend directories.
- AST parsing is strictly static and safe: arbitrary submitted code is never executed via `eval` or `exec`.
- Sanitized error responses prevent stack traces or credentials from leaking in HTTP responses.