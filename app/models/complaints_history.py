from sqlalchemy import Column, Integer, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base

class ComplaintsHistory(Base):
    __tablename__ = "complaints_history"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer)
    date = Column(DateTime, default=func.now())
    message = Column(Text)