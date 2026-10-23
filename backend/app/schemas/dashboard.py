from pydantic import BaseModel, Field
from typing import List, Dict, Any
from backend.app.schemas.search import SearchHistoryResponse
from backend.app.schemas.lead import LeadResponse

class DashboardMetrics(BaseModel):
    total_leads: int
    saved_leads: int
    total_searches: int
    new_leads_this_week: int
    high_match_count: int
    medium_match_count: int
    low_match_count: int
    recent_searches: List[SearchHistoryResponse] = Field(default_factory=list)
    recent_leads: List[LeadResponse] = Field(default_factory=list)
    top_industries: List[Dict[str, Any]] = Field(default_factory=list)
    top_locations: List[Dict[str, Any]] = Field(default_factory=list)
