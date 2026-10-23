from fastapi import APIRouter, Body
from backend.app.core.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("")
async def get_settings():
    return {
        "scoring_weights": {
            "location": settings.SCORE_WEIGHT_LOCATION,
            "industry": settings.SCORE_WEIGHT_INDUSTRY,
            "relevance": settings.SCORE_WEIGHT_RELEVANCE,
            "data_quality": settings.SCORE_WEIGHT_DATA_QUALITY,
            "other": settings.SCORE_WEIGHT_OTHER
        },
        "has_tavily_key": bool(settings.TAVILY_API_KEY),
        "has_google_places_key": bool(settings.GOOGLE_MAPS_API_KEY),
        "has_apollo_key": bool(settings.APOLLO_API_KEY),
        "has_gemini_key": bool(settings.GEMINI_API_KEY),
        "has_openai_key": bool(settings.OPENAI_API_KEY),
        "has_groq_key": bool(settings.GROQ_API_KEY)
    }

@router.post("")
async def update_settings(payload: dict = Body(...)):
    weights = payload.get("scoring_weights", {})
    if "location" in weights:
        settings.SCORE_WEIGHT_LOCATION = float(weights["location"])
    if "industry" in weights:
        settings.SCORE_WEIGHT_INDUSTRY = float(weights["industry"])
    if "relevance" in weights:
        settings.SCORE_WEIGHT_RELEVANCE = float(weights["relevance"])
    if "data_quality" in weights:
        settings.SCORE_WEIGHT_DATA_QUALITY = float(weights["data_quality"])
    if "other" in weights:
        settings.SCORE_WEIGHT_OTHER = float(weights["other"])

    if "tavily_api_key" in payload and payload["tavily_api_key"]:
        settings.TAVILY_API_KEY = payload["tavily_api_key"]

    if "gemini_api_key" in payload and payload["gemini_api_key"]:
        settings.GEMINI_API_KEY = payload["gemini_api_key"]
        
    return {"status": "success", "message": "Settings updated successfully"}
