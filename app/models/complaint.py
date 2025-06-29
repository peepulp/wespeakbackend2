from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, Boolean, DECIMAL, JSON
from sqlalchemy.sql import func
from app.database import Base
import enum

class ComplaintState(str, enum.Enum):
    submitted = "submitted"
    opened = "opened"
    responded = "responded"
    unresolved = "unresolved"
    resolved = "resolved"
    reimbursed = "reimbursed"

class ComplaintMood(str, enum.Enum):
    ok = "ok"
    slightly_mad = "slightly_mad"
    on_fire = "on_fire"

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, default=-1)
    company_id = Column(Integer, nullable=False)
    subject = Column(String(255))
    author = Column(String(255))
    created_by = Column(Integer)
    topic = Column(String(255))
    time = Column(DateTime)
    created = Column(DateTime, default=func.now())
    finished = Column(DateTime)
    location = Column(String(255))
    state = Column(Enum(ComplaintState), default=ComplaintState.submitted)
    state_dates = Column(JSON)
    hashtags = Column(JSON)
    anonymous = Column(Boolean, default=False)
    reimbursement = Column(Boolean, default=False)
    reimbursement_amount = Column(DECIMAL(10, 2))
    waiting_timer = Column(Boolean, default=False)
    twitter = Column(Boolean, default=False)
    facebook_shares = Column(JSON)
    twitter_shares = Column(JSON)
    speaks_shares = Column(JSON)
    views = Column(JSON)
    reopen = Column(Boolean, default=False)
    mood = Column(Enum(ComplaintMood))
    angry_level = Column(DECIMAL(2, 1))
    message = Column(Text)
    description = Column(Text)