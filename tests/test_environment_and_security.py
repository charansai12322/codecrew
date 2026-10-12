import os
import json
import re
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent

def test_gitignore_existence():
    """Verify presence of .gitignore to prevent accidental credential commits."""
    gitignore_path = REPO_ROOT / ".gitignore"
    if not gitignore_path.exists():
        pytest.fail("CRITICAL/HIGH: .gitignore is missing from repository root. Sensitive .env files risk being committed.")

def test_no_hardcoded_secrets_in_repository():
    """Verify that no actual API keys (e.g. AIzaSy..., sk-...) are hardcoded in tracked files."""
    secret_patterns = [
        re.compile(r"AIzaSy[0-9A-Za-z-_]{33}"),  # Google API Key
        re.compile(r"sk-[0-9A-Za-z-_]{32,}"),   # OpenAI / generic secret
    ]
    
    with open(REPO_ROOT / "codereviewcrew.ipynb", "r", encoding="utf-8") as f:
        nb_text = f.read()
        
    for pat in secret_patterns:
        matches = pat.findall(nb_text)
        assert len(matches) == 0, f"Potential live API key detected in notebook: {matches}"

def test_environment_variables_configured():
    """Check whether execution environment has necessary credentials configured."""
    candidates = ["GROQ_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "sec1"]
    found = [k for k in candidates if os.getenv(k)]
    if not found:
        pytest.skip(f"No API keys configured locally among {candidates}. Live API execution is BLOCKED.")

def test_crewai_installed_in_environment():
    """Verify if CrewAI is installed in the active Python environment."""
    try:
        import crewai
    except ImportError:
        pytest.fail("crewai is not installed in the active Python environment. Local Crew execution is BLOCKED.")

def test_google_colab_isolated_from_local_code():
    """Confirm that code running locally does not rely on google.colab package."""
    try:
        import google.colab
        pytest.fail("google.colab is unexpectedly installed or importable.")
    except ImportError:
        # Expected behavior outside Google Colab
        pass
