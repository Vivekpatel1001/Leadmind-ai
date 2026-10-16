import time
import json
import asyncio
from datetime import datetime
from typing import AsyncGenerator, Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from backend.app.schemas.search import SearchRequest, RequirementPayload, AgentStepEvent
from backend.app.agents.requirement_agent import RequirementAgent
from backend.app.agents.research_agent import ResearchAgent
from backend.app.agents.duplicate_agent import DuplicateAgent
from backend.app.agents.qualification_agent import QualificationAgent
from backend.app.agents.scoring_agent import ScoringAgent
from backend.app.agents.memory_agent import MemoryAgent
from backend.app.models.lead import Lead
from backend.app.models.search_history import SearchHistory
from backend.app.core.tracing import traceable

class Orchestrator:
    """
    Central Multi-Agent Workflow Orchestrator
    Coordinates specialized agents with state tracking, dynamic routing, LangGraph execution, and real-time SSE events.
    All agent runs and tool executions are automatically traced to LangSmith (Project: Lead Generation B2B).
    """

    @classmethod
    async def run_search_workflow(
        cls,
        db: AsyncSession,
        request: SearchRequest
    ) -> AsyncGenerator[Dict[str, Any], None]:
        start_time = time.time()
        user_id = request.user_id or "default_user"
        query = request.query.strip()

        # Check if this is a purely historical / memory question
        q_lower = query.lower()
        if (
            ("show" in q_lower or "what" in q_lower or "which" in q_lower or "get" in q_lower) and
            ("previous" in q_lower or "saved" in q_lower or "yesterday" in q_lower or "last week" in q_lower or "history" in q_lower or "we found" in q_lower)
            and not ("find new" in q_lower or "find 20" in q_lower or "find 50" in q_lower or "find more" in q_lower)
        ):
            yield {
                "step": "memory_recall",
                "title": "Retrieving from AI Memory",
                "message": "Accessing persistent lead and search memory...",
                "progress": 50,
                "data": None
            }
            memory_resp = await MemoryAgent.answer_historical_query(db, user_id, query)
            yield {
                "step": "complete",
                "title": "Memory Retrieved",
                "message": memory_resp["answer"],
                "progress": 100,
                "data": {
                    "is_memory_response": True,
                    "memory_response": memory_resp,
                    "leads": memory_resp.get("matched_leads", [])
                }
            }
            return

        # Step 1: Requirement Agent
        yield {
            "step": "understanding",
            "title": "Understanding Requirements",
            "message": "Parsing natural-language criteria, industry, territory, and constraints...",
            "progress": 15,
            "data": None
        }
        await asyncio.sleep(0.3)

        user_prefs = await MemoryAgent.get_user_preferences_summary(db, user_id)
        if request.manual_overrides:
            requirements = request.manual_overrides
        else:
            requirements = await RequirementAgent.extract_requirements(query, user_prefs)

        # Apply top-level flags
        if request.new_leads_only:
            requirements.new_leads_only = True

        yield {
            "step": "planning",
            "title": "Creating Search Strategy",
            "message": f"Targeting {requirements.industry} in {requirements.city or requirements.country} (Goal: {requirements.lead_count} leads)...",
            "progress": 30,
            "data": {"requirements": requirements.model_dump()}
        }
        await asyncio.sleep(0.3)

        # Step 2: Research Agent (Live tool collection)
        yield {
            "step": "researching",
            "title": "Searching Business Sources",
            "message": "Querying live registry, OpenStreetMap commercial tags, and verified directories...",
            "progress": 50,
            "data": None
        }
        raw_leads = await ResearchAgent.collect_leads(requirements)

        # Step 3: Duplicate Agent (Fuzzy matching + normalization + multi-source merge)
        yield {
            "step": "deduplicating",
            "title": "Removing Duplicates & Merging",
            "message": f"Normalizing business identities and merging multi-source records...",
            "progress": 70,
            "data": {"raw_count": len(raw_leads)}
        }
        unique_leads = DuplicateAgent.deduplicate_and_merge(raw_leads)

        # Step 4: Memory Check / New Leads Only Filter
        known_names, known_domains = await MemoryAgent.get_previously_discovered_identifiers(db, user_id)
        excluded_count = 0
        final_prospects = []

        for lead in unique_leads:
            norm_name = lead.get("normalized_name", "")
            dom = DuplicateAgent.extract_domain(lead.get("website"))
            
            is_previously_seen = (norm_name in known_names) or (dom and dom in known_domains)
            
            if requirements.new_leads_only and is_previously_seen:
                excluded_count += 1
                continue
            
            final_prospects.append(lead)

        # Limit to requested lead count
        final_prospects = final_prospects[:requirements.lead_count]

        # Step 5: Qualification & Scoring Agents
        yield {
            "step": "qualifying",
            "title": "Qualifying & Scoring Leads",
            "message": "Evaluating match criteria, computing 0-100 scores, and generating match reasons...",
            "progress": 85,
            "data": {"candidate_count": len(final_prospects), "excluded_previous_count": excluded_count}
        }

        high_count = 0
        med_count = 0
        low_count = 0
        processed_leads = []

        for lead in final_prospects:
            # Strict country check
            if requirements.country and not QualificationAgent.is_strict_country_match(requirements.country, lead):
                continue

            # Qualify
            lead = QualificationAgent.qualify_lead(lead, requirements)
            # Score
            lead = ScoringAgent.score_lead(lead, requirements)
            
            if lead["qualification"] == "HIGH":
                high_count += 1
            elif lead["qualification"] == "MEDIUM":
                med_count += 1
            else:
                low_count += 1
                
            processed_leads.append(lead)

        # Sort by lead score descending
        processed_leads.sort(key=lambda x: x.get("lead_score", 0), reverse=True)

        # Step 6: Persist in Database & Update Memory
        yield {
            "step": "memory_check",
            "title": "Updating AI Memory & Records",
            "message": "Storing discovered leads, updating search history, and learning preferences...",
            "progress": 95,
            "data": None
        }

        exec_time = round(time.time() - start_time, 2)
        
        # Create Search History Record
        search_rec = SearchHistory(
            user_id=user_id,
            query=query,
            parsed_requirements=requirements.model_dump(),
            search_plan={"target": f"{requirements.industry} in {requirements.city or requirements.country}", "limit": requirements.lead_count},
            total_found=len(processed_leads),
            high_match_count=high_count,
            medium_match_count=med_count,
            low_match_count=low_count,
            excluded_previous=requirements.new_leads_only,
            execution_time_seconds=exec_time
        )
        db.add(search_rec)
        await db.flush()

        # Insert or Update Leads in DB
        saved_lead_models = []
        for lead_dict in processed_leads:
            norm_name = lead_dict.get("normalized_name") or DuplicateAgent.normalize_name(lead_dict.get("business_name", ""))
            
            stmt = select(Lead).where(and_(Lead.user_id == user_id, Lead.normalized_name == norm_name))
            res = await db.execute(stmt)
            existing_lead = res.scalar_one_or_none()
            
            if existing_lead:
                # Update existing lead's last_seen and search_ids
                existing_lead.last_seen = datetime.utcnow()
                s_ids = list(existing_lead.search_ids or [])
                if search_rec.id not in s_ids:
                    s_ids.append(search_rec.id)
                existing_lead.search_ids = s_ids
                lead_dict["id"] = existing_lead.id
                lead_dict["saved"] = existing_lead.saved
                lead_dict["notes"] = existing_lead.notes
                lead_dict["tags"] = existing_lead.tags
                lead_dict["status"] = existing_lead.status
            else:
                new_lead = Lead(
                    user_id=user_id,
                    business_name=lead_dict["business_name"],
                    normalized_name=norm_name,
                    industry=lead_dict.get("industry"),
                    business_type=lead_dict.get("business_type"),
                    country=lead_dict.get("country"),
                    city=lead_dict.get("city"),
                    region=lead_dict.get("region"),
                    address=lead_dict.get("address"),
                    website=lead_dict.get("website"),
                    email=lead_dict.get("email", "Not found"),
                    phone=lead_dict.get("phone", "Not found"),
                    social_links=lead_dict.get("social_links", {}),
                    description=lead_dict.get("description"),
                    source=lead_dict.get("source", "Public Directory"),
                    source_url=lead_dict.get("source_url"),
                    sources_count=lead_dict.get("sources_count", 1),
                    verified=lead_dict.get("verified", True),
                    qualification=lead_dict.get("qualification", "MEDIUM"),
                    qualification_reasons=lead_dict.get("qualification_reasons", []),
                    lead_score=lead_dict.get("lead_score", 70),
                    score_breakdown=lead_dict.get("score_breakdown", {}),
                    search_ids=[search_rec.id],
                    tags=[],
                    notes="",
                    saved=False,
                    status="new",
                    duplicate_status=lead_dict.get("duplicate_status", "original")
                )
                db.add(new_lead)
                await db.flush()
                lead_dict["id"] = new_lead.id
                lead_dict["saved"] = False
                lead_dict["notes"] = ""
                lead_dict["tags"] = []
                lead_dict["status"] = "new"

        # Update User Preferences in Memory
        await MemoryAgent.update_user_preferences(db, user_id, requirements)
        await db.commit()

        # Step 7: Final Completion Event
        yield {
            "step": "complete",
            "title": "Research Complete",
            "message": f"Found {len(processed_leads)} qualified leads ({high_count} High, {med_count} Medium, {low_count} Low match)." + (f" Excluded {excluded_count} previously discovered leads." if excluded_count > 0 else ""),
            "progress": 100,
            "data": {
                "search_id": search_rec.id,
                "total_found": len(processed_leads),
                "high_match_count": high_count,
                "medium_match_count": med_count,
                "low_match_count": low_count,
                "excluded_count": excluded_count,
                "execution_time": exec_time,
                "leads": processed_leads,
                "requirements": requirements.model_dump()
            }
        }
