import urllib.parse
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.tracing import traceable
from backend.app.models.lead import Lead
from backend.app.schemas.outreach import OutreachLogEntry

class OutreachAgent:
    """
    Agent 10 — Multi-Channel Outreach Dispatcher Agent
    Responsibilities:
    - Build 1-click mailto: deep links with pre-filled subject, recipient, and body
    - Generate LinkedIn connection invitation notes and DM scripts
    - Log outreach activity history with timestamps
    - Advance lead CRM stage to 'Pitched' upon dispatch
    """

    @classmethod
    @traceable(name="10_OutreachAgent_create_mailto", run_type="chain")
    def create_mailto_link(cls, recipient: str, subject: str, body: str) -> str:
        safe_recipient = recipient if (recipient and "@" in recipient and recipient != "Not found") else ""
        encoded_subject = urllib.parse.quote(subject)
        encoded_body = urllib.parse.quote(body)
        return f"mailto:{safe_recipient}?subject={encoded_subject}&body={encoded_body}"

    @classmethod
    @traceable(name="10_OutreachAgent_log_dispatch", run_type="chain")
    async def log_outreach_activity(
        cls,
        db: AsyncSession,
        user_id: str,
        lead_id: str,
        channel: str,
        subject: Optional[str],
        message: str,
        recipient: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        query = select(Lead).where(Lead.id == lead_id, Lead.user_id == user_id)
        res = await db.execute(query)
        lead = res.scalars().first()

        if not lead:
            return None

        # Create log entry
        log_entry = {
            "channel": channel,
            "timestamp": datetime.utcnow().isoformat(),
            "subject": subject or "",
            "message": message,
            "recipient": recipient or lead.email or "Direct Outreach",
            "status": "sent"
        }

        current_logs = list(lead.outreach_logs or [])
        current_logs.append(log_entry)
        lead.outreach_logs = current_logs

        # Automatically advance stage to Pitched if it was Discovered or Enriched
        if lead.crm_stage in ["Discovered", "Enriched"]:
            lead.crm_stage = "Pitched"

        lead.status = "contacted"
        lead.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(lead)

        return {
            "lead_id": lead.id,
            "business_name": lead.business_name,
            "crm_stage": lead.crm_stage,
            "outreach_count": len(current_logs),
            "latest_log": log_entry
        }
