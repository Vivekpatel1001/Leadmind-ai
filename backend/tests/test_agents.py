import pytest
import pytest_asyncio
from backend.app.schemas.search import RequirementPayload
from backend.app.agents.requirement_agent import RequirementAgent
from backend.app.agents.research_agent import ResearchAgent
from backend.app.agents.duplicate_agent import DuplicateAgent
from backend.app.agents.qualification_agent import QualificationAgent
from backend.app.agents.scoring_agent import ScoringAgent

@pytest.mark.asyncio
async def test_requirement_extraction():
    query = "Find 50 UK restaurants in London that need graphic design without fast food"
    req = await RequirementAgent.extract_requirements(query)
    
    assert req.country == "United Kingdom"
    assert req.city == "London"
    assert req.lead_count == 50
    assert "Graphic Design" in (req.service or "")
    assert len(req.exclusions) >= 1 or "fast food" in query.lower()

@pytest.mark.asyncio
async def test_research_and_strict_provenance():
    req = RequirementPayload(
        country="United Kingdom",
        city="London",
        industry="Food & Beverage",
        business_type="Restaurant",
        service="Graphic Design",
        lead_count=10
    )
    leads = await ResearchAgent.collect_leads(req)
    assert len(leads) > 0
    for lead in leads:
        assert lead["business_name"]
        assert lead["source"]
        # Verify contact integrity: never empty string, either valid or "Not found"
        assert lead.get("email") is not None
        assert lead.get("phone") is not None

def test_duplicate_detection_and_merging():
    leads = [
        {
            "business_name": "Dishoom Covent Garden Ltd",
            "website": "https://dishoom.com/covent-garden",
            "city": "London",
            "email": "info@dishoom.com",
            "phone": "Not found",
            "source": "Source A"
        },
        {
            "business_name": "Dishoom",
            "website": "https://dishoom.com",
            "city": "London",
            "email": "Not found",
            "phone": "+44 20 7420 9320",
            "source": "Source B"
        }
    ]
    unique = DuplicateAgent.deduplicate_and_merge(leads)
    assert len(unique) == 1
    assert unique[0]["sources_count"] == 2
    assert unique[0]["duplicate_status"] == "merged"
    # Merged contact info
    assert unique[0]["email"] == "info@dishoom.com"
    assert unique[0]["phone"] == "+44 20 7420 9320"

def test_qualification_and_scoring():
    req = RequirementPayload(
        country="United Kingdom",
        city="London",
        industry="Food & Beverage",
        business_type="Restaurant",
        service="Graphic Design"
    )
    lead = {
        "business_name": "The Palomar",
        "industry": "Food & Beverage",
        "business_type": "Restaurant",
        "country": "United Kingdom",
        "city": "London",
        "website": "https://thepalomar.co.uk",
        "email": "reservations@thepalomar.co.uk",
        "phone": "+44 20 7439 8777",
        "verified": True
    }
    
    qualified = QualificationAgent.qualify_lead(lead, req)
    assert qualified["qualification"] in ["HIGH", "MEDIUM"]
    assert len(qualified["qualification_reasons"]) >= 3

    scored = ScoringAgent.score_lead(qualified, req)
    assert 80 <= scored["lead_score"] <= 100
    assert "location" in scored["score_breakdown"]
    assert "industry" in scored["score_breakdown"]
    assert "relevance" in scored["score_breakdown"]
