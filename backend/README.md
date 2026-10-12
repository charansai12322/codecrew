# Code Crew — Backend Service

A FastAPI-powered multi-agent automated code review and debugging backend engine built with CrewAI and GroqCloud (`openai/gpt-oss-120b`).

---

## Architecture & Agents

The service orchestrates a sequential 3-agent cooperative pipeline configured with GroqCloud:
1. **`Code_Analyzer`**: Diagnoses defects, syntax issues, runtime errors, and edge cases.
2. **`Senior_Debugger`**: Consumes the diagnosis and original code, fixes all bugs, and outputs clean, runnable code with `# FIX:` inline comments.
3. **`code_reviewer`**: Independently evaluates the fixes against original code and analysis, checks boundary conditions, and outputs the final verified verdict.

---

## Local Development & Setup

### 1. Requirements
- Python 3.12 (Supported runtime: `Python 3.12.10`)
- Valid GroqCloud API Key (`GROQ_API_KEY`)

### 2. Virtual Environment Setup
```powershell
# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install dependencies
python -m pip install -r requirements.txt
```

### 3. Configuration
Copy the template configuration and set your API key:
```powershell
cp .env.example .env
```
Edit `.env`:
```ini
GROQ_API_KEY=your_actual_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
CORS_ORIGINS=["http://localhost:5173"]
```

### 4. Running the Backend Server
```powershell
# Run using uvicorn via the virtual environment python
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The server will start at:
- API Base: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/api/health`

### 5. Running Automated Backend Tests
```powershell
.\.venv\Scripts\python.exe -m pytest -v tests/
```
