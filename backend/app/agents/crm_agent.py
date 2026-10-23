from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.tracing import traceable
from backend.app.models.lead import Lead
from backend.app.schemas.outreach import CrmStageUpdate, PipelineSummary

class CrmAgent:
    """
    Agent 9 — CRM Pipeline & Lifecycle Agent
    Responsibilities:
    - Track lead progression across deal pipeline stages
    - Manage state transitions: Discovered -> Enriched -> Pitched -> Discussion -> Won / Lost
    - Compute pipeline metrics, conversion velocity, and stage distribution
    - Generate CRM export payloads for HubSpot, Notion, and CSV
    """

    STAGES = ["Discovered", "Enriched", "Pitched", "Discussion", "Won", "Lost"]

    @classmethod
    @traceable(name="9_CrmAgent_update_stage", run_type="chain")
    async def update_lead_stage(cls, db: AsyncSession, user_id: str, stage_update: CrmStageUpdate) -> Optional[Dict[str, Any]]:
        target_stage = stage_update.stage
        if target_stage not in cls.STAGES:
            target_stage = "Discovered"

        query = select(Lead).where(Lead.id == stage_update.lead_id, Lead.user_id == user_id)
        res = await db.execute(query)
        lead = res.scalars().first()

        if not lead:
            return None

        lead.crm_stage = target_stage
        lead.updated_at = datetime.utcnow()
        if stage_update.notes:
            lead.notes = (lead.notes or "") + f"\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] Stage changed to {target_stage}: {stage_update.notes}"

        await db.commit()
        await db.refresh(lead)

        return {
            "id": lead.id,
            "business_name": lead.business_name,
            "crm_stage": lead.crm_stage,
            "updated_at": lead.updated_at.isoformat()
        }

    @classmethod
    @traceable(name="9_CrmAgent_get_pipeline_summary", run_type="chain")
    async def get_pipeline_summary(cls, db: AsyncSession, user_id: str) -> PipelineSummary:
        query = select(Lead.crm_stage, func.count(Lead.id)).where(Lead.user_id == user_id).group_by(Lead.crm_stage)
        res = await db.execute(query)
        rows = res.all()

        stage_counts = {stage: 0 for stage in cls.STAGES}
        total_leads = 0
        for stage, count in rows:
            if stage in stage_counts:
                stage_counts[stage] = count
            else:
                stage_counts["Discovered"] = stage_counts.get("Discovered", 0) + count
            total_leads += count

        # Count high-priority leads (score >= 80)
        high_query = select(func.count(Lead.id)).where(Lead.user_id == user_id, Lead.lead_score >= 80)
        high_res = await db.execute(high_query)
        high_count = high_res.scalar() or 0

        # Calculate Won / Pitched conversion rate
        won_count = stage_counts.get("Won", 0)
        pitched_or_more = stage_counts.get("Pitched", 0) + stage_counts.get("Discussion", 0) + won_count
        conversion_rate = round((won_count / pitched_or_more * 100), 1) if pitched_or_more > 0 else 0.0

        return PipelineSummary(
            total_leads=total_leads,
            stage_counts=stage_counts,
            high_priority_count=high_count,
            conversion_rate=conversion_rate
        )

    @classmethod
    def format_hubspot_payload(cls, lead: Dict[str, Any]) -> Dict[str, Any]:
        """Formats a lead for HubSpot Contacts / Companies API"""
        return {
            "properties": {
                "name": lead.get("business_name"),
                "domain": lead.get("website"),
                "city": lead.get("city"),
                "country": lead.get("country"),
                "phone": lead.get("phone") if lead.get("phone") != "Not found" else "",
                "industry": lead.get("industry"),
                "lead_score": str(lead.get("lead_score", 0)),
                "lifecyclestage": "lead" if lead.get("crm_stage") in ["Discovered", "Enriched"] else "opportunity"
            }
        }
