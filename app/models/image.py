from sqlalchemy import Column, Integer, String
from app.database import Base

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    src = Column(String(255))
    complaint_id = Column(Integer)