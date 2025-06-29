from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import random
from app.database import get_db
from app.models.company import Company
from app.models.complaint import Complaint
from app.models.reply import Reply
from app.models.image import Image
from app.schemas.company import CompanyResponse
from app.schemas.complaint import ComplaintCreate, ComplaintResponse

router = APIRouter(prefix="/api/data", tags=["data"])

@router.get("/companies", response_model=List[CompanyResponse])
async def get_companies(db: Session = Depends(get_db)):
    companies = db.query(Company).all()
    return companies

@router.get("/companies/{company_id}")
async def get_company_stats(company_id: int):
    # Generate random statistics as in the original
    data_array = [random.uniform(0, 20) for _ in range(12)]
    
    random_data = {
        "dataChart": data_array,
        "number": random.randint(0, 100),
        "percentage": f"{random.uniform(0, 100):.2f}%",
        "replies": random.randint(0, 100000),
        "votesGained": random.randint(0, 1000),
        "votesLost": random.randint(0, 1000),
        "resolved": f"{random.uniform(0, 100):.2f}%",
        "reimbursed": f"{random.uniform(0, 100):.2f}%",
        "info": "WeListen score",
        "score": random.uniform(0, 200)
    }
    
    return random_data

@router.get("/complaints")
async def get_complaints(db: Session = Depends(get_db)):
    complaints = db.query(Complaint).all()
    
    # Add related data for each complaint
    result = []
    for complaint in complaints:
        complaint_dict = complaint.__dict__.copy()
        
        # Get replies
        replies = db.query(Reply).filter(Reply.complaint_id == complaint.id).all()
        complaint_dict["replies"] = [reply.__dict__ for reply in replies]
        
        # Get images
        images = db.query(Image).filter(Image.complaint_id == complaint.id).all()
        complaint_dict["images"] = [image.__dict__ for image in images]
        
        # Get company
        company = db.query(Company).filter(Company.id == complaint.company_id).first()
        complaint_dict["company"] = company.__dict__ if company else None
        
        result.append(complaint_dict)
    
    return result

@router.post("/complaints/insert")
async def insert_complaint(complaint_data: dict, db: Session = Depends(get_db)):
    complaint = complaint_data.get("complaint", {})
    
    new_complaint = Complaint(
        subject=complaint.get("subject"),
        author=complaint.get("author"),
        topic=complaint.get("topic"),
        state="unresolved",
        mood=complaint.get("mood"),
        company_id=complaint.get("companyId"),
        user_id=complaint.get("userId"),
        message=complaint.get("message"),
        description=complaint.get("description"),
        anonymous=complaint.get("anonymous", False),
        angry_level=complaint.get("angryLevel"),
        reimbursement=complaint.get("reimbursement", False),
        reimbursement_amount=complaint.get("reimbursementAmount", 0),
        waiting_timer=complaint.get("waitingTimer", False)
    )
    
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)
    
    return new_complaint

@router.post("/complaints/{complaint_id}/edit")
async def edit_complaint(complaint_id: int, complaint_data: dict, db: Session = Depends(get_db)):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    update_data = complaint_data.get("complaint", {})
    
    if "description" in update_data:
        complaint.description = update_data["description"]
    if "state" in update_data:
        complaint.state = update_data["state"]
    
    db.commit()
    return {"message": "Complaint updated successfully"}

@router.get("/complaints/company/{company_id}")
async def get_complaints_by_company(company_id: int, db: Session = Depends(get_db)):
    complaints = db.query(Complaint).filter(Complaint.company_id == company_id).all()
    return complaints

@router.get("/complaints/user/{user_id}")
async def get_complaints_by_user(user_id: int, db: Session = Depends(get_db)):
    complaints = db.query(Complaint).filter(Complaint.user_id == user_id).all()
    return complaints

@router.get("/replies/{complaint_id}")
async def get_replies(complaint_id: int, db: Session = Depends(get_db)):
    replies = db.query(Reply).filter(Reply.complaint_id == complaint_id).all()
    return replies

@router.post("/replies/insert")
async def insert_reply(reply_data: dict, db: Session = Depends(get_db)):
    new_reply = Reply(
        complaint_id=reply_data["complaintId"],
        message=reply_data["message"]
    )
    
    db.add(new_reply)
    db.commit()
    db.refresh(new_reply)
    
    return new_reply

@router.get("/images/{complaint_id}")
async def get_images(complaint_id: int, db: Session = Depends(get_db)):
    images = db.query(Image).filter(Image.complaint_id == complaint_id).all()
    return images