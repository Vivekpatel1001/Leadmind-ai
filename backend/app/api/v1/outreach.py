from fastapi import APIRouter, Depends, HTTPException, Query, Response, Form
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
@router.get("/twilio/status")
async def get_twilio_status():
    """Check Twilio account connectivity, active caller ID number, and verified test numbers"""
    from backend.app.core.config import settings
    sid = settings.TWILIO_ACCOUNT_SID
    token = settings.TWILIO_AUTH_TOKEN
    phone = settings.TWILIO_PHONE_NUMBER
    if not sid or not token:
        return {"configured": False, "message": "Twilio Account SID or Auth Token missing."}
    
    try:
        from twilio.rest import Client
        client = Client(sid, token)
        account = client.api.accounts(sid).fetch()
        verified = [v.phone_number for v in client.outgoing_caller_ids.list()]
        incoming = [i.phone_number for i in client.incoming_phone_numbers.list()]
        return {
            "configured": True,
            "status": "active",
            "account_name": account.friendly_name,
            "account_type": account.type,
            "from_phone": phone or (incoming[0] if incoming else None),
            "incoming_numbers": incoming,
            "verified_caller_ids": verified
        }
    except Exception as e:
        return {"configured": False, "error": str(e)}

@router.post("/voice")
@router.get("/voice")
async def twilio_voice_webhook():
    """TwiML webhook endpoint for incoming calls to the Twilio number (as in Twilio Docs)"""
    from twilio.twiml.voice_response import VoiceResponse
    twiml = VoiceResponse()
    twiml.say(
        "Hello from LeadMind AI! Your autonomous AI voice calling agent is connected and fully operational. Have a wonderful day!",
        voice="alice",
        language="en-US"
    )
    twiml.pause(length=1)
    return Response(content=str(twiml), media_type="application/xml")

@router.post("/voice/turn")
async def twilio_voice_turn(
    SpeechResult: Optional[str] = Form(None),
    company: Optional[str] = Query("Your Target Business"),
    prospect: Optional[str] = Query("there"),
    service: Optional[str] = Query("Graphic Design & Digital Branding"),
    sender: Optional[str] = Query("Vivek Patel"),
    company_sender: Optional[str] = Query("LeadMind AI"),
    sender_phone: Optional[str] = Query("+91 9408082933")
):
    """Twilio Speech Gathering Webhook: receives real-time speech from physical cellular phone"""
    from twilio.twiml.voice_response import VoiceResponse, Gather, Dial
    from backend.app.agents.voice_calling_agent import VoiceCallingAgent, sanitize_dialogue_text
    import urllib.parse
    
    twiml = VoiceResponse()
    
    if not SpeechResult or not SpeechResult.strip():
        action_url = (
            f"/api/v1/outreach/voice/turn"
            f"?company={urllib.parse.quote(company)}"
            f"&prospect={urllib.parse.quote(prospect)}"
            f"&service={urllib.parse.quote(service)}"
            f"&sender={urllib.parse.quote(sender)}"
            f"&company_sender={urllib.parse.quote(company_sender)}"
            f"&sender_phone={urllib.parse.quote(sender_phone)}"
        )
        gather = Gather(
            input='speech',
            action=action_url,
            method='POST',
            speech_timeout='auto',
            timeout=7,
            language='en-US'
        )
        gather.say(f"I am still here with you, {prospect}! How have business and customer bookings been going for {company} lately?", voice="Polly.Joanna", language="en-US")
        twiml.append(gather)
        return Response(content=str(twiml), media_type="application/xml")
        
    req = CallInteractRequest(
        user_speech=SpeechResult,
        company_name=company,
        prospect_name=prospect,
        sender_company=company_sender,
        sender_name=sender,
        service_offered=service,
        value_proposition="Transforming brand identity, menu designs, and digital assets to boost conversion rates by 40 percent."
    )
    result = await VoiceCallingAgent.respond_to_live_speech(req)
    clean_text = sanitize_dialogue_text(result.ai_response_text)
    
    if result.is_forwarded or result.is_deal_closed:
        twiml.say(clean_text, voice="Polly.Joanna", language="en-US")
        twiml.say("Transferring your call directly to our owner, Vivek Patel, right now. Please hold while the line bridges!", voice="Polly.Joanna", language="en-US")
        dial = Dial()
        dial.number("+919408082933")
        twiml.append(dial)
    else:
        action_url = (
            f"/api/v1/outreach/voice/turn"
            f"?company={urllib.parse.quote(company)}"
            f"&prospect={urllib.parse.quote(prospect)}"
            f"&service={urllib.parse.quote(service)}"
            f"&sender={urllib.parse.quote(sender)}"
            f"&company_sender={urllib.parse.quote(company_sender)}"
            f"&sender_phone={urllib.parse.quote(sender_phone)}"
        )
        gather = Gather(
            input='speech',
            action=action_url,
            method='POST',
            speech_timeout='auto',
            timeout=7,
            language='en-US'
        )
        gather.say(clean_text, voice="Polly.Joanna", language="en-US")
        twiml.append(gather)
        # Fallback if prospect says nothing or call concludes
        twiml.say(f"Thank you for speaking with me, {prospect}. You can reach our owner, Vivek Patel, directly at +91 9408082933. Have a wonderful day!", voice="Polly.Joanna", language="en-US")
        twiml.hangup()
        
    return Response(content=str(twiml), media_type="application/xml")
        
    req = CallInteractRequest(
        user_speech=SpeechResult,
        company_name=company,
        prospect_name=prospect,
        sender_company=company_sender,
        sender_name=sender,
        service_offered=service,
        value_proposition="Delivering bespoke brand redesigns and commercial assets that increase customer acquisition by 40%."
    )
    result = await VoiceCallingAgent.respond_to_live_speech(req)
    clean_text = sanitize_dialogue_text(result.ai_response_text)
    
    if result.is_forwarded or result.is_deal_closed:
        twiml.say(clean_text, voice="Polly.Joanna", language="en-US")
        twiml.say(f"Transferring our line live to {sender} right now. Please hold for two seconds while the bridge connects.", voice="Polly.Joanna", language="en-US")
        twiml.pause(length=1)
        twiml.say(f"Thank you for connecting with {company_sender}. Have a wonderful day!", voice="Polly.Joanna", language="en-US")
        twiml.hangup()
    else:
        action_url = (
            f"/api/v1/outreach/voice/turn"
            f"?company={urllib.parse.quote(company)}"
            f"&prospect={urllib.parse.quote(prospect)}"
            f"&service={urllib.parse.quote(service)}"
            f"&sender={urllib.parse.quote(sender)}"
            f"&company_sender={urllib.parse.quote(company_sender)}"
            f"&sender_phone={urllib.parse.quote(sender_phone)}"
        )
        gather = Gather(
            input='speech',
            action=action_url,
            method='POST',
            speech_timeout='auto',
            language='en-US'
        )
        gather.say(clean_text, voice="Polly.Joanna", language="en-US")
        twiml.append(gather)
        # Fallback if prospect says nothing or call concludes
        twiml.say(f"Thank you for speaking with me, {prospect}. You can reach {sender} directly at {sender_phone}. Have a great day!", voice="Polly.Joanna", language="en-US")
        twiml.hangup()
        
    return Response(content=str(twiml), media_type="application/xml")

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
