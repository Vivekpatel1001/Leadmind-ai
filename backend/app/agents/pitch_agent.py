import json
from typing import Dict, Any, Optional, List
from backend.app.core.tracing import traceable
from backend.app.core.config import settings
from backend.app.schemas.outreach import PitchRequest, PitchResponse

class PitchAgent:
    """
    Agent 8 — AI Cold Outreach & Pitch Agent
    Responsibilities:
    - Generate hyper-personalized cold outreach emails
    - Craft subject lines, follow-up sequences, and LinkedIn connection notes
    - Adapt messaging based on business profile, target service, and tone
    """

    @classmethod
    @traceable(name="8_PitchAgent_generate", run_type="chain")
    async def generate_pitch(cls, req: PitchRequest) -> PitchResponse:
        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel("gemini-1.5-flash")

                prompt = f"""
                You are an elite B2B sales copywriter. Write a high-converting, personalized cold outreach package for the following prospect:

                Prospect Business: {req.business_name}
                Industry: {req.industry or 'Business'}
                Location: {req.city or ''}, {req.country or ''}
                Website: {req.website or 'N/A'}
                Our Offered Service: {req.offer_service}
                Sender: {req.sender_name} from {req.sender_company}
                Tone: {req.tone}

                Return ONLY valid JSON with keys:
                - "subject_lines": list of 3 punchy, high-open subject lines (no spam words)
                - "email_body": personalized cold email (under 130 words, clear icebreaker, pain point, value proposition, and low-friction CTA)
                - "follow_up_day3": quick 3-day bump email (under 50 words)
                - "follow_up_day7": 7-day polite final nudge / value share (under 60 words)
                - "linkedin_note": personalized LinkedIn connection request message (strictly under 300 characters)
                - "value_proposition": one-sentence core value hook
                - "call_to_action": direct call to action sentence
                """

                response = await model.generate_content_async(prompt)
                clean_text = response.text.strip()
                if "```json" in clean_text:
                    clean_text = clean_text.split("```json")[1].split("```")[0].strip()
                elif "```" in clean_text:
                    clean_text = clean_text.split("```")[1].split("```")[0].strip()
                
                data = json.loads(clean_text)
                return PitchResponse(
                    lead_id=req.lead_id,
                    business_name=req.business_name,
                    subject_lines=data.get("subject_lines", []),
                    email_body=data.get("email_body", ""),
                    follow_up_day3=data.get("follow_up_day3", ""),
                    follow_up_day7=data.get("follow_up_day7", ""),
                    linkedin_note=data.get("linkedin_note", ""),
                    value_proposition=data.get("value_proposition", ""),
                    call_to_action=data.get("call_to_action", ""),
                    tone=req.tone or "professional"
                )
            except Exception as e:
                print(f"[PitchAgent] Gemini pitch generation note: {e}")

        # High-Converting Deterministic Copywriting Engine Fallback
        return cls._generate_heuristic_pitch(req)

    @classmethod
    def _generate_heuristic_pitch(cls, req: PitchRequest) -> PitchResponse:
        bname = req.business_name
        service = req.offer_service or "Growth & Digital Solutions"
        sender = req.sender_name or "Sales Team"
        company = req.sender_company or "Our Agency"
        location = req.city or (req.country or "your area")
        tone = (req.tone or "professional").lower()

        if tone == "casual":
            subjects = [
                f"Quick question regarding {bname}",
                f"Loved your work at {bname} - quick thought",
                f"{bname} + {service} idea"
            ]
            body = (
                f"Hi team at {bname},\n\n"
                f"Came across {bname} in {location} and was genuinely impressed by your brand presence.\n\n"
                f"We specialize in {service} for leading businesses in your space, helping them increase customer conversions and streamline digital acquisition.\n\n"
                f"Would love to share 2 quick ideas that worked wonders for similar companies. Are you open to a 5-minute chat this Thursday?\n\n"
                f"Best,\n{sender}\n{company}"
            )
        elif tone == "direct":
            subjects = [
                f"Partnering with {bname} on {service}",
                f"{service} for {bname}",
                f"New customer pipeline for {bname}"
            ]
            body = (
                f"Hello,\n\n"
                f"I'm reaching out directly because {company} helps businesses like {bname} in {location} implement high-ROI {service}.\n\n"
                f"In the past quarter, our clients have seen a 35%+ increase in qualified inquiries within 30 days.\n\n"
                f"Can I send over a 2-minute overview of how we can do the same for {bname}?\n\n"
                f"Regards,\n{sender}"
            )
        elif tone == "value_first":
            subjects = [
                f"Free audit & growth ideas for {bname}",
                f"Quick insight for {bname}'s digital presence",
                f"How {bname} can capture more market share in {location}"
            ]
            body = (
                f"Hi {bname} Team,\n\n"
                f"While reviewing top companies in {location}, I put together a quick audit on how {bname} can leverage {service} to outpace local competition.\n\n"
                f"We identified 3 untapped opportunities that could immediately improve your customer acquisition without increasing ad spend.\n\n"
                f"Happy to send the teardown over for free. Should I email the PDF here?\n\n"
                f"Warmly,\n{sender}\n{company}"
            )
        else: # professional
            subjects = [
                f"Partnership opportunity: {bname} & {company}",
                f"Enhancing {bname}'s market reach with {service}",
                f"Strategic proposal for {bname}"
            ]
            body = (
                f"Dear {bname} Leadership,\n\n"
                f"I hope this message finds you well. I've been following {bname}'s success in {location} and wanted to reach out regarding a strategic opportunity.\n\n"
                f"At {company}, we partner with industry leaders to deliver tailored {service} that drive measurable revenue growth and brand authority.\n\n"
                f"Would you be open to a brief 10-minute introductory call next week to explore if there is mutual alignment?\n\n"
                f"Sincerely,\n{sender}\n{company}"
            )

        follow_up_3 = (
            f"Hi team, just following up on my previous note regarding {service} for {bname}. "
            f"Would you have 5 minutes this week to connect?"
        )
        follow_up_7 = (
            f"Hi {bname} team, wanted to make sure this didn't get buried. "
            f"If timing isn't right for {service} right now, no problem at all. Happy to stay in touch!"
        )
        linkedin_note = (
            f"Hi! Loved what you're building at {bname} in {location}. Would love to connect and share some insights on {service}."
        )[:295]

        val_prop = f"Accelerate customer acquisition for {bname} with proven {service} strategies."
        cta = "Are you available for a brief 5-minute introductory call this week?"

        return PitchResponse(
            lead_id=req.lead_id,
            business_name=bname,
            subject_lines=subjects,
            email_body=body,
            follow_up_day3=follow_up_3,
            follow_up_day7=follow_up_7,
            linkedin_note=linkedin_note,
            value_proposition=val_prop,
            call_to_action=cta,
            tone=tone
        )
