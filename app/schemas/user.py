from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    last_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    last_name: Optional[str] = None
    username: Optional[str] = None
    kind: int
    
    # Image structure matching MongoDB
    user_image: Optional[Dict[str, str]] = None  # {big, medium, small}
    
    birth_date: Optional[datetime] = None
    sex: Optional[int] = None
    phone_number: Optional[str] = None
    
    # Social login flags
    facebook: bool = False
    twitter: bool = False
    google: bool = False
    
    # Follows structure matching MongoDB
    # [{companyId: int, opinions: [{opinion: str, status: int}]}]
    follows: Optional[List[Dict[str, Any]]] = None
    
    # Payment structure matching MongoDB
    # {plan: str, last4: str, expCard: str, subscriptionId: str, customerId: str, finalDatePlan: datetime}
    payment: Optional[Dict[str, Any]] = None
    
    register_date: Optional[datetime] = None
    last_login_date: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    last_name: Optional[str] = None
    birth_date: Optional[datetime] = None
    phone_number: Optional[str] = None
    sex: Optional[int] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserFollowUpdate(BaseModel):
    """Schema for updating user follows"""
    company_id: int
    opinions: Optional[List[Dict[str, Any]]] = []

class UserPaymentUpdate(BaseModel):
    """Schema for updating user payment info"""
    plan: Optional[str] = None
    last4: Optional[str] = None
    exp_card: Optional[str] = None
    subscription_id: Optional[str] = None
    customer_id: Optional[str] = None
    final_date_plan: Optional[datetime] = None