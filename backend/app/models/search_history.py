from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, JSON, Boolean, Float
from backend.app.database.session import Base
import uuid

class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, default="default_user")
    
    query = Column(String, nullable=False)
    parsed_requirements = Column(JSON, default=dict)
    search_plan = Column(JSON, default=dict)
    
    total_found = Column(Integer, default=0)
    high_match_count = Column(Integer, default=0)
    medium_match_count = Column(Integer, default=0)
    low_match_count = Column(Integer, default=0)
    
    excluded_previous = Column(Boolean, default=False)
    execution_time_seconds = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
