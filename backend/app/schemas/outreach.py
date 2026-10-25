from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class DecisionMaker(BaseModel):
    name: str
    title: str
    linkedin_url: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    confidence: int = Field(default=85, description="Confidence score 0-100")
    source: str = "Apollo / Domain Discovery"

class PitchRequest(BaseModel):
    lead_id: Optional[str] = None
    business_name: str
    industry: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    website: Optional[str] = None
    offer_service: Optional[str] = "B2B Services and Growth Solutions"
    sender_name: Optional[str] = "Sales Director"
    sender_company: Optional[str] = "Our Agency"
    tone: Optional[str] = "professional" # professional, casual, direct, value_first

class PitchResponse(BaseModel):
    lead_id: Optional[str] = None
    business_name: str
    subject_lines: List[str]
    email_body: str
    follow_up_day3: str
    follow_up_day7: str
    linkedin_note: str
    value_proposition: str
    call_to_action: str
    tone: str = "professional"

class CrmStageUpdate(BaseModel):
    lead_id: str
    stage: str # Discovered, Enriched, Pitched, Discussion, Won, Lost
    notes: Optional[str] = None

class OutreachLogEntry(BaseModel):
    channel: str # email, linkedin, phone
    timestamp: str
    subject: Optional[str] = None
    message: str
    recipient: Optional[str] = None
    status: str = "sent" # draft, sent, opened, replied

class PipelineSummary(BaseModel):
    total_leads: int
    stage_counts: Dict[str, int]
    high_priority_count: int
    conversion_rate: float

# --- AI Voice Calling Schemas ---
class CallInitiateRequest(BaseModel):
    lead_id: Optional[str] = None
    lead_phone: Optional[str] = None
    lead_name: Optional[str] = None
    lead_role: Optional[str] = None
    lead_company: str = "Target Store"
    sender_company: str = "Growth Catalyst AI"
    sender_name: str = "Vikram Patel"
    sender_phone: str = "+44 20 7946 0999"
    service_offered: str = "Graphic Design and Digital Branding"
    value_proposition: str = "Transforming brand identity, menu designs, and digital assets to boost conversion rates by 40 percent."
    call_goal: str = "Qualify interest and Warm-Transfer live call to Representative"
    make_real_call: bool = False
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_from_phone: Optional[str] = None
    twilio_webhook_url: Optional[str] = None

class CallDialogueTurn(BaseModel):
    speaker: str # "ai", "prospect", "system"
    text: str
    sentiment: str # "neutral", "interested", "skeptical", "objection", "positive", "forwarded"
    timestamp: str

class CallSessionResponse(BaseModel):
    call_id: str
    lead_id: Optional[str] = None
    status: str # "dialing", "connected", "in_progress", "forwarding", "forwarded_live", "deal_discussed", "completed", "not_answered", "no_answer"
    prospect_name: str
    prospect_title: str
    dialogue_turns: List[CallDialogueTurn]
    sentiment_score: int # 0 - 100
    objection_detected: Optional[str] = None
    objection_handled: Optional[str] = None
    forward_status: str # "pending", "ready", "forwarded_to_user", "rejected", "not_applicable"
    forward_target_number: Optional[str] = None
    call_summary: str
    crm_stage_updated: str
    duration_seconds: int = 45
    real_call_dispatched: bool = False
    twilio_call_sid: Optional[str] = None
    telecom_carrier_notice: Optional[str] = None

class CallInteractRequest(BaseModel):
    user_speech: str
    company_name: str
    prospect_name: str = "Client"
    sender_company: str = "Apex Growth Studio"
    sender_name: str = "Vikram Patel"
    service_offered: str = "Graphic Design & Commercial Branding"
    value_proposition: str = "Delivering bespoke brand redesigns and commercial assets that increase customer acquisition by 40%."
    conversation_history: List[Dict[str, str]] = []

class CallInteractResponse(BaseModel):
    ai_response_text: str
    sentiment: str = "neutral"
    is_deal_closed: bool = False
    is_forwarded: bool = False
    objection_detected: Optional[str] = None
    objection_rebuttal: Optional[str] = None

# --- AI Automated Email & Follow-Up Schemas ---
class EmailFollowUpItem(BaseModel):
    stage: int
    day_offset: int
    title: str
    subject: str
    body: str
    status: str = "scheduled" # scheduled, sent, opened, cancelled
    scheduled_for: str

class EmailDraftRequest(BaseModel):
    lead_id: str
    business_name: str
    recipient_email: Optional[str] = None
    decision_maker_name: Optional[str] = None
    sender_name: str = "Vikram Patel"
    sender_company: str = "Growth Catalyst Agency"
    sender_email: str = "vikram@apex-growth.com"
    service_offered: str = "Graphic Design & Visual Identity"
    value_hook: str = "We noticed your digital brand presence and designed a complimentary concept preview that drives 35% higher customer engagement."
    meeting_link: Optional[str] = "https://calendly.com/apex-growth/15min"

class EmailCampaignDraft(BaseModel):
    draft_id: str
    lead_id: str
    to_email: str
    to_name: str
    from_name: str
    from_email: str
    subject_line: str
    alternative_subjects: List[str]
    body: str
    cta_text: str
    cta_url: Optional[str] = None
    follow_ups: List[EmailFollowUpItem]
    created_at: str
    requires_user_approval: bool = True

class EmailSendApprovedRequest(BaseModel):
    lead_id: str
    draft_id: str
    approved_subject: str
    approved_body: str
    enable_auto_followup: bool = True
    user_permission_granted: bool = True

class EmailDispatchResult(BaseModel):
    success: bool
    message_id: str
    lead_id: str
    status: str # "dispatched", "delivered"
    dispatched_at: str
    active_followup_count: int
    next_followup_date: Optional[str] = None
    crm_stage: str
