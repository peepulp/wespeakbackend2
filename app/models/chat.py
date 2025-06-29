from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from app.database import Base

class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer)
    company_id = Column(Integer)
    title = Column(String(255))
    last_message_date = Column(DateTime(6), default=func.now())
    user_id = Column(Integer)
    is_read_by_user = Column(Boolean, default=False)

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer)
    user_id = Column(Text)
    admin_user_id = Column(Integer)
    organization_of_admin = Column(Integer)
    message = Column(Text)
    sent_date = Column(DateTime(6), default=func.now())

class ChatCompany(Base):
    __tablename__ = "chat_companies"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer)
    company_id = Column(Integer)
    is_read_by_admin = Column(Boolean, default=False)