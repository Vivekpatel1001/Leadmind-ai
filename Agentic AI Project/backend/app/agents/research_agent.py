import asyncio
import re
from typing import List, Dict, Any
from backend.app.core.tracing import traceable
from backend.app.schemas.search import RequirementPayload
from backend.app.tools.google_places_tool import GooglePlacesTool
from backend.app.tools.apollo_tool import ApolloTool
from backend.app.tools.tavily_tool import TavilyTool

class ResearchAgent:
    """
    Agent 2 — Lead Research Agent
    Responsibilities:
    - Search live verified data sources:
      1. Google Places API (New) (Live worldwide commercial discovery with real phone, website, ratings)
      2. Apollo.io B2B Intelligence Tool
      3. Tavily AI Search API (Deep real-time web intelligence, contact extraction, verified URLs)
      4. Curated Verified Business Registry (Canada, UK, US, Global)
      5. OpenStreetMap Overpass live commercial registry
    - Maintain strict provenance and never invent contact details
    """

    @staticmethod
    def _matches_requested_domain(lead: Dict[str, Any], req: RequirementPayload) -> bool:
        """Reject provider results that do not describe the requested business domain."""
        industry = (req.industry or "").strip().lower()
        business_type = (req.business_type or "").strip().lower()
        if not industry or industry in {"commercial business", "general business", "commercial businesses"}:
            return True

        domain_terms = {
            "automotive": {
                "automotive", "auto", "car", "cars", "vehicle", "vehicles",
                "motor", "motors", "dealer", "dealership", "showroom", "tata",
            },
            "food & beverage": {
                "food", "restaurant", "restaurants", "cafe", "coffee", "bar",
                "bistro", "bakery", "dining", "catering", "hospitality", "kitchen",
            },
            "technology & software": {
                "software", "technology", "tech", "saas", "cloud", "app",
                "platform", "digital", "developer", "development", "it",
                "cyber", "data", "ai", "artificial intelligence",
            },
            "healthcare": {
                "health", "healthcare", "clinic", "medical", "dental",
                "doctor", "hospital", "wellness", "pharmacy",
            },
            "retail & local commerce": {
                "retail", "shop", "store", "fashion", "apparel", "clothing",
                "market", "ecommerce", "e-commerce", "jewelry",
            },
            "marketing & advertising": {
                "marketing", "advertising", "branding", "creative", "agency",
                "seo", "public relations", "social media",
            },
            "design & creative": {
                "design", "creative", "branding", "studio", "graphic",
                "illustration", "ux", "ui",
            },
            "media & entertainment": {
                "media", "entertainment", "film", "video", "animation",
                "production", "music", "podcast",
            },
        }
        terms = set(domain_terms.get(industry, set()))
        if not terms:
            terms.update(re.findall(r"[a-z0-9]+", f"{industry} {business_type}"))
        else:
            terms.update(re.findall(r"[a-z0-9]+", business_type))

        searchable_fields = ("business_name", "description", "website")
        if not str(lead.get("source") or "").startswith("Tavily"):
            searchable_fields = ("business_name", "business_type", "description", "website")
        searchable = " ".join(
            str(lead.get(field) or "")
            for field in searchable_fields
        ).lower().replace("&", " and ")
        searchable_tokens = set(re.findall(r"[a-z0-9]+", searchable))
        manufacturer_match = re.search(
            r"\b(nissan|toyota|hyundai|honda|ford|kia|mahindra|maruti(?: suzuki)?|"
            r"volkswagen|mg|skoda|renault|bmw|audi|mercedes(?:[- ]benz)?|tata)\b",
            business_type,
        )
        if manufacturer_match:
            manufacturer = manufacturer_match.group(1).lower()
            name_and_site = " ".join(
                str(lead.get(field) or "")
                for field in ("business_name", "website")
            ).lower()
            if manufacturer not in name_and_site:
                return False
            return any(
                term in name_and_site
                for term in ("dealer", "dealership", "showroom", "motors", "cars.")
            )

        specific_type_terms = {
            term for term in re.findall(r"[a-z0-9]+", business_type)
            if term in {"xerox", "zerox", "printing", "print", "photocopy"}
        }
        if specific_type_terms and not specific_type_terms.intersection(searchable_tokens):
            return False

        specific_type_groups = {
            "dental": {"dental", "dentist", "orthodont", "orthodontic"},
            "restaurant": {"restaurant", "cafe", "café", "bistro", "diner", "eatery"},
            "clinic": {"clinic", "medical", "doctor", "hospital", "healthcare"},
            "college": {"college", "university", "institute", "campus", "academy"},
            "university": {"university", "college", "institute", "campus", "academy"},
            "school": {"school", "academy", "education", "institute"},
            "saas": {"saas", "software", "platform", "cloud"},
            "software": {"software", "saas", "platform", "app", "technology", "tech"},
            "dealership": {"dealer", "dealership", "showroom", "motors"},
            "agency": {"agency", "agencies"},
            "printing": {"printing", "print", "xerox", "photocopy", "copy"},
        }
        requested_type_tokens = set(re.findall(r"[a-z0-9]+", business_type))
        if "college" in requested_type_tokens or "university" in requested_type_tokens:
            if re.search(r"\b(master|bachelor|phd|program|course|degree|admission|entrance)\b", searchable):
                return False
        for type_token, type_terms in specific_type_groups.items():
            if type_token in requested_type_tokens and not type_terms.intersection(searchable_tokens):
                return False

        return bool(terms.intersection(searchable_tokens)) or any(
            len(term.split()) > 1 and term in searchable for term in terms
        )

    @classmethod
    @traceable(name="2_ResearchAgent_collect", run_type="chain")
    async def collect_leads(cls, req: RequirementPayload) -> List[Dict[str, Any]]:
        raw_leads: List[Dict[str, Any]] = []

        # 1. Query Live Google Places API (New)
        places_task = GooglePlacesTool.search_businesses(
            country=req.country,
            city=req.city,
            region=req.region,
            industry=req.business_type or req.industry or "Commercial Business",
            service=req.service,
            limit=req.lead_count
        )

        # 2. Query Live Apollo.io B2B API
        apollo_task = ApolloTool.search_organizations(
            country=req.country,
            city=req.city,
            industry=req.industry or req.business_type or "Business",
            limit=req.lead_count
        )

        # 3. Query Live Tavily AI Web Intelligence API
        tavily_task = TavilyTool.search_businesses(
            country=req.country,
            city=req.city,
            region=req.region,
            industry=req.business_type or req.industry or "Commercial Business",
            service=req.service,
            limit=req.lead_count
        )

        # Execute live Google Places, Apollo, and Tavily tasks concurrently.
        # Do not mix in the bundled demo directory: it makes unrelated searches
        # look successful and is not evidence that a business matches the query.
        try:
            live_results = await asyncio.gather(places_task, apollo_task, tavily_task, return_exceptions=True)
            
            # Process Google Places leads
            if isinstance(live_results[0], list):
                for p_lead in live_results[0]:
                    name_low = p_lead["business_name"].lower()
                    if not any(ex.lower() in name_low for ex in req.exclusions):
                        raw_leads.append(p_lead)

            # Process Apollo leads
            if isinstance(live_results[1], list):
                for a_lead in live_results[1]:
                    name_low = a_lead["business_name"].lower()
                    if not any(ex.lower() in name_low for ex in req.exclusions):
                        raw_leads.append(a_lead)

            # Process Tavily leads
            if isinstance(live_results[2], list):
                for t_lead in live_results[2]:
                    name_low = t_lead["business_name"].lower()
                    if not any(ex.lower() in name_low for ex in req.exclusions):
                        raw_leads.append(t_lead)

        except Exception as e:
            print(f"[ResearchAgent] Live tool aggregation note: {e}")

        from backend.app.agents.qualification_agent import QualificationAgent

        # Apply strict country matching and contact filters
        filtered = []
        for lead in raw_leads:
            if not cls._matches_requested_domain(lead, req):
                continue

            # 1. Strict Geographic Accuracy filter
            if req.country and not QualificationAgent.is_strict_country_match(req.country, lead):
                continue
            if req.city:
                _, city_match = QualificationAgent.is_location_match(
                    req.country or "",
                    req.city,
                    lead.get("country") or "",
                    lead.get("city") or "",
                    lead.get("address") or "",
                    req.region or "",
                )
                if not city_match:
                    continue

            # 2. Contact preferences
            if req.must_have_email and (not lead.get("email") or lead.get("email") == "Not found"):
                continue
            if req.must_have_phone and (not lead.get("phone") or lead.get("phone") == "Not found"):
                continue
            if req.must_have_website and not lead.get("website"):
                continue
            filtered.append(lead)

        return filtered
