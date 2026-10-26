from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class ScoreBreakdown(BaseModel):
    location: int = 0
    industry: int = 0
    relevance: int = 0
    data_quality: int = 0
    other: int = 0
    total: int = 0
    query_fit: int = 0

class LeadBase(BaseModel):
    business_name: str
    industry: Optional[str] = None
    business_type: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = "Not found"
    phone: Optional[str] = "Not found"
    social_links: Dict[str, str] = Field(default_factory=dict)
    description: Optional[str] = None
    source: str = "Public Business Directory"
    source_url: Optional[str] = None
    provenance: List[Dict[str, Any]] = Field(default_factory=list)
    sources_count: int = 1
    verified: bool = True
    qualification: str = "MEDIUM"
    qualification_reasons: List[str] = Field(default_factory=list)
    lead_score: int = 70
    score_breakdown: Dict[str, int] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    notes: str = ""
    saved: bool = False
    status: str = "new"
    crm_stage: str = "Discovered"
    decision_makers: List[Dict[str, Any]] = Field(default_factory=list)
    pitches: Dict[str, Any] = Field(default_factory=dict)
    outreach_logs: List[Dict[str, Any]] = Field(default_factory=list)

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    saved: Optional[bool] = None
    status: Optional[str] = None
    crm_stage: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    decision_makers: Optional[List[Dict[str, Any]]] = None
    pitches: Optional[Dict[str, Any]] = None
    outreach_logs: Optional[List[Dict[str, Any]]] = None

class LeadResponse(LeadBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    search_ids: List[str] = Field(default_factory=list)
    duplicate_status: str = "original"
    created_at: datetime
    updated_at: datetime
    last_seen: datetime

class LeadListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int
    limit: int
    offset: int
    leads: List[LeadResponse]

class LeadFilterParams(BaseModel):
    query: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    industry: Optional[str] = None
    min_score: Optional[int] = None
    qualification: Optional[str] = None
    has_email: Optional[bool] = None
    has_phone: Optional[bool] = None
    has_website: Optional[bool] = None
    saved_only: Optional[bool] = None
    status: Optional[str] = None
    tag: Optional[str] = None
    limit: int = 50
    offset: int = 0
