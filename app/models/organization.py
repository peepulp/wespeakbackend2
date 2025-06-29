from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, DECIMAL
from sqlalchemy.sql import func
from app.database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    nick_name = Column(String(255))
    created_date = Column(DateTime, default=func.now())
    created_by = Column(Integer)
    admins = Column(JSON)  # Array of admin user IDs
    kind = Column(Integer, default=0)  # 0: Company, 1: Elected, 2: Political Organization
    sector = Column(String(255))
    organization_image = Column(JSON)  # {big, medium, small}
    address = Column(String(255))
    info = Column(Text)
    org_identifier = Column(String(255))
    performance_detail = Column(Text)
    facebook = Column(String(255))
    twitter = Column(String(255))
    email = Column(String(255))
    phone_number_organization = Column(String(50))
    markers = Column(JSON)  # Array of strings
    is_crisis = Column(Boolean, default=False)
    stats = Column(JSON)  # Complex stats object