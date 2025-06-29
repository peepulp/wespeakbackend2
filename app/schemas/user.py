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
    kind: int
    user_image: Optional[Dict[str, str]] = None
    birth_date: Optional[datetime] = None
    sex: Optional[int] = None
    phone_number: Optional[str] = None
    facebook: bool = False
    twitter: bool = False
    google: bool = False
    follows: Optional[List[Dict[str, Any]]] = None
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