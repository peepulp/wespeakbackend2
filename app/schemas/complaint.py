from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.complaint import ComplaintState, ComplaintMood

class ComplaintBase(BaseModel):
    subject: Optional[str] = None
    topic: Optional[str] = None
    message: Optional[str] = None
    location: Optional[str] = None

class ComplaintCreate(ComplaintBase):
    company_id: int
    author: Optional[str] = None
    mood: Optional[ComplaintMood] = None
    anonymous: Optional[bool] = False
    reimbursement: Optional[bool] = False
    reimbursement_amount: Optional[float] = 0
    waiting_timer: Optional[bool] = False
    hashtags: Optional[List[str]] = []
    angry_level: Optional[float] = None

class ComplaintResponse(ComplaintBase):
    id: int
    user_id: int
    company_id: int
    author: Optional[str] = None
    state: ComplaintState
    mood: Optional[ComplaintMood] = None
    created: datetime
    anonymous: bool
    reimbursement: bool
    views: Optional[List[int]] = []
    facebook_shares: Optional[List[int]] = []
    twitter_shares: Optional[List[int]] = []
    speaks_shares: Optional[List[int]] = []

    class Config:
        from_attributes = True

class ComplaintUpdate(BaseModel):
    state: Optional[ComplaintState] = None
    description: Optional[str] = None