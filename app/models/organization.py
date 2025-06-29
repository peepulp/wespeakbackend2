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
    
    # Admins array - matches MongoDB structure [userId1, userId2, ...]
    admins = Column(JSON)  # Array of admin user IDs
    
    kind = Column(Integer, default=0)  # 0: Company, 1: Elected, 2: Political Organization
    sector = Column(String(255))
    
    # Image structure matching MongoDB organizationImage
    organization_image = Column(JSON)  # {big: str, medium: str, small: str}
    
    address = Column(String(255))
    info = Column(Text)
    org_identifier = Column(String(255))
    performance_detail = Column(Text)
    facebook = Column(String(255))
    twitter = Column(String(255))
    email = Column(String(255))
    phone_number_organization = Column(String(50))
    
    # Markers array - matches MongoDB structure
    markers = Column(JSON)  # Array of strings
    
    is_crisis = Column(Boolean, default=False)
    
    # Stats structure matching MongoDB
    # {
    #   complaintsCounter: int,
    #   score: float,
    #   replies: int,
    #   responseRate: float,
    #   resolves: int,
    #   resolveRate: float,
    #   totalResolves: int,
    #   reimbursed: int,
    #   gainedVotes: int,
    #   lostVotes: int,
    #   dataGraph: {
    #     day: [float] * 12,
    #     days: [float] * 31,
    #     month: [float] * 12,
    #     year: [float] * 12
    #   },
    #   votes: [{user: ObjectId, gained: bool, date: Date}]
    # }
    stats = Column(JSON)