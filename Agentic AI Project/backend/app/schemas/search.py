from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class RequirementPayload(BaseModel):
    country: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    industry: Optional[str] = None
    business_type: Optional[str] = None
    service: Optional[str] = None
    company_size: Optional[str] = None
    lead_count: int = 25
    exclusions: List[str] = Field(default_factory=list)
    must_have_email: bool = False
    must_have_phone: bool = False
    must_have_website: bool = False
    new_leads_only: bool = False
    clarification_needed: Optional[str] = None
    target_query: Optional[str] = None
    raw_query: Optional[str] = None

class SearchRequest(BaseModel):
    query: str
    manual_overrides: Optional[RequirementPayload] = None
    new_leads_only: bool = False
    user_id: str = "default_user"

class AgentStepEvent(BaseModel):
    step: str # "understanding", "planning", "researching", "deduplicating", "qualifying", "scoring", "memory_check", "complete", "error"
    title: str
    message: str
    progress: int # 0 to 100
    data: Optional[Dict[str, Any]] = None

class SearchHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    query: str
    parsed_requirements: Dict[str, Any]
    total_found: int
    high_match_count: int
    medium_match_count: int
    low_match_count: int
    excluded_previous: bool
    execution_time_seconds: float
    created_at: datetime
