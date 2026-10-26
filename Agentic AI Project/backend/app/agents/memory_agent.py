from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from backend.app.core.tracing import traceable

from backend.app.models.lead import Lead
from backend.app.models.search_history import SearchHistory
from backend.app.models.memory import UserPreference, ConversationMemory
from backend.app.schemas.search import RequirementPayload

class MemoryAgent:
    """
    Agent 6 — Memory Agent
    Responsibilities:
    - User Preferences Tracking & Long-term Learning
    - Historical Search Semantic & Keyword Retrieval
    - Previously Discovered Lead Exclusions (New Leads Only)
    - Natural Language Historical Query Answering
    """

    @classmethod
    @traceable(name="6_MemoryAgent_update_preferences", run_type="chain")
    async def update_user_preferences(cls, db: AsyncSession, user_id: str, req: RequirementPayload):
        # Update country preference
        if req.country:
            await cls._increment_pref(db, user_id, "target_country", req.country, {"last_used": datetime.utcnow().isoformat()})
        
        # Update industry preference
        if req.industry:
            await cls._increment_pref(db, user_id, "preferred_industry", req.industry, {"last_used": datetime.utcnow().isoformat()})
            
        # Update service
        if req.service:
            await cls._increment_pref(db, user_id, "offered_service", req.service, {"last_used": datetime.utcnow().isoformat()})

        # Update typical count
        if req.lead_count:
            await cls._increment_pref(db, user_id, "typical_lead_count", str(req.lead_count), {"count": req.lead_count})

        await db.commit()

    @classmethod
    async def _increment_pref(cls, db: AsyncSession, user_id: str, category: str, key: str, value: Dict[str, Any]):
        stmt = select(UserPreference).where(
            and_(UserPreference.user_id == user_id, UserPreference.category == category, UserPreference.key == key)
        )
        res = await db.execute(stmt)
        pref = res.scalar_one_or_none()
        if pref:
            pref.frequency += 1
            pref.value = value
            pref.updated_at = datetime.utcnow()
        else:
            new_pref = UserPreference(
                user_id=user_id,
                category=category,
                key=key,
                value=value,
                frequency=1
            )
            db.add(new_pref)

    @classmethod
    async def get_user_preferences_summary(cls, db: AsyncSession, user_id: str) -> Dict[str, Any]:
        stmt = select(UserPreference).where(UserPreference.user_id == user_id).order_by(desc(UserPreference.frequency))
        res = await db.execute(stmt)
        prefs = res.scalars().all()
        
        summary = {
            "top_countries": [],
            "top_industries": [],
            "top_services": [],
            "preferences_list": []
        }
        for p in prefs:
            summary["preferences_list"].append({
                "id": p.id,
                "category": p.category,
                "key": p.key,
                "frequency": p.frequency,
                "value": p.value
            })
            if p.category == "target_country" and len(summary["top_countries"]) < 3:
                summary["top_countries"].append(p.key)
            elif p.category == "preferred_industry" and len(summary["top_industries"]) < 3:
                summary["top_industries"].append(p.key)
            elif p.category == "offered_service" and len(summary["top_services"]) < 2:
                summary["top_services"].append(p.key)

        return summary

    @classmethod
    async def get_previously_discovered_identifiers(cls, db: AsyncSession, user_id: str) -> Tuple[set, set]:
        """Returns sets of (normalized_names, normalized_domains) already known."""
        stmt = select(Lead.normalized_name, Lead.website).where(Lead.user_id == user_id)
        res = await db.execute(stmt)
        rows = res.all()
        
        names = set()
        domains = set()
        for norm_name, website in rows:
            if norm_name:
                names.add(norm_name)
            if website:
                clean_dom = website.lower().replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
                if clean_dom:
                    domains.add(clean_dom)

        return names, domains

    @classmethod
    @traceable(name="6_MemoryAgent_recall", run_type="chain")
    async def answer_historical_query(cls, db: AsyncSession, user_id: str, query: str) -> Dict[str, Any]:
        """
        Smart Historical Search & Memory Recall:
        Interprets: "Show my previous UK leads", "Show only the leads I saved", "What leads did we find yesterday?"
        """
        q_lower = query.lower()

        # 1. Saved leads query
        if "saved" in q_lower or "starred" in q_lower or "bookmarked" in q_lower:
            stmt = select(Lead).where(and_(Lead.user_id == user_id, Lead.saved == True)).order_by(desc(Lead.lead_score))
            res = await db.execute(stmt)
            leads = res.scalars().all()
            return {
                "answer": f"I found {len(leads)} leads currently saved in your workspace.",
                "intent": "saved_leads",
                "matched_leads": [cls._lead_to_dict(l) for l in leads],
                "suggested_action": "filter_saved"
            }

        # 2. Yesterday / Recent Searches
        if "yesterday" in q_lower or "recent" in q_lower or "previous search" in q_lower or "last week" in q_lower:
            stmt = select(SearchHistory).where(SearchHistory.user_id == user_id).order_by(desc(SearchHistory.created_at)).limit(5)
            res = await db.execute(stmt)
            searches = res.scalars().all()
            if searches:
                s_list = [{"id": s.id, "query": s.query, "total_found": s.total_found, "created_at": s.created_at.isoformat()} for s in searches]
                return {
                    "answer": f"Here are your recent searches. The latest was '{searches[0].query}' which discovered {searches[0].total_found} leads.",
                    "intent": "search_history",
                    "matched_searches": s_list,
                    "suggested_action": "open_search_history"
                }

        # 3. Location/Industry Historical Retrieval (e.g. "Show previous UK leads", "Leads from London")
        lead_stmt = select(Lead).where(Lead.user_id == user_id)
        if "uk" in q_lower or "united kingdom" in q_lower or "london" in q_lower:
            lead_stmt = lead_stmt.where(or_(Lead.country.ilike("%United Kingdom%"), Lead.city.ilike("%London%")))
        if "restaurant" in q_lower or "food" in q_lower:
            lead_stmt = lead_stmt.where(or_(Lead.industry.ilike("%Food%"), Lead.business_type.ilike("%Restaurant%")))

        lead_stmt = lead_stmt.order_by(desc(Lead.lead_score)).limit(30)
        res = await db.execute(lead_stmt)
        leads = res.scalars().all()

        if leads:
            return {
                "answer": f"Found {len(leads)} previously discovered leads in memory matching your query.",
                "intent": "historical_leads",
                "matched_leads": [cls._lead_to_dict(l) for l in leads],
                "suggested_action": "view_leads"
            }

        # 4. Fallback memory summary
        prefs = await cls.get_user_preferences_summary(db, user_id)
        return {
            "answer": "I retrieved your memory profile. You frequently search for " + 
                      (", ".join(prefs["top_industries"]) if prefs["top_industries"] else "commercial prospects") +
                      (" in " + ", ".join(prefs["top_countries"]) if prefs["top_countries"] else "") + ".",
            "intent": "memory_profile",
            "matched_preferences": prefs["preferences_list"],
            "suggested_action": "explore_memory"
        }

    @staticmethod
    def _lead_to_dict(lead: Lead) -> Dict[str, Any]:
        return {
            "id": lead.id,
            "business_name": lead.business_name,
            "industry": lead.industry,
            "business_type": lead.business_type,
            "country": lead.country,
            "city": lead.city,
            "website": lead.website,
            "email": lead.email,
            "phone": lead.phone,
            "source": lead.source,
            "qualification": lead.qualification,
            "qualification_reasons": lead.qualification_reasons,
            "lead_score": lead.lead_score,
            "score_breakdown": lead.score_breakdown,
            "saved": lead.saved,
            "status": lead.status,
            "tags": lead.tags,
            "notes": lead.notes
        }
