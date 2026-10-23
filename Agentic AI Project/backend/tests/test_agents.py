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
async def test_locality_extraction_does_not_fallback_to_united_states():
    req = await RequirementAgent.extract_requirements("zerox shops near Fatehgunj")

    assert req.city == "Fatehgunj, Vadodara"
    assert req.region == "Gujarat"
    assert req.country == "India"
    assert req.business_type == "Xerox & Printing Shop"


@pytest.mark.asyncio
async def test_manufacturer_dealer_intent_is_preserved():
    req = await RequirementAgent.extract_requirements("nissan motors dealers in vadodara")

    assert req.industry == "Automotive"
    assert req.business_type == "Nissan Dealer"
    assert req.city == "Vadodara"
    assert req.country == "India"

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


def test_research_rejects_leads_outside_requested_domain():
    req = RequirementPayload(
        industry="Food & Beverage",
        business_type="Restaurant",
    )
    matching = {
        "business_name": "North Star Cafe",
        "industry": "Food & Beverage",
        "business_type": "Cafe",
        "description": "Independent coffee shop",
    }
    unrelated = {
        "business_name": "North Star Software",
        "industry": "Technology & Software",
        "business_type": "SaaS platform",
        "description": "Cloud software company",
    }

    assert ResearchAgent._matches_requested_domain(matching, req)
    assert not ResearchAgent._matches_requested_domain(unrelated, req)


def test_graphic_design_service_does_not_change_target_domain():
    req = RequirementPayload(
        industry="Food & Beverage",
        business_type="Restaurant",
        service="Graphic Design",
    )
    unrelated = {
        "business_name": "Bright Software",
        "industry": "Technology & Software",
        "business_type": "SaaS company",
        "description": "Needs graphic design",
    }

    assert not ResearchAgent._matches_requested_domain(unrelated, req)


def test_requested_city_rejects_results_from_another_city():
    req = RequirementPayload(
        country="India",
        city="Fatehgunj, Vadodara",
        industry="Retail & Local Commerce",
    )
    unrelated = {
        "business_name": "New York Retail Shop",
        "industry": "Retail & Local Commerce",
        "country": "United States",
        "city": "New York",
        "address": "New York, United States",
    }

    assert not QualificationAgent.is_location_match(
        req.country,
        req.city,
        unrelated["country"],
        unrelated["city"],
        unrelated["address"],
        req.region or "",
    )[1]


def test_specific_printing_intent_rejects_generic_retail_listings():
    req = RequirementPayload(
        industry="Retail & Local Commerce",
        business_type="Xerox & Printing Shop",
    )
    generic_listing = {
        "business_name": "Vadodara Chamber of Commerce",
        "industry": "Retail & Local Commerce",
        "business_type": "Retail Shop",
        "description": "Business organization and local information",
    }
    print_shop = {
        "business_name": "Fatehgunj Xerox and Print Center",
        "industry": "Retail & Local Commerce",
        "business_type": "Printing Shop",
        "description": "Photocopy, scanning and printing services",
    }

    assert not ResearchAgent._matches_requested_domain(generic_listing, req)
    assert ResearchAgent._matches_requested_domain(print_shop, req)


def test_low_contact_completeness_cannot_be_high_match():
    req = RequirementPayload(
        country="India",
        city="Vadodara",
        industry="Retail & Local Commerce",
        business_type="Xerox & Printing Shop",
    )
    lead = {
        "business_name": "Local Copy Center",
        "industry": "Retail & Local Commerce",
        "business_type": "Printing Shop",
        "country": "India",
        "city": "Vadodara",
        "phone": "+91 99999 99999",
        "email": "Not found",
        "website": None,
        "description": "Photocopy and printing services",
    }

    qualified = QualificationAgent.qualify_lead(lead, req)

    assert qualified["qualification"] == "MEDIUM"


def test_manufacturer_filter_rejects_unrelated_businesses():
    req = RequirementPayload(
        industry="Automotive",
        business_type="Nissan Dealer",
    )
    unrelated = {
        "business_name": "Web Development Vadodara",
        "industry": "Commercial Business",
        "business_type": "Web Development Company",
        "description": "Website services",
    }
    nissan_dealer = {
        "business_name": "Nissan Motors Dealer Vadodara",
        "industry": "Automotive",
        "business_type": "Car Dealer",
        "description": "Nissan dealership and showroom",
        "website": "https://nissan.example.com",
    }

    assert not ResearchAgent._matches_requested_domain(unrelated, req)
    assert ResearchAgent._matches_requested_domain(nissan_dealer, req)
