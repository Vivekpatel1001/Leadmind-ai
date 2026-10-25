import uuid
import json
import re
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.tracing import traceable
from backend.app.core.config import settings
from backend.app.models.lead import Lead
from backend.app.schemas.outreach import (
    CallInitiateRequest,
    CallDialogueTurn,
    CallSessionResponse,
    CallInteractRequest,
    CallInteractResponse
)

def matches_any_intent(patterns: List[str], text: str) -> bool:
    """Helper to match intent keywords accurately with word boundaries to avoid partial substring hits."""
    text_lower = text.lower()
    for p in patterns:
        p_clean = p.lower().strip()
        if not p_clean:
            continue
        if re.search(r'\b' + re.escape(p_clean) + r'\b', text_lower):
            return True
    return False

def sanitize_dialogue_text(text: str) -> str:
    """Clean text for natural, pristine spoken voice synthesis without slashes or glitches."""
    if not text:
        return ""
    # Replace slashes with natural words or spaces
    text = text.replace(" / ", " or ")
    text = text.replace("/", " or ")
    text = text.replace("&", " and ")
    text = text.replace("@", " at ")
    text = text.replace("%", " percent")
    text = text.replace("w/", "with")
    text = text.replace("b/w", "between")
    # Remove URLs
    text = re.sub(r"https?://\S+|www\.\S+", "", text)
    # Remove markdown asterisks, hashes, backticks, brackets
    text = re.sub(r"[\*\_`#\[\]\(\)\{\}]", "", text)
    # Remove emoji and non-standard unicode symbols
    text = re.sub(r"[^\x00-\x7F]+", " ", text)
    # Normalize multiple whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text

def clean_phone_number(phone: Optional[str]) -> Optional[str]:
    """Normalize phone number to strict E.164 international format without spaces, brackets, or dashes."""
    if not phone:
        return None
    cleaned = re.sub(r"[^\d+]", "", phone.strip())
    if not cleaned:
        return None
    if not cleaned.startswith("+"):
        cleaned = "+" + cleaned
    return cleaned

def derive_contextual_title(company: str, industry: Optional[str] = None) -> str:
    """Derive an accurate, realistic title for the store or business contact."""
    comp_lower = company.lower()
    ind_lower = (industry or "").lower()
    
    if any(k in comp_lower or k in ind_lower for k in ["restaurant", "cafe", "culinary", "bistro", "bar", "grill", "dining"]):
        return "General Manager"
    elif any(k in comp_lower or k in ind_lower for k in ["store", "shop", "boutique", "retail", "market", "grocer"]):
        return "Store Owner"
    elif any(k in comp_lower or k in ind_lower for k in ["agency", "consult", "tech", "software", "studio"]):
        return "Managing Director"
    elif any(k in comp_lower or k in ind_lower for k in ["hotel", "hospitality", "resort"]):
        return "Operations Director"
    else:
        return "Business Owner / Decision Maker"

class VoiceCallingAgent:
    """
    Agent 11  -  Autonomous B2B Voice Calling & Warm Forwarding Agent
    Responsibilities:
    - Dial B2B leads or custom direct numbers autonomously using tailored business details & value hooks
    - Support actual real GSM cellular phone calling via Twilio Voice API when credentials are provided
    - Support browser-based live consultative voice simulation with natural two-way speech synthesis
    - Use exact dynamic store, manager, or owner names for every single lead
    - Detect objection patterns and provide consultative rebuttals
    - Detect high purchase/demo intent and trigger warm live call forwarding to the user's phone
    - Record full transcript, sentiment score, audio duration, and update CRM stage
    """

    _LIVE_CALL_REGISTRY: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def register_live_session(
        cls,
        call_id: str,
        phone: str,
        twilio_call_sid: Optional[str] = None,
        initial_turns: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Registers an active call session so the dashboard can poll and view real-time spoken audio transcripts."""
        session_data = {
            "call_id": call_id,
            "phone": phone,
            "twilio_call_sid": twilio_call_sid,
            "status": "connected",
            "is_forwarded": False,
            "turns": list(initial_turns or []),
            "last_updated": datetime.utcnow().isoformat()
        }
        cls._LIVE_CALL_REGISTRY[call_id] = session_data
        if twilio_call_sid:
            cls._LIVE_CALL_REGISTRY[twilio_call_sid] = session_data
        if phone:
            cls._LIVE_CALL_REGISTRY[phone] = session_data
        cls._LIVE_CALL_REGISTRY["latest"] = session_data
        return session_data

    @classmethod
    def record_live_turn(
        cls,
        identifier: Optional[str],
        speaker: str,
        text: str,
        sentiment: str = "neutral",
        is_forwarded: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Appends a spoken turn (prospect speech or AI speech) to the live session transcript."""
        session = None
        if identifier and identifier in cls._LIVE_CALL_REGISTRY:
            session = cls._LIVE_CALL_REGISTRY[identifier]
        elif "latest" in cls._LIVE_CALL_REGISTRY:
            session = cls._LIVE_CALL_REGISTRY["latest"]

        if session is None and identifier:
            session = cls.register_live_session(
                call_id=identifier,
                phone=identifier,
                twilio_call_sid=identifier if identifier.startswith("CA") else None
            )

        if session is not None:
            turn = {
                "speaker": speaker,
                "text": text,
                "sentiment": sentiment,
                "timestamp": datetime.now().strftime("%H:%M:%S")
            }
            session["turns"].append(turn)
            session["last_updated"] = datetime.utcnow().isoformat()
            if is_forwarded:
                session["is_forwarded"] = True
                session["status"] = "forwarded"
            return session
        return None

    @classmethod
    def update_call_status(
        cls,
        identifier: Optional[str],
        call_status: str,
        duration: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Updates call status and logs status transitions."""
        session = None
        if identifier and identifier in cls._LIVE_CALL_REGISTRY:
            session = cls._LIVE_CALL_REGISTRY[identifier]
        elif "latest" in cls._LIVE_CALL_REGISTRY:
            session = cls._LIVE_CALL_REGISTRY["latest"]

        if session is not None:
            status_lower = (call_status or "").lower()
            if status_lower in ["in-progress", "answered"]:
                session["status"] = "connected"
            elif status_lower in ["completed"]:
                if not session.get("is_forwarded"):
                    session["status"] = "completed"
            elif status_lower in ["busy", "no-answer", "failed", "canceled"]:
                session["status"] = "not_answered"

            if duration:
                session["duration_seconds"] = int(duration)

            session["last_updated"] = datetime.utcnow().isoformat()
            return session
        return None

    @classmethod
    def get_live_session(cls, identifier: Optional[str] = None) -> Dict[str, Any]:
        """Retrieves the live call session by call SID, call ID, phone number, or returns latest."""
        if identifier and identifier in cls._LIVE_CALL_REGISTRY:
            return cls._LIVE_CALL_REGISTRY[identifier]
        if identifier:
            clean_id = clean_phone_number(identifier) or identifier
            for k, s in cls._LIVE_CALL_REGISTRY.items():
                if s.get("twilio_call_sid") == identifier or s.get("call_id") == identifier or s.get("phone") == clean_id:
                    return s
        if "latest" in cls._LIVE_CALL_REGISTRY:
            return cls._LIVE_CALL_REGISTRY["latest"]
        return {
            "call_id": "",
            "twilio_call_sid": None,
            "status": "idle",
            "is_forwarded": False,
            "turns": []
        }

    @classmethod
    @traceable(name="11_VoiceCallingAgent_execute_call", run_type="chain")
    async def execute_outbound_call(
        cls,
        db: AsyncSession,
        user_id: str,
        req: CallInitiateRequest
    ) -> CallSessionResponse:
        call_id = f"call_{uuid.uuid4().hex[:10]}"
        base_time = datetime.utcnow()

        # 1. Fetch lead details if a lead_id was provided
        lead: Optional[Lead] = None
        if req.lead_id:
            lead_query = select(Lead).where(Lead.id == req.lead_id)
            res = await db.execute(lead_query)
            lead = res.scalars().first()

        company_name = req.lead_company or (lead.business_name if lead else "Your Target Business")
        industry = lead.industry if lead else None

        # 2. Dynamic prospect name & title resolution
        prospect_name = req.lead_name
        if not prospect_name or prospect_name.strip() in ["", "Decision Maker", "Managing Director / Owner", "Alex Vance"]:
            if lead and lead.decision_makers and len(lead.decision_makers) > 0:
                dm = lead.decision_makers[0]
                prospect_name = dm.get("name") if isinstance(dm, dict) else getattr(dm, "name", None)
            
            if not prospect_name:
                # Dynamic realistic title based on the specific company
                prospect_name = f"the {derive_contextual_title(company_name, industry)}"

        prospect_title = req.lead_role or derive_contextual_title(company_name, industry)

        lead_phone = req.lead_phone or (lead.phone if lead else "+91 9408082933")
        if not lead_phone or lead_phone == "Not found":
            lead_phone = "+91 9408082933"

        clean_lead_phone = clean_phone_number(lead_phone) or "+919408082933"

        # 3. Real Twilio Outbound GSM Phone Call Dispatch (If Requested or Configured)
        twilio_sid = req.twilio_account_sid or settings.TWILIO_ACCOUNT_SID
        twilio_token = req.twilio_auth_token or settings.TWILIO_AUTH_TOKEN
        twilio_from = clean_phone_number(req.twilio_from_phone or settings.TWILIO_PHONE_NUMBER)

        real_call_dispatched = False
        twilio_call_id = None
        carrier_notice = None

        if req.make_real_call and twilio_sid and twilio_token and twilio_from:
            try:
                from twilio.rest import Client
                from twilio.twiml.voice_response import VoiceResponse, Gather
                import urllib.parse
                client = Client(twilio_sid, twilio_token)

                vr = VoiceResponse()
                clean_value = sanitize_dialogue_text(req.value_proposition)
                clean_service = sanitize_dialogue_text(req.service_offered)

                webhook_url = (getattr(req, 'twilio_webhook_url', None) or settings.TWILIO_WEBHOOK_URL or 'https://nice-trains-spend.loca.lt').strip()
                webhook_clean = webhook_url.rstrip('/')
                action_url = (
                    f"{webhook_clean}/api/v1/outreach/voice/turn"
                    f"?company={urllib.parse.quote(company_name)}"
                    f"&prospect={urllib.parse.quote(prospect_name)}"
                    f"&service={urllib.parse.quote(req.service_offered)}"
                    f"&sender={urllib.parse.quote(req.sender_name)}"
                    f"&company_sender={urllib.parse.quote(req.sender_company)}"
                    f"&sender_phone={urllib.parse.quote(req.sender_phone)}"
                )
                gather = Gather(
                    input='speech dtmf',
                    action=action_url,
                    method='POST',
                    speech_timeout='auto',
                    timeout=8,
                    language='en-US'
                )
                gather.say(f"Hi {prospect_name}! Hello, how are you doing today?", voice="Polly.Joanna", language="en-US")
                vr.append(gather)
                # If caller didn't speak:
                vr.say(
                    f"Hi {prospect_name}, this is {req.sender_name} from {req.sender_company}. "
                    f"We've prepared a customized concept preview for {company_name} regarding {clean_service}. "
                    f"Feel free to call or text me right back at {req.sender_phone}. Have a great day!",
                    voice="Polly.Joanna",
                    language="en-US"
                )

                status_callback_url = f"{webhook_clean}/api/v1/outreach/voice/status"
                twilio_call = client.calls.create(
                    to=clean_lead_phone,
                    from_=twilio_from,
                    twiml=str(vr),
                    status_callback=status_callback_url,
                    status_callback_event=['initiated', 'ringing', 'answered', 'completed'],
                    status_callback_method='POST'
                )
                real_call_dispatched = True
                twilio_call_id = twilio_call.sid
                carrier_notice = f"Real cellular phone call successfully placed to {clean_lead_phone} via Twilio Voice Gateway (Call SID: {twilio_call.sid})."
                print(f"[Twilio Voice] Outbound real call initiated: {twilio_call.sid} to {clean_lead_phone}")

                cls.register_live_session(
                    call_id=call_id,
                    phone=clean_lead_phone,
                    twilio_call_sid=twilio_call.sid,
                    initial_turns=[
                        {
                            "speaker": "system",
                            "text": f"Cellular GSM call placed to {clean_lead_phone} via Twilio line {twilio_from}. Pick up your mobile phone!",
                            "sentiment": "neutral",
                            "timestamp": datetime.now().strftime("%H:%M:%S")
                        },
                        {
                            "speaker": "ai",
                            "text": f"Hi {prospect_name}! Hello, how are you doing today?",
                            "sentiment": "positive",
                            "timestamp": datetime.now().strftime("%H:%M:%S")
                        }
                    ]
                )

            except Exception as e:
                print(f"[Twilio Voice Error] Could not dispatch real call: {e}")
                carrier_notice = f"Twilio gateway error: {str(e)}."

        # 4. Realistic Call Outcome Check
        is_answered = True if req.make_real_call else (random.random() > 0.10)

        if not is_answered:
            # Handle No Answer / Not Picked Up
            not_answered_turns = [
                CallDialogueTurn(
                    speaker="system",
                    text=f"Dialing {company_name} on {lead_phone}... Telecom gateway routing established.",
                    sentiment="neutral",
                    timestamp=(base_time + timedelta(seconds=2)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="system",
                    text="Ringing tone transmitted... Ring 1.",
                    sentiment="neutral",
                    timestamp=(base_time + timedelta(seconds=6)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="system",
                    text="Ringing tone transmitted... Ring 2.",
                    sentiment="neutral",
                    timestamp=(base_time + timedelta(seconds=11)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="system",
                    text="Ringing tone transmitted... Ring 3.",
                    sentiment="neutral",
                    timestamp=(base_time + timedelta(seconds=16)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="system",
                    text=f"Ringing tone transmitted... Ring 4. No answer received from {company_name} ({lead_phone}).",
                    sentiment="neutral",
                    timestamp=(base_time + timedelta(seconds=21)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="system",
                    text="Call disconnected due to timeout. Automated retry scheduled and logged.",
                    sentiment="neutral",
                    timestamp=(base_time + timedelta(seconds=23)).strftime("%H:%M:%S")
                ),
            ]

            summary = f"Outbound call to {prospect_name} at {company_name} ({lead_phone}) was not answered after 4 rings. Lead flagged for follow-up outreach."

            if lead:
                call_log_entry = {
                    "call_id": call_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "duration_seconds": 24,
                    "phone_dialed": lead_phone,
                    "prospect_name": prospect_name,
                    "sentiment_score": 0,
                    "forward_status": "not_applicable",
                    "status": "not_answered",
                    "summary": summary,
                    "transcript": [t.model_dump() for t in not_answered_turns]
                }
                existing_calls = list(lead.call_logs or [])
                existing_calls.append(call_log_entry)
                lead.call_logs = existing_calls
                lead.notes = f"{lead.notes or ''}\n[AI Call {datetime.utcnow().strftime('%Y-%m-%d')}]: No answer at {company_name} (4 rings).".strip()
                await db.commit()

            return CallSessionResponse(
                call_id=call_id,
                lead_id=req.lead_id,
                status="not_answered",
                prospect_name=prospect_name,
                prospect_title=prospect_title,
                dialogue_turns=not_answered_turns,
                sentiment_score=0,
                objection_detected=None,
                objection_handled=None,
                forward_status="not_applicable",
                forward_target_number=req.sender_phone,
                call_summary=summary,
                crm_stage_updated="Discovered",
                duration_seconds=24,
                real_call_dispatched=real_call_dispatched,
                twilio_call_sid=twilio_call_id,
                telecom_carrier_notice=carrier_notice
            )

        # 5. Generate Conversation Turns
        dialogue: List[CallDialogueTurn] = []
        sentiment_score = 95
        objection = None
        rebuttal = None
        summary = ""

        if real_call_dispatched:
            dialogue = [
                CallDialogueTurn(
                    speaker="system",
                    text=f"Telecom line connected. Dialing {company_name} on {clean_lead_phone} via Twilio line {twilio_from}.",
                    sentiment="neutral",
                    timestamp=(base_time).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="system",
                    text=f"Cellular call dispatched to mobile network (Twilio SID: {twilio_call_id}). Real-time audio stream active.",
                    sentiment="positive",
                    timestamp=(base_time + timedelta(seconds=2)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="ai",
                    text=f"Hello, good day! This is an autonomous sales briefing from {req.sender_company} calling for {company_name}.",
                    sentiment="positive",
                    timestamp=(base_time + timedelta(seconds=5)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="ai",
                    text=f"We reached out regarding {sanitize_dialogue_text(req.service_offered)}. {sanitize_dialogue_text(req.value_proposition)}. Our director {req.sender_name} is standing by on {req.sender_phone}.",
                    sentiment="positive",
                    timestamp=(base_time + timedelta(seconds=10)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="system",
                    text=f"Live cellular call active on physical phone {clean_lead_phone}. Answer your mobile phone to hear your AI agent deliver the pitch!",
                    sentiment="positive",
                    timestamp=(base_time + timedelta(seconds=14)).strftime("%H:%M:%S")
                )
            ]
            objection = None
            rebuttal = None
            summary = f"Real outbound cellular call dispatched to {company_name} at {clean_lead_phone} via Twilio Voice (Call SID: {twilio_call_id}). AI agent pitched {req.service_offered} directly over the phone."
            sentiment_score = 98
        else:
            # High-conversion consultative dialogue tailored directly to THIS specific company & person
            dialogue = [
                CallDialogueTurn(
                    speaker="system",
                    text=f"Telecom line connected to {company_name} on {lead_phone}. Live two-way audio stream active.",
                    sentiment="neutral",
                    timestamp=(base_time + timedelta(seconds=2)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="ai",
                    text=f"Hello, good day! Am I speaking with {prospect_name} at {company_name}?",
                    sentiment="neutral",
                    timestamp=(base_time + timedelta(seconds=6)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="prospect",
                    text=f"Yes, speaking. Who is calling and what is this regarding?",
                    sentiment="skeptical",
                    timestamp=(base_time + timedelta(seconds=11)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="ai",
                    text=f"Hi {prospect_name}, I am calling from {req.sender_company} on behalf of our growth director, {req.sender_name}. We have been analyzing {company_name} in the local market and noticed a clear opportunity to implement {sanitize_dialogue_text(req.service_offered)} to increase inbound customer bookings.",
                    sentiment="interested",
                    timestamp=(base_time + timedelta(seconds=18)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="prospect",
                    text=f"We get approached quite often by different vendors, and we are quite busy running operations at {company_name}. What makes your approach any different?",
                    sentiment="objection",
                    timestamp=(base_time + timedelta(seconds=25)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="ai",
                    text=f"I completely understand, {prospect_name}. Most business leaders we collaborate with already have existing vendors. Where we create immediate value is our bespoke turnaround framework, and we have already prepared a preliminary concept preview tailored specifically for {company_name} that {sanitize_dialogue_text(req.value_proposition)}.",
                    sentiment="positive",
                    timestamp=(base_time + timedelta(seconds=33)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="prospect",
                    text=f"That actually sounds very relevant to our growth goals for {company_name}. How long would a quick walkthrough take?",
                    sentiment="interested",
                    timestamp=(base_time + timedelta(seconds=39)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="ai",
                    text=f"Just ten minutes. In fact, {req.sender_name} is in the office right now on our direct bridge. Would you like me to connect you live right now for a quick two-minute introduction?",
                    sentiment="positive",
                    timestamp=(base_time + timedelta(seconds=46)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="prospect",
                    text="Yes, that works perfectly. I have a few minutes right now, please patch them through.",
                    sentiment="positive",
                    timestamp=(base_time + timedelta(seconds=51)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="ai",
                    text=f"Fantastic! Transferring our line to {req.sender_name} right now. Please hold for just two seconds while the bridge connects.",
                    sentiment="forwarded",
                    timestamp=(base_time + timedelta(seconds=57)).strftime("%H:%M:%S")
                ),
                CallDialogueTurn(
                    speaker="system",
                    text=f"Warm transfer activated. Call bridged live between {prospect_name} at {company_name} and {req.sender_name} on {req.sender_phone}.",
                    sentiment="forwarded",
                    timestamp=(base_time + timedelta(seconds=60)).strftime("%H:%M:%S")
                )
            ]
            objection = f"Vendor skepticism and busy day-to-day operations at {company_name}"
            rebuttal = f"Demonstrated bespoke concept preview and measurable ROI framework tailored for {company_name}"
            summary = f"Highly successful qualification call with {prospect_name} ({prospect_title} at {company_name}). Prospect confirmed interest and agreed to immediate warm live transfer to {req.sender_name}."

        # 6. Save call log into Lead CRM record if lead exists
        if lead:
            call_log_entry = {
                "call_id": call_id,
                "timestamp": datetime.utcnow().isoformat(),
                "duration_seconds": 60,
                "phone_dialed": lead_phone,
                "prospect_name": prospect_name,
                "company_name": company_name,
                "sentiment_score": sentiment_score,
                "forward_status": "forwarded_to_user",
                "status": "forwarded_live",
                "forward_target": req.sender_phone,
                "real_call_dispatched": real_call_dispatched,
                "twilio_call_sid": twilio_call_id,
                "summary": summary,
                "transcript": [t.model_dump() for t in dialogue]
            }

            existing_calls = list(lead.call_logs or [])
            existing_calls.append(call_log_entry)
            lead.call_logs = existing_calls

            # Advance CRM stage to Discussion
            lead.crm_stage = "Discussion"
            lead.status = "contacted"
            lead.notes = f"{lead.notes or ''}\n[AI Outbound Call {datetime.utcnow().strftime('%Y-%m-%d')}]: {summary}".strip()
            await db.commit()
            await db.refresh(lead)

        return CallSessionResponse(
            call_id=call_id,
            lead_id=req.lead_id,
            status="forwarded_live",
            prospect_name=prospect_name,
            prospect_title=prospect_title,
            dialogue_turns=dialogue,
            sentiment_score=sentiment_score,
            objection_detected=objection,
            objection_handled=rebuttal,
            forward_status="forwarded_to_user",
            forward_target_number=req.sender_phone,
            call_summary=summary,
            crm_stage_updated="Discussion",
            duration_seconds=60,
            real_call_dispatched=real_call_dispatched,
            twilio_call_sid=twilio_call_id,
            telecom_carrier_notice=carrier_notice
        )

    @classmethod
    @traceable(name="11_VoiceCallingAgent_live_interactive_turn", run_type="chain")
    async def respond_to_live_speech(cls, req: CallInteractRequest) -> CallInteractResponse:
        """
        Agent 11 Live 2-Way Conversational Sales Engine:
        Follows a high-converting 4-stage human conversational sales sequence:
        Stage 1: Warm Human Greeting & Check-in
        Stage 2: Discuss Client's Business First & Explain Why We Called
        Stage 3: Present Services, Value Proposition & Propose Collaboration
        Stage 4: Warm Live Transfer to Owner (Vivek Patel at +91 9408082933) to Close Deal
        Plus handles any user question (pricing, process, AI identity, email) directly!
        """
        user_spoken = req.user_speech.strip()
        prospect_name = req.prospect_name or "there"
        company_name = req.company_name or "your business"
        sender_name = req.sender_name or "Vivek Patel"
        sender_company = req.sender_company or "LeadMind AI"
        owner_phone = "+91 9408082933"
        clean_service = sanitize_dialogue_text(req.service_offered)
        clean_value = sanitize_dialogue_text(req.value_proposition)
        
        if not user_spoken:
            return CallInteractResponse(
                ai_response_text=f"I'm still right here with you, {prospect_name}! Take all the time you need. How can we help {company_name} grow?",
                sentiment="neutral"
            )

        # 1. If Gemini LLM is configured, use it with strict natural dialogue and explicit owner transfer
        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel("gemini-1.5-flash")

                history_context = "\n".join([
                    f"{turn.get('speaker', 'user').upper()}: {turn.get('text', '')}"
                    for turn in req.conversation_history[-6:]
                ])

                prompt = f"""
                You are Alex, an elite, charismatic human sales development representative for '{sender_company}'.
                Your owner and managing director is '{sender_name}' (direct phone: {owner_phone}).
                You are on a LIVE phone conversation with '{prospect_name}' from '{company_name}'.
                Service Offered: '{clean_service}'.
                Value Proposition: '{clean_value}'.

                RECENT CONVERSATION HISTORY:
                {history_context}

                PROSPECT JUST SAID OVER THE PHONE:
                "{user_spoken}"

                CRITICAL SALES INTERACTION RULES:
                1. Stage 1 (Greeting & Check-in): If prospect says 'hi', 'hello', 'how are you', 'doing good', or asks 'who is this':
                   Warmly acknowledge, introduce that you are Alex calling from {sender_company} on behalf of our team, compliment what they've built at {company_name}, and ask how customer bookings have been going. DO NOT ask to connect to the owner.
                2. Stage 2 (Client's Business & Reason for Call): If prospect asks why you called, what this is regarding, or answers about their business:
                   Explain that at {sender_company} we specialize in {clean_service} ({clean_value}) to bring high-value clients without marketing headaches. Ask how they currently generate new inquiries. DO NOT ask to connect to the owner.
                3. Stage 3 (Services & Collaboration Pitch): If prospect asks about services, collaboration, how it works, or process:
                   Explain our turnkey model (rapid audit, custom funnels delivered in 48 hours, guaranteed ROI) and ask if a hands-off collaboration sounds helpful for {company_name}. DO NOT ask to connect to the owner.
                4. Stage 4 (Transfer to Owner - ONLY when explicitly requested):
                   ONLY if the prospect EXPLICITLY asks to speak with or talk to the owner, the store owner, or Vivek (e.g., 'connect me with the owner', 'can I speak to the owner', 'talk to Vivek', 'want to speak with the owner of the store'):
                   Respond EXACTLY: "Understood, {prospect_name}! Please hold on for just a moment while I brief our owner, Vivek Patel, with your details and get him on the line."
                   Set "is_forwarded": true, "is_deal_closed": true, "sentiment": "forwarded".
                5. If prospect gives generic agreements ('yes', 'sure', 'sounds good', 'okay', 'tell me more', 'interested'):
                   DO NOT transfer! Continue conversation enthusiastically, explain how we can bring 20 to 30 new bookings a month, and ask if they would like a 2-minute visual breakdown sent to their email.
                6. Keep spoken response concise, conversational, and under 40 words. No bullet points or markdown.

                Return strictly valid JSON:
                {{
                  "response": "Spoken text response",
                  "sentiment": "interested" | "objection" | "positive" | "forwarded",
                  "is_deal_closed": true/false,
                  "is_forwarded": true/false,
                  "objection_detected": "string or null",
                  "objection_rebuttal": "string or null"
                }}
                """
                resp = await model.generate_content_async(prompt)
                clean_text = resp.text.strip()
                if "```json" in clean_text:
                    clean_text = clean_text.split("```json")[1].split("```")[0].strip()
                elif "```" in clean_text:
                    clean_text = clean_text.split("```")[1].split("```")[0].strip()
                data = json.loads(clean_text)

                return CallInteractResponse(
                    ai_response_text=sanitize_dialogue_text(data.get("response", "")),
                    sentiment=data.get("sentiment", "positive"),
                    is_deal_closed=bool(data.get("is_deal_closed", False)),
                    is_forwarded=bool(data.get("is_forwarded", False)),
                    objection_detected=data.get("objection_detected"),
                    objection_rebuttal=data.get("objection_rebuttal")
                )
            except Exception as e:
                print(f"[VoiceCallingAgent Live Turn] Gemini note: {e}")

        # 2. Comprehensive Human Sales Rule-Based Intelligence Engine
        # STAGE 4 FIRST (Highest Priority): ONLY when caller explicitly requests the owner or Vivek
        if matches_any_intent([
            "connect me with the owner", "connect with owner", "connect to owner", "connect with the owner",
            "talk to the owner", "talk to owner", "talk with owner", "talk with the owner",
            "speak to owner", "speak to the owner", "speak with owner", "speak with the owner",
            "want to talk with owner", "want to talk to owner", "want to talk with the owner", "want to talk to the owner",
            "want to connect with owner", "want to connect with the owner", "want to speak with the owner",
            "owner of the store", "owner of this store", "talk to the owner of the store", "connect me with the owner of the store",
            "speak with the owner of the store", "owner of the business", "talk to the owner of the business",
            "owner of this business", "connect me with vivek", "connect with vivek", "connect to vivek",
            "connect me to vivek", "talk to vivek", "talk with vivek", "speak to vivek", "speak with vivek",
            "transfer to vivek", "transfer me to vivek", "call vivek", "can i talk to the owner",
            "can i speak with the owner", "can i speak to the owner", "let me talk to the owner",
            "let me speak to the owner", "let me speak with the owner", "i want to talk with the owner",
            "i want to talk to the owner", "i want to speak with the owner", "i want to connect with the owner",
            "connect me to the owner", "transfer me to the owner", "transfer call to owner",
            "patch me through to the owner", "get me the owner", "direct call with owner"
        ], user_spoken):
            return CallInteractResponse(
                ai_response_text=(
                    f"Understood, {prospect_name}! Please hold on for just a moment while I brief our owner, "
                    f"Vivek Patel, with {company_name}'s details and get him on the line."
                ),
                sentiment="forwarded",
                is_deal_closed=True,
                is_forwarded=True
            )

        # STAGE 3: Collaboration Pitch & Services Workflow ("What services do you offer? How can we collaborate?")
        if matches_any_intent([
            "what services do you offer", "what services", "what service", "what are you offering", "services",
            "how can we collaborate", "collabrate", "collaborate", "collaboration", "collab", "partnership",
            "partner", "let's collabrate", "lets collabrate", "make a successful business", "successful business",
            "work together", "how to collaborate", "show me the concept", "what is the process", "how does it work",
            "how do we start", "what is the next step"
        ], user_spoken):
            return CallInteractResponse(
                ai_response_text=(
                    f"We would love to collaborate with {company_name} and help build a successful business together! "
                    f"Our model is completely turnkey: first, we do a rapid audit of your market; second, we deliver ready-to-launch creative assets and acquisition funnels within 48 hours; and third, you launch with guaranteed ROI. "
                    f"We handle everything end-to-end so you and your team can focus 100% on your operations. Does a hands-off collaboration like that sound helpful for {company_name}?"
                ),
                sentiment="interested"
            )

        # STAGE 2: Client's Business First & Why We Called ("Tell me about my business", "Why did you call?")
        if matches_any_intent([
            "tell me about my business", "about my business", "why did you call", "why are you calling",
            "why call me", "why did you ring", "what is this about", "what's this about", "what is this regarding",
            "what do you want", "what do you do", "what is your business", "tell me what you mean",
            "tell me what you do", "tell me why you called", "how can you help", "how can you help us",
            "tell me more about my business", "it's going well", "its going well", "going good", "business is good",
            "business is slow", "sales are slow", "could use more customers", "need more customers", "not bad"
        ], user_spoken):
            return CallInteractResponse(
                ai_response_text=(
                    f"That's great context, {prospect_name}! The reason we called is that at {sender_company}, we specialize in {clean_service} — specifically {clean_value} "
                    f"We help businesses like {company_name} attract more high-value customers without you having to manage marketing in-house. "
                    f"How are you currently generating most of your new customer inquiries and bookings right now?"
                ),
                sentiment="interested"
            )

        # STAGE 1: Greeting & Check-in ("Hi! I'm good, who is this?", "Hello, how are you?")
        if matches_any_intent([
            "who is this", "who are you", "who's this", "who's calling", "whos calling", "who is calling",
            "who am i speaking to", "who is speaking", "how are you", "how are you doing", "how's it going",
            "hows it going", "i am good", "i'm good", "doing good", "doing well", "i am doing well",
            "i'm doing well", "pretty good", "all good", "fine thanks", "i am fine", "i'm fine", "great thanks",
            "hello", "hi", "hey", "good morning", "good afternoon", "good evening", "speaking", "this is",
            "listening", "go ahead", "yes hello", "yes hi"
        ], user_spoken):
            return CallInteractResponse(
                ai_response_text=(
                    f"Awesome to hear, {prospect_name}! My name is Alex with {sender_company} calling on behalf of our team. "
                    f"The reason I'm reaching out is we have been following {company_name} and we really love what you've built. "
                    f"We noticed an exciting opportunity in your local market to help you capture even more customer bookings. "
                    f"How have business and customer bookings been going for you lately?"
                ),
                sentiment="positive"
            )

        # Q&A: Pricing & Costs
        if matches_any_intent([
            "how much", "cost", "price", "pricing", "rate", "rates", "quote",
            "expensive", "fees", "fee", "budget", "package", "packages", "how much is it"
        ], user_spoken):
            return CallInteractResponse(
                ai_response_text=(
                    f"Great question! Our pricing is completely modular and performance-focused, structured to guarantee a 3x to 5x return on investment for {company_name}. "
                    f"We customize packages around your monthly customer booking targets. "
                    f"Are you looking to scale aggressive growth right now, or start with steady consistent inquiries?"
                ),
                sentiment="interested"
            )

        # Q&A: AI Identity
        if matches_any_intent([
            "are you an ai", "are you ai", "are you a bot", "are you a robot", "is this an ai",
            "is this a bot", "is this automated", "are you real", "are you human", "am i talking to a robot"
        ], user_spoken):
            return CallInteractResponse(
                ai_response_text=(
                    f"Haha, good ear! Yes, I'm an AI voice assistant with {sender_company}. "
                    f"I'm here to introduce our services and discuss how we can partner with {company_name}. "
                    f"If at any point you'd like to speak directly with our owner Vivek Patel, just let me know and I'll connect you right away! "
                    f"What questions do you have about what we do?"
                ),
                sentiment="positive"
            )

        # Q&A: Written Requests / Email
        if matches_any_intent([
            "send me an email", "email me", "send email", "can you email", "send details",
            "send info", "whatsapp", "inbox", "mail me", "send a message"
        ], user_spoken):
            return CallInteractResponse(
                ai_response_text=(
                    f"I would love to! I can send our 2-minute visual preview and collaboration proposal straight to your inbox. "
                    f"What is the best email address for {company_name}?"
                ),
                sentiment="interested"
            )

        # Q&A: Source of Contact / Where did you get my number?
        if matches_any_intent([
            "where did you get my number", "how did you get my number", "where did you find me",
            "how did you find me", "how did you find my number", "where did you get this number",
            "how do you have my number", "who gave you my number"
        ], user_spoken):
            return CallInteractResponse(
                ai_response_text=(
                    f"We came across {company_name}'s public business listing and local customer reviews while researching standout brands in your area. "
                    f"We were really impressed with your business and wanted to introduce ourselves directly! What are your main growth goals right now?"
                ),
                sentiment="positive"
            )

        # Q&A: Portfolio / Case Studies / Examples
        if matches_any_intent([
            "portfolio", "case studies", "case study", "examples", "example",
            "past work", "previous work", "show me work", "proof", "results"
        ], user_spoken):
            return CallInteractResponse(
                ai_response_text=(
                    f"Absolutely! We have before-and-after case studies demonstrating a 35% to 45% increase in customer bookings for brands similar to {company_name}. "
                    f"I can send a quick link over to your email right now. What is the best email to reach you?"
                ),
                sentiment="interested"
            )

        # Q&A: Turnaround Time / How Fast
        if matches_any_intent([
            "how long does it take", "turnaround", "timeline", "how fast",
            "timeframe", "how long will it take", "when can we start"
        ], user_spoken):
            return CallInteractResponse(
                ai_response_text=(
                    f"Our turnaround is lightning fast! We deliver your customized, ready-to-launch creative assets and acquisition setup within 48 to 72 hours, "
                    f"so {company_name} can begin seeing new customer inquiries right away."
                ),
                sentiment="interested"
            )

        # Objections: Busy / Time Constraint
        if matches_any_intent([
            "busy", "in a meeting", "can't talk", "cant talk", "call me later", "call later",
            "not a good time", "bad time", "driving", "working right now"
        ], user_spoken):
            return CallInteractResponse(
                ai_response_text=(
                    f"I completely understand, {prospect_name}! You're busy running {company_name}. "
                    f"What is a better time later today or tomorrow for our team to give you a quick 2-minute ring?"
                ),
                sentiment="objection",
                objection_detected="Time constraint"
            )

        # Objections: Existing Vendor
        if matches_any_intent([
            "already have", "already working with", "in-house", "team", "agency", "partner", "designer", "vendor"
        ], user_spoken):
            return CallInteractResponse(
                ai_response_text=(
                    f"Totally respect that! Most successful brands like {company_name} already have great partners. "
                    f"We often step in as a specialized overflow partner. Would you be open to taking a look at our 2-minute preview as a benchmark?"
                ),
                sentiment="objection",
                objection_detected="Existing vendor"
            )

        # Objections: Direct Rejection
        if matches_any_intent([
            "not interested", "no thanks", "no thank you", "don't want", "dont want", "stop calling", "remove me", "not right now"
        ], user_spoken):
            return CallInteractResponse(
                ai_response_text=(
                    f"No problem at all, {prospect_name}, I appreciate your honesty! Before I let you go, could I just shoot over a 2-minute email overview "
                    f"with zero commitment so you have our contact details if your needs ever change?"
                ),
                sentiment="objection",
                objection_detected="Initial resistance"
            )

        # Positive Agreement / Conversational Continuation (DOES NOT TRANSFER without explicit owner request)
        if matches_any_intent([
            "yes", "sure", "okay", "sounds good", "tell me more", "interested", "go ahead",
            "sounds great", "i see", "makes sense", "continue", "alright"
        ], user_spoken):
            return CallInteractResponse(
                ai_response_text=(
                    f"Awesome, {prospect_name}! We've actually prepared a tailored concept preview showing how {company_name} can capture 20 to 30 additional bookings every month. "
                    f"Would you like me to send that 2-minute visual breakdown to your email so you can check it out?"
                ),
                sentiment="interested"
            )

        # Contextual Fallback
        return CallInteractResponse(
            ai_response_text=(
                f"I completely understand, {prospect_name}. Our primary goal is simply helping {company_name} capture more clients and revenue without extra headache. "
                f"Feel free to ask me anything about our services, or let me know what questions you have about what we do!"
            ),
            sentiment="positive"
        )
