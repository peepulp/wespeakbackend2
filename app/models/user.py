from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, DECIMAL
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    last_name = Column(String(255))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    verification_token = Column(String(255))
    username = Column(String(255))
    kind = Column(Integer, default=0)  # 0: Client, 1: Premium
    
    # Image storage - matches MongoDB userImage structure
    user_image = Column(JSON)  # {big: str, medium: str, small: str}
    
    birth_date = Column(DateTime)
    sex = Column(Integer, default=2)  # 0: Male, 1: Female, 2: NA
    phone_number = Column(String(50))
    
    # Social login flags
    facebook = Column(Boolean, default=False)
    twitter = Column(Boolean, default=False)
    google = Column(Boolean, default=False)
    
    # Follows structure - matches MongoDB follows array
    # [{companyId: ObjectId, opinions: [{opinion: str, status: int}]}]
    follows = Column(JSON)
    
    # Payment information - matches MongoDB payment structure
    # {plan: str, last4: str, expCard: str, subscriptionId: str, customerId: str, finalDatePlan: Date}
    payment = Column(JSON)
    
    # Date fields
    register_date = Column(DateTime, default=func.now())
    last_login_date = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())