from typing import Dict, Any
from backend.app.core.tracing import traceable
from backend.app.schemas.search import RequirementPayload
from backend.app.agents.qualification_agent import QualificationAgent
from backend.app.core.config import settings

class ScoringAgent:
    """
    Agent 4 — Lead Scoring Agent
    Responsibilities:
    - Compute transparent 0-100 score based on configurable weights
    - Location Match (25%)
    - Industry Match (25%)
    - Business Relevance (25%)
    - Data Completeness (15%)
    - Other Criteria (10%)
    """

    @classmethod
    @traceable(name="5_ScoringAgent_score", run_type="chain")
    def score_lead(cls, lead: Dict[str, Any], req: RequirementPayload) -> Dict[str, Any]:
        # 1. Location Score (0-25)
        c_match, city_match = QualificationAgent.is_location_match(
            req.country or "",
            req.city or "",
            lead.get("country") or "",
            lead.get("city") or "",
            lead.get("address") or "",
            req.region or ""
        )

        location_score = 0
        if c_match:
            if city_match:
                location_score = 25  # Direct pinpoint city/locality match
            elif req.city:
                location_score = 12  # Same region but different city
            else:
                location_score = 20  # Country match with no specific city requested
        else:
            if req.country:
                location_score = 0
            else:
                location_score = 8

        # 2. Industry Match Score (0-25)
        target_ind = (req.industry or req.business_type or "").lower()
        lead_ind = (lead.get("industry") or "").lower()
        lead_type = (lead.get("business_type") or "").lower()

        industry_score = 0
        if target_ind in lead_ind or target_ind in lead_type or lead_ind in target_ind or target_ind in ["general business", "retail & local commerce"]:
            industry_score = 25
        else:
            industry_score = 16

        # 3. Business Relevance Score (0-25)
        relevance_score = 15
        if lead.get("website"):
            relevance_score += 6
        if lead.get("description"):
            relevance_score += 4

        # 4. Data Completeness Score (0-15)
        data_quality_score = 0
        if lead.get("email") and lead.get("email") != "Not found":
            data_quality_score += 7
        if lead.get("phone") and lead.get("phone") != "Not found":
            data_quality_score += 4
        if lead.get("website"):
            data_quality_score += 4

        # 5. Other Criteria (0-10)
        other_score = 0
        if lead.get("verified", True):
            other_score += 5
        if lead.get("sources_count", 1) > 1:
            other_score += 3
        else:
            other_score += 2

        total = int(
            (location_score * (settings.SCORE_WEIGHT_LOCATION / 0.25)) +
            (industry_score * (settings.SCORE_WEIGHT_INDUSTRY / 0.25)) +
            (relevance_score * (settings.SCORE_WEIGHT_RELEVANCE / 0.25)) +
            (data_quality_score * (settings.SCORE_WEIGHT_DATA_QUALITY / 0.15)) +
            (other_score * (settings.SCORE_WEIGHT_OTHER / 0.10))
        )
        total = max(10, min(99, total))

        lead["lead_score"] = total
        lead["score_breakdown"] = {
            "location": min(25, location_score),
            "industry": min(25, industry_score),
            "relevance": min(25, relevance_score),
            "data_quality": min(15, data_quality_score),
            "other": min(10, other_score),
            "total": total
        }

        return lead
