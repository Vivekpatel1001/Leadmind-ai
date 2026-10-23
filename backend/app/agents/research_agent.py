import asyncio
from typing import List, Dict, Any
from backend.app.core.tracing import traceable
from backend.app.schemas.search import RequirementPayload
from backend.app.tools.google_places_tool import GooglePlacesTool
from backend.app.tools.apollo_tool import ApolloTool
from backend.app.tools.tavily_tool import TavilyTool
from backend.app.tools.directory_tool import DirectoryTool
from backend.app.tools.osm_tool import OSMTool

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
    - Maintain strict provenance and zero hallucination of contact details
    """

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
            industry=req.industry or req.business_type or "Commercial Business",
            service=req.service,
            limit=req.lead_count
        )

        # 4. Query Curated Authentic Directory
        dir_leads = DirectoryTool.get_matching_leads(
            country=req.country,
            city=req.city,
            industry=req.industry or req.business_type,
            exclusions=req.exclusions
        )
        raw_leads.extend(dir_leads)

        # Execute live Google Places, Apollo, and Tavily tasks concurrently
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

        # 5. If more leads needed, query OpenStreetMap Overpass
        if len(raw_leads) < req.lead_count:
            try:
                osm_leads = await OSMTool.search_places(
                    city=req.city,
                    country=req.country or "Canada",
                    industry_query=req.business_type or req.industry or "restaurant",
                    limit=req.lead_count
                )
                for ol in osm_leads:
                    name_low = ol["business_name"].lower()
                    if not any(ex.lower() in name_low for ex in req.exclusions):
                        raw_leads.append(ol)
            except Exception as e:
                print(f"[ResearchAgent] OSM fallback note: {e}")

        from backend.app.agents.qualification_agent import QualificationAgent

        # Apply strict country matching and contact filters
        filtered = []
        for lead in raw_leads:
            # 1. Strict Geographic Accuracy filter
            if req.country and not QualificationAgent.is_strict_country_match(req.country, lead):
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
