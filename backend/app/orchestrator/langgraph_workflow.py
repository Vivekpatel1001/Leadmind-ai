import os
from typing import Dict, Any, List, Optional, TypedDict
from dotenv import load_dotenv

load_dotenv()

from backend.app.core.tracing import traceable

from backend.app.schemas.search import RequirementPayload
from backend.app.schemas.outreach import PitchRequest
from backend.app.agents.requirement_agent import RequirementAgent
from backend.app.agents.research_agent import ResearchAgent
from backend.app.agents.duplicate_agent import DuplicateAgent
from backend.app.agents.qualification_agent import QualificationAgent
from backend.app.agents.scoring_agent import ScoringAgent
from backend.app.agents.enrichment_agent import EnrichmentAgent
from backend.app.agents.pitch_agent import PitchAgent
from backend.app.agents.crm_agent import CrmAgent
from backend.app.agents.outreach_agent import OutreachAgent

class LeadGenGraphState(TypedDict, total=False):
    query: str
    user_id: str
    user_preferences: Optional[Dict[str, Any]]
    requirements: Optional[Dict[str, Any]]
    raw_leads: List[Dict[str, Any]]
    unique_leads: List[Dict[str, Any]]
    final_leads: List[Dict[str, Any]]
    high_count: int
    medium_count: int
    low_count: int
    excluded_count: int
    status: str
    error: Optional[str]

@traceable(name="1_requirement_understanding_node", run_type="chain")
async def requirement_understanding_node(state: LeadGenGraphState) -> LeadGenGraphState:
    query = state.get("query", "")
    user_prefs = state.get("user_preferences")
    req = await RequirementAgent.extract_requirements(query, user_prefs)
    return {
        **state,
        "requirements": req.model_dump(),
        "status": "requirements_parsed"
    }

@traceable(name="2_lead_research_node", run_type="tool")
async def lead_research_node(state: LeadGenGraphState) -> LeadGenGraphState:
    req_dict = state.get("requirements", {})
    req = RequirementPayload(**req_dict)
    raw_leads = await ResearchAgent.collect_leads(req)
    return {
        **state,
        "raw_leads": raw_leads,
        "status": "leads_collected"
    }

@traceable(name="3_duplicate_detection_node", run_type="chain")
def duplicate_detection_node(state: LeadGenGraphState) -> LeadGenGraphState:
    raw_leads = state.get("raw_leads", [])
    unique_leads = DuplicateAgent.deduplicate_and_merge(raw_leads)
    return {
        **state,
        "unique_leads": unique_leads,
        "status": "leads_deduplicated"
    }

@traceable(name="4_qualification_and_scoring_node", run_type="chain")
def qualification_and_scoring_node(state: LeadGenGraphState) -> LeadGenGraphState:
    req_dict = state.get("requirements", {})
    req = RequirementPayload(**req_dict)
    unique_leads = state.get("unique_leads", [])
    
    high_count = 0
    med_count = 0
    low_count = 0
    scored_leads = []

    for lead in unique_leads[:req.lead_count]:
        lead = QualificationAgent.qualify_lead(lead, req)
        lead = ScoringAgent.score_lead(lead, req)
        
        # Set default CRM stage
        lead["crm_stage"] = "Discovered"
        
        if lead["qualification"] == "HIGH":
            high_count += 1
        elif lead["qualification"] == "MEDIUM":
            med_count += 1
        else:
            low_count += 1
            
        scored_leads.append(lead)

    scored_leads.sort(key=lambda x: x.get("lead_score", 0), reverse=True)

    return {
        **state,
        "final_leads": scored_leads,
        "high_count": high_count,
        "medium_count": med_count,
        "low_count": low_count,
        "status": "leads_scored"
    }

@traceable(name="7_enrichment_node", run_type="chain")
async def enrichment_node(state: LeadGenGraphState) -> LeadGenGraphState:
    leads = state.get("final_leads", [])
    # Enrich top 5 high priority leads automatically
    for lead in leads[:5]:
        if not lead.get("decision_makers"):
            dm = await EnrichmentAgent.enrich_lead(lead)
            lead["decision_makers"] = dm
            lead["crm_stage"] = "Enriched"

    return {
        **state,
        "final_leads": leads,
        "status": "leads_enriched"
    }

try:
    from langgraph.graph import StateGraph, START, END
    def create_lead_gen_graph():
        builder = StateGraph(LeadGenGraphState)
        builder.add_node("requirement_understanding", requirement_understanding_node)
        builder.add_node("lead_research", lead_research_node)
        builder.add_node("duplicate_detection", duplicate_detection_node)
        builder.add_node("qualification_and_scoring", qualification_and_scoring_node)
        builder.add_node("enrichment", enrichment_node)
        
        builder.add_edge(START, "requirement_understanding")
        builder.add_edge("requirement_understanding", "lead_research")
        builder.add_edge("lead_research", "duplicate_detection")
        builder.add_edge("duplicate_detection", "qualification_and_scoring")
        builder.add_edge("qualification_and_scoring", "enrichment")
        builder.add_edge("enrichment", END)
        return builder.compile()
    lead_gen_langgraph = create_lead_gen_graph()
except Exception as e:
    print(f"[LangGraph] Note: {e}")
    lead_gen_langgraph = None

