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
        def present(value: Any) -> bool:
            return bool(value and str(value).strip() and str(value).strip().lower() != "not found")

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
        if target_ind and QualificationAgent.industry_matches(target_ind, lead):
            industry_score = 25
        elif not target_ind or target_ind in ["general business", "retail & local commerce"]:
            industry_score = 15
        else:
            industry_score = 0

        # 3. Business Relevance Score (0-25)
        relevance_score = 4
        if present(lead.get("website")):
            relevance_score += 8
        if present(lead.get("description")):
            relevance_score += 6
        if target_ind and QualificationAgent.industry_matches(target_ind, lead):
            relevance_score += 7

        # 4. Data Completeness Score (0-15)
        data_quality_score = 0
        if present(lead.get("email")):
            data_quality_score += 7
        if present(lead.get("phone")):
            data_quality_score += 4
        if present(lead.get("website")):
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
        lead["score_breakdown"]["query_fit"] = min(25, industry_score)
        lead["qualification_reasons"] = list(lead.get("qualification_reasons") or [])
        lead["qualification_reasons"].append(
            f"Score {total}/100: {lead['score_breakdown']['query_fit']}/25 query fit, "
            f"{lead['score_breakdown']['data_quality']}/15 data completeness"
        )

        return lead
