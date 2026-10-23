from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, JSON, Text
from backend.app.database.session import Base
import uuid

class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, default="default_user")
    
    category = Column(String, index=True) # e.g. "target_country", "preferred_industry", "typical_lead_count", "exclusion_pattern"
    key = Column(String, index=True)      # e.g. "United Kingdom", "Graphic Design", "exclude_chains"
    value = Column(JSON, default=dict)    # e.g. {"count": 12, "last_used": "...", "notes": "..."}
    frequency = Column(Integer, default=1)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ConversationMemory(Base):
    __tablename__ = "conversation_memories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, default="default_user")
    
    role = Column(String, default="user") # user, assistant, system
    message = Column(Text, nullable=False)
    extracted_entities = Column(JSON, default=dict)
    associated_search_id = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
