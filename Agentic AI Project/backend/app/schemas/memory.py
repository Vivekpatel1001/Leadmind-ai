from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserPreferenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    category: str
    key: str
    value: Dict[str, Any]
    frequency: int
    updated_at: datetime

class MemoryQueryRequest(BaseModel):
    query: str
    user_id: str = "default_user"

class MemoryQueryResponse(BaseModel):
    answer: str
    intent: str
    matched_preferences: List[Dict[str, Any]] = Field(default_factory=list)
    matched_searches: List[Dict[str, Any]] = Field(default_factory=list)
    matched_leads: List[Dict[str, Any]] = Field(default_factory=list)
    suggested_action: Optional[str] = None
