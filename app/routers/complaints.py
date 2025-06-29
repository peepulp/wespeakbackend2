from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.complaint import Complaint
from app.models.user import User
from app.models.organization import Organization
from app.schemas.complaint import ComplaintCreate, ComplaintResponse, ComplaintUpdate
from app.utils.auth import get_current_user, get_current_premium_user

router = APIRouter(prefix="/api/complaints", tags=["complaints"])

@router.post("/", response_model=ComplaintResponse)
async def create_complaint(
    complaint_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    complaint_info = complaint_data.get("complaint", {})
    
    new_complaint = Complaint(
        user_id=current_user.id,
        company_id=complaint_info["companyId"],
        topic=complaint_info["topic"],
        time=complaint_info.get("when"),
        message=complaint_info["message"],
        location=complaint_info.get("where", ""),
        anonymous=complaint_info.get("anonymous", False),
        hashtags=complaint_info.get("hashtags", []),
        angry_level=complaint_info.get("angryLevel"),
        reimbursement=complaint_info.get("reimbursement", False),
        reimbursement_amount=complaint_info.get("reimbursementAmount", 0),
        waiting_timer=complaint_info.get("waitingTimer", False),
        mood=complaint_info.get("mood"),
        state="submitted",
        state_dates=[],
        views=[],
        facebook_shares=[],
        twitter_shares=[],
        speaks_shares=[]
    )
    
    # Handle image uploads if provided
    if "pictures" in complaint_info and complaint_info["pictures"]:
        # Process image uploads to S3
        # This would need to be implemented based on how images are sent
        pass
    
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)
    
    return new_complaint

@router.get("/user/{user_id}", response_model=List[ComplaintResponse])
async def get_user_complaints(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Users can only access their own complaints
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    complaints = db.query(Complaint).filter(
        Complaint.user_id == user_id
    ).order_by(Complaint.created.desc()).all()
    
    return complaints

@router.get("/organization/", response_model=List[ComplaintResponse])
async def get_all_complaints(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    complaints = db.query(Complaint).order_by(Complaint.created.desc()).all()
    return complaints

@router.get("/organization/{organization_id}", response_model=List[ComplaintResponse])
async def get_organization_complaints(
    organization_id: int,
    size: int = Query(20),
    page: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    complaints = db.query(Complaint).filter(
        Complaint.company_id == organization_id
    ).order_by(Complaint.created.desc()).offset(page).limit(size).all()
    
    return complaints

@router.get("/myfeed", response_model=List[ComplaintResponse])
async def get_user_feed(
    size: int = Query(20),
    page: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get companies user follows
    follows = current_user.follows or []
    company_ids = [follow.get("companyId") for follow in follows]
    
    complaints = db.query(Complaint).filter(
        Complaint.company_id.in_(company_ids),
        Complaint.state.in_(["submitted", "opened", "responded"])
    ).order_by(Complaint.created.desc()).offset(page).limit(size).all()
    
    return complaints

@router.get("/crisis", response_model=List[ComplaintResponse])
async def get_crisis_complaints(
    size: int = Query(20),
    page: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get organizations in crisis
    crisis_orgs = db.query(Organization).filter(
        Organization.is_crisis == True
    ).order_by(Organization.stats["complaintsCounter"].desc()).limit(5).all()
    
    org_ids = [org.id for org in crisis_orgs]
    
    complaints = db.query(Complaint).filter(
        Complaint.company_id.in_(org_ids)
    ).order_by(Complaint.created.desc()).offset(page).limit(size).all()
    
    return complaints

@router.put("/change-state/{complaint_id}", response_model=ComplaintResponse)
async def change_complaint_state(
    complaint_id: int,
    state_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    new_state = state_data.get("state")
    complaint.state = new_state
    
    if new_state in ["resolved", "reimbursed"]:
        complaint.reopen = False
    
    # Update state dates
    state_dates = complaint.state_dates or []
    # Add logic to update state dates based on new state
    
    db.commit()
    db.refresh(complaint)
    
    return complaint

@router.put("/reopen-complaint/{complaint_id}", response_model=ComplaintResponse)
async def reopen_complaint(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    if not complaint.reopen:
        complaint.state = "opened"
        complaint.reopen = True
        db.commit()
    
    db.refresh(complaint)
    return complaint

@router.post("/viewcrisis/{complaint_id}")
async def view_complaint(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    views = complaint.views or []
    if current_user.id not in views:
        views.append(current_user.id)
        complaint.views = views
        db.commit()
    
    return {"views": len(views)}

@router.post("/shares-count/{kind}/{complaint_id}")
async def share_complaint(
    kind: int,  # 0: Facebook, 1: Twitter
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    if kind == 0:  # Facebook
        shares = complaint.facebook_shares or []
        if current_user.id not in shares:
            shares.append(current_user.id)
            complaint.facebook_shares = shares
    else:  # Twitter
        shares = complaint.twitter_shares or []
        if current_user.id not in shares:
            shares.append(current_user.id)
            complaint.twitter_shares = shares
    
    # Update speaks_shares
    speaks_shares = complaint.speaks_shares or []
    if current_user.id not in speaks_shares:
        speaks_shares.append(current_user.id)
        complaint.speaks_shares = speaks_shares
    
    db.commit()
    
    return {"shares": len(shares)}