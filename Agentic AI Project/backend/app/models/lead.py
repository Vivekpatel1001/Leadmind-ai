from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from backend.app.database.session import Base
import uuid

class Lead(Base):
    __tablename__ = "leads"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, default="default_user")
    
    business_name = Column(String, index=True, nullable=False)
    normalized_name = Column(String, index=True, nullable=False)
    industry = Column(String, index=True, nullable=True)
    business_type = Column(String, nullable=True)
    
    country = Column(String, index=True, nullable=True)
    city = Column(String, index=True, nullable=True)
    region = Column(String, nullable=True)
    address = Column(String, nullable=True)
    
    website = Column(String, nullable=True)
    email = Column(String, nullable=True)  # Strictly "Not found" or authentic email
    phone = Column(String, nullable=True)  # Strictly "Not found" or authentic phone
    social_links = Column(JSON, default=dict) # e.g. {"linkedin": "", "twitter": "", "instagram": ""}
    description = Column(Text, nullable=True)
    
    # Provenance
    source = Column(String, default="Public Directory")
    source_url = Column(String, nullable=True)
    provenance = Column(JSON, default=list)
    sources_count = Column(Integer, default=1)
    verified = Column(Boolean, default=True)
    
    # AI Evaluation
    qualification = Column(String, default="MEDIUM") # HIGH, MEDIUM, LOW
    qualification_reasons = Column(JSON, default=list) # List of bullet strings
    lead_score = Column(Integer, default=70) # 0 - 100
    score_breakdown = Column(JSON, default=dict) # {location: 25, industry: 25, relevance: 20, data_quality: 15, other: 8}
    
    # Workflow & Organization
    search_ids = Column(JSON, default=list) # List of search IDs that yielded this lead
    tags = Column(JSON, default=list) # List of tag strings
    notes = Column(Text, default="")
    saved = Column(Boolean, default=False, index=True)
    status = Column(String, default="new", index=True) # new, contacted, irrelevant, converted
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    duplicate_status = Column(String, default="original") # original, merged

    # AI Sales & Outreach Pipeline Extensions
    crm_stage = Column(String, default="Discovered", index=True) # Discovered, Enriched, Pitched, Discussion, Won, Lost
    decision_makers = Column(JSON, default=list) # [{name, title, linkedin, email, confidence}]
    pitches = Column(JSON, default=dict) # {subject_lines, email_body, follow_ups, linkedin_note, tone}
    outreach_logs = Column(JSON, default=list) # [{channel, timestamp, content, status}]
    call_logs = Column(JSON, default=list) # [{call_id, timestamp, duration, transcript, sentiment, forward_status, summary}]
    email_campaigns = Column(JSON, default=list) # [{campaign_id, subject, body, status, sent_at, follow_ups}]
