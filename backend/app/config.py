import os
from pathlib import Path
from typing import List, Optional, Any
from pydantic import field_validator
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Search for .env in backend directory, then project root
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

class Settings(BaseSettings):
    """Application configuration and credentials management."""
    APP_NAME: str = "Code Crew API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    
    # GroqCloud Provider Settings
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    
    # Resilience & Timeouts
    REQUEST_TIMEOUT_SECONDS: int = 120
    MAX_RETRIES: int = 2
    RETRY_BACKOFF_FACTOR: float = 2.0
    REQUEST_PACING_SECONDS: float = 1.0
    MAX_OUTPUT_TOKENS: int = 4096
    
    # Input Validation Constraints
    MAX_CODE_LENGTH: int = 50000
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://codecrew-lemon-sigma.vercel.app"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    import json
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def effective_api_key(self) -> Optional[str]:
        """Resolves active GroqCloud API key."""
        return self.GROQ_API_KEY

    @property
    def is_configured(self) -> bool:
        """Indicates whether a valid GroqCloud API key is present."""
        key = self.effective_api_key
        return bool(key and key.strip())

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
