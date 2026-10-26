from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
from backend.app.database.session import get_db
from backend.app.models.lead import Lead
from sqlalchemy import select

from backend.app.schemas.outreach import (
    PitchRequest,
    PitchResponse,
    CrmStageUpdate,
    PipelineSummary,
    CallInitiateRequest,
    CallSessionResponse,
    CallInteractRequest,
    CallInteractResponse,
    EmailDraftRequest,
    EmailCampaignDraft,
    EmailSendApprovedRequest,
    EmailDispatchResult
)
from backend.app.agents.enrichment_agent import EnrichmentAgent
from backend.app.agents.pitch_agent import PitchAgent
from backend.app.agents.crm_agent import CrmAgent
from backend.app.agents.outreach_agent import OutreachAgent

router = APIRouter(prefix="/outreach", tags=["Outreach & CRM"])

@router.post("/pitch", response_model=PitchResponse)
async def generate_pitch(req: PitchRequest, db: AsyncSession = Depends(get_db)):
    """Agent 8: Generate hyper-personalized cold outreach package"""
    pitch = await PitchAgent.generate_pitch(req)
    
    # If lead_id is provided, save pitch into lead model
    if req.lead_id:
        query = select(Lead).where(Lead.id == req.lead_id)
        res = await db.execute(query)
        lead = res.scalars().first()
        if lead:
            lead.pitches = pitch.model_dump()
            await db.commit()

    return pitch

@router.post("/enrich/{lead_id}")
async def enrich_lead_contacts(
    lead_id: str,
    user_id: str = Query("default_user"),
    db: AsyncSession = Depends(get_db)
):
    """Agent 7: Identify key decision-makers and C-level contacts for a lead"""
    query = select(Lead).where(Lead.id == lead_id, Lead.user_id == user_id)
    res = await db.execute(query)
    lead = res.scalars().first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    lead_dict = {
        "business_name": lead.business_name,
        "website": lead.website,
        "industry": lead.industry,
        "city": lead.city,
        "country": lead.country
    }
    
    decision_makers = await EnrichmentAgent.enrich_lead(lead_dict)
    lead.decision_makers = decision_makers
    if lead.crm_stage == "Discovered":
        lead.crm_stage = "Enriched"
        
    await db.commit()
    await db.refresh(lead)
    
    return {
        "lead_id": lead.id,
        "business_name": lead.business_name,
        "decision_makers": lead.decision_makers,
        "crm_stage": lead.crm_stage
    }

@router.post("/stage")
async def update_crm_stage(
    stage_update: CrmStageUpdate,
    user_id: str = Query("default_user"),
    db: AsyncSession = Depends(get_db)
):
    """Agent 9: Update lead pipeline stage (Discovered -> Enriched -> Pitched -> Discussion -> Won -> Lost)"""
    result = await CrmAgent.update_lead_stage(db, user_id, stage_update)
    if not result:
        raise HTTPException(status_code=404, detail="Lead not found")
    return result

@router.get("/pipeline/summary", response_model=PipelineSummary)
async def get_pipeline_summary(
    user_id: str = Query("default_user"),
    db: AsyncSession = Depends(get_db)
):
    """Agent 9: Get CRM pipeline metrics, conversion rate, and stage breakdown"""
    return await CrmAgent.get_pipeline_summary(db, user_id)

@router.post("/dispatch")
async def dispatch_outreach(
    lead_id: str = Query(...),
    channel: str = Query("email"),
    subject: Optional[str] = Query(None),
    message: str = Query(""),
    recipient: Optional[str] = Query(None),
    user_id: str = Query("default_user"),
    db: AsyncSession = Depends(get_db)
):
    """Agent 10: Log outreach dispatch and build 1-click mailto or script"""
    result = await OutreachAgent.log_outreach_activity(
        db=db,
        user_id=user_id,
        lead_id=lead_id,
        channel=channel,
        subject=subject,
        message=message,
        recipient=recipient
    )
    if not result:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    mailto_link = OutreachAgent.create_mailto_link(
        recipient=recipient or "",
        subject=subject or "Introduction",
        body=message
    )
    result["mailto_link"] = mailto_link
    return result

# --- Agent 11: AI Voice Calling & Warm Live Forwarding ---
@router.post("/call/initiate", response_model=CallSessionResponse)
async def initiate_voice_call(
    req: CallInitiateRequest,
    user_id: str = Query("default_user"),
    db: AsyncSession = Depends(get_db)
):
    """Agent 11: Initiate autonomous B2B outbound call, dialog, and warm transfer to user"""
    from backend.app.agents.voice_calling_agent import VoiceCallingAgent
    return await VoiceCallingAgent.execute_outbound_call(db, user_id, req)

@router.post("/call/turn", response_model=CallInteractResponse)
async def interact_live_voice_call(
    req: CallInteractRequest,
    user_id: str = Query("default_user")
):
    """Agent 11: Live 2-way microphone voice dialogue turn between user and AI SDR"""
    from backend.app.agents.voice_calling_agent import VoiceCallingAgent
    return await VoiceCallingAgent.respond_to_live_speech(req)

# --- Agent 12: Human-in-the-Loop Automated Email & Follow-Up Engine ---
@router.post("/email/draft", response_model=EmailCampaignDraft)
async def generate_email_draft(
    req: EmailDraftRequest,
    user_id: str = Query("default_user"),
    db: AsyncSession = Depends(get_db)
):
    """Agent 12: Generate customized cold email draft and 3-stage follow-up sequence for user approval"""
    from backend.app.agents.email_dispatcher_agent import EmailDispatcherAgent
    return await EmailDispatcherAgent.create_email_draft(db, user_id, req)

@router.post("/email/send", response_model=EmailDispatchResult)
async def send_approved_email(
    req: EmailSendApprovedRequest,
    user_id: str = Query("default_user"),
    db: AsyncSession = Depends(get_db)
):
    """Agent 12: Dispatch approved email to client and activate automated follow-up engine"""
    from backend.app.agents.email_dispatcher_agent import EmailDispatcherAgent
    return await EmailDispatcherAgent.send_approved_email(db, user_id, req)

@router.get("/lead/{lead_id}/activities")
async def get_lead_outreach_activities(
    lead_id: str,
    user_id: str = Query("default_user"),
    db: AsyncSession = Depends(get_db)
):
    """Get all calls, emails, and CRM interactions for a lead"""
    query = select(Lead).where(Lead.id == lead_id, Lead.user_id == user_id)
    res = await db.execute(query)
    lead = res.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return {
        "lead_id": lead.id,
        "business_name": lead.business_name,
        "crm_stage": lead.crm_stage,
        "call_logs": lead.call_logs or [],
        "email_campaigns": lead.email_campaigns or [],
        "outreach_logs": lead.outreach_logs or []
    }
