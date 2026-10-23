import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=(".env", "backend/.env"), extra="ignore")

    PROJECT_NAME: str = "Agentic AI Lead Generation Platform"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./leadgen.db")
    CORS_ORIGINS: List[str] = ["*"]
    
    # External Live Data APIs
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
    APOLLO_API_KEY: str = os.getenv("APOLLO_API_KEY", "")
    TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")

    # AI LLM Keys (optional)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    # Twilio Live Cellular Voice Calling
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")

    # Default Lead Scoring Weights
    SCORE_WEIGHT_LOCATION: float = 0.25
    SCORE_WEIGHT_INDUSTRY: float = 0.25
    SCORE_WEIGHT_RELEVANCE: float = 0.25
    SCORE_WEIGHT_DATA_QUALITY: float = 0.15
    SCORE_WEIGHT_OTHER: float = 0.10

settings = Settings()
