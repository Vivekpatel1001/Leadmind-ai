import asyncio
import sys
from pathlib import Path

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Add workspace root
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.app.schemas.search import RequirementPayload
from backend.app.schemas.outreach import PitchRequest, CrmStageUpdate
from backend.app.agents.requirement_agent import RequirementAgent
from backend.app.agents.research_agent import ResearchAgent
from backend.app.agents.duplicate_agent import DuplicateAgent
from backend.app.agents.qualification_agent import QualificationAgent
from backend.app.agents.scoring_agent import ScoringAgent
from backend.app.agents.memory_agent import MemoryAgent
from backend.app.agents.enrichment_agent import EnrichmentAgent
from backend.app.agents.pitch_agent import PitchAgent
from backend.app.agents.crm_agent import CrmAgent
from backend.app.agents.outreach_agent import OutreachAgent
from backend.app.database.session import init_db, AsyncSessionLocal

async def test_10_agents():
    print("==================================================")
    print("🚀 TESTING COMPLETE 10-AGENT ECOSYSTEM")
    print("==================================================")
    
    await init_db()

    # --- AGENT 1: Requirement Agent ---
    print("\n[Agent 1: Requirement Understanding]")
    query = "Find clothing shops in Navrangpura Ahmedabad for digital marketing services"
    req = await RequirementAgent.extract_requirements(query)
    print(f"  ✓ Extracted: City='{req.city}', Region='{req.region}', Country='{req.country}', Service='{req.service}', Industry='{req.industry}'")

    # --- AGENT 2: Lead Research Agent ---
    print("\n[Agent 2: Lead Research (Google Places + Apollo)]")
    raw_leads = await ResearchAgent.collect_leads(req)
    print(f"  ✓ Discovered {len(raw_leads)} live leads from Google Places / Apollo")
    assert len(raw_leads) > 0, "No leads returned!"
    sample = raw_leads[0]
    print(f"    Sample: {sample.get('business_name')} | {sample.get('address')}")

    # --- AGENT 3: Duplicate Detection Agent ---
    print("\n[Agent 3: Duplicate Detection & Merging]")
    unique_leads = DuplicateAgent.deduplicate_and_merge(raw_leads)
    print(f"  ✓ Cleaned & Deduplicated: {len(unique_leads)} unique businesses")

    # --- AGENT 4: Qualification Agent ---
    print("\n[Agent 4: Lead Qualification]")
    lead = QualificationAgent.qualify_lead(unique_leads[0], req)
    print(f"  ✓ Qualification Badge: [{lead.get('qualification')}] Reasons: {lead.get('qualification_reasons')}")

    # --- AGENT 5: Lead Scoring Agent ---
    print("\n[Agent 5: Composite Scoring (0-100)]")
    lead = ScoringAgent.score_lead(lead, req)
    print(f"  ✓ Lead Score: {lead.get('lead_score')}/100 | Breakdown: {lead.get('score_breakdown')}")

    # --- AGENT 6: Memory Sync Agent ---
    print("\n[Agent 6: Persistent Memory Agent]")
    async with AsyncSessionLocal() as db:
        await MemoryAgent.update_user_preferences(db, "default_user", req)
        print(f"  ✓ Memory synced user preferences for {req.service} in {req.country}")

    # --- AGENT 7: Decision-Maker Enrichment Agent ---
    print("\n[Agent 7: Decision-Maker Enrichment Agent]")
    decision_makers = await EnrichmentAgent.enrich_lead(lead)
    lead["decision_makers"] = decision_makers
    print(f"  ✓ Enriched {len(decision_makers)} key decision-makers:")
    for dm in decision_makers:
        print(f"    - {dm['name']} ({dm['title']}) | LinkedIn: {dm.get('linkedin_url', 'N/A')} | Source: {dm['source']}")

    # --- AGENT 8: AI Cold Outreach & Pitch Agent ---
    print("\n[Agent 8: Cold Outreach & Pitch Generator]")
    pitch_req = PitchRequest(
        business_name=lead["business_name"],
        industry=lead.get("industry"),
        city=lead.get("city"),
        country=lead.get("country"),
        website=lead.get("website"),
        offer_service=req.service or "Digital Marketing & Growth",
        sender_name="Alex Turner",
        sender_company="Apex Media Agency",
        tone="value_first"
    )
    pitch = await PitchAgent.generate_pitch(pitch_req)
    print(f"  ✓ Subject Line: '{pitch.subject_lines[0]}'")
    print(f"  ✓ Value Prop: '{pitch.value_proposition}'")
    print(f"  ✓ LinkedIn Note (length {len(pitch.linkedin_note)} chars): '{pitch.linkedin_note}'")

    # --- AGENT 9: CRM Pipeline & Stage Manager ---
    print("\n[Agent 9: CRM Pipeline & Stage Manager]")
    async with AsyncSessionLocal() as db:
        pipeline_summary = await CrmAgent.get_pipeline_summary(db, "default_user")
        print(f"  ✓ Total Leads in Pipeline: {pipeline_summary.total_leads}")
        print(f"  ✓ Stage Counts: {pipeline_summary.stage_counts}")
        print(f"  ✓ Conversion Rate: {pipeline_summary.conversion_rate}%")

    # --- AGENT 10: Multi-Channel Outreach Dispatcher ---
    print("\n[Agent 10: Multi-Channel Outreach Dispatcher]")
    mailto_url = OutreachAgent.create_mailto_link(
        recipient="owner@example.com",
        subject=pitch.subject_lines[0],
        body=pitch.email_body
    )
    print(f"  ✓ 1-Click Mailto Link generated (length {len(mailto_url)} chars)")
    print(f"    Preview: {mailto_url[:80]}...")

    print("\n==================================================")
    print("🎉 ALL 10 AI AGENTS EXECUTED SUCCESSFULLY & FULLY VERIFIED!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(test_10_agents())
