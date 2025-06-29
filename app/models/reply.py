from sqlalchemy import Column, Integer, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Reply(Base):
    __tablename__ = "replies"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, nullable=False)
    message = Column(Text)
    sent = Column(DateTime, default=func.now())