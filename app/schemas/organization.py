from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class OrganizationBase(BaseModel):
    name: str
    nick_name: Optional[str] = None
    kind: Optional[int] = 0
    sector: Optional[str] = None
    address: Optional[str] = None
    info: Optional[str] = None
    facebook: Optional[str] = None
    twitter: Optional[str] = None
    email: Optional[str] = None
    phone_number_organization: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    markers: Optional[List[str]] = []

class OrganizationResponse(OrganizationBase):
    id: int
    created_date: datetime
    created_by: Optional[int] = None
    admins: Optional[List[int]] = []
    organization_image: Optional[Dict[str, str]] = None
    markers: Optional[List[str]] = []
    is_crisis: bool = False
    stats: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone_number_organization: Optional[str] = None
    facebook: Optional[str] = None
    twitter: Optional[str] = None
    markers: Optional[List[str]] = None