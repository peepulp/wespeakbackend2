from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.chat import Chat, ChatMessage, ChatCompany
from app.models.complaint import Complaint
from app.models.user import User
from app.utils.auth import get_current_user, get_current_premium_user

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.get("/chatlist")
async def get_chat_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.kind == 1:  # Premium user (admin)
        # Get chats for organizations where user is admin
        chats = db.query(Chat).join(ChatCompany).filter(
            ChatCompany.company_id.in_(get_user_admin_companies(current_user.id, db))
        ).order_by(Chat.last_message_date.desc()).all()
    else:
        # Regular user - get their own chats
        chats = db.query(Chat).filter(
            Chat.user_id == current_user.id
        ).order_by(Chat.last_message_date.desc()).all()
    
    return chats

@router.get("/{complaint_id}")
async def get_chat(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get complaint first
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    # Check access permissions
    if complaint.user_id != current_user.id and current_user.kind != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get chat
    chat = db.query(Chat).filter(Chat.complaint_id == complaint_id).first()
    
    if chat:
        # Mark as read
        if current_user.kind == 1:  # Admin
            # Update admin read status
            chat_company = db.query(ChatCompany).filter(
                ChatCompany.chat_id == chat.id,
                ChatCompany.company_id.in_(get_user_admin_companies(current_user.id, db))
            ).first()
            if chat_company:
                chat_company.is_read_by_admin = True
        else:  # User
            chat.is_read_by_user = True
        
        db.commit()
        
        # Get messages
        messages = db.query(ChatMessage).filter(
            ChatMessage.chat_id == chat.id
        ).order_by(ChatMessage.sent_date).all()
        
        return {
            "chat": chat,
            "messages": messages,
            "complaint": complaint
        }
    
    return {"chat": None, "messages": [], "complaint": complaint}

@router.post("/{complaint_id}")
async def send_message(
    complaint_id: int,
    message_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    # Check access permissions
    if complaint.user_id != current_user.id and current_user.kind != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get or create chat
    chat = db.query(Chat).filter(Chat.complaint_id == complaint_id).first()
    
    if not chat:
        # Create new chat
        chat = Chat(
            complaint_id=complaint_id,
            company_id=complaint.company_id,
            title=complaint.topic,
            user_id=complaint.user_id,
            is_read_by_user=(complaint.user_id == current_user.id)
        )
        db.add(chat)
        db.commit()
        db.refresh(chat)
        
        # Create chat company entry
        chat_company = ChatCompany(
            chat_id=chat.id,
            company_id=complaint.company_id,
            is_read_by_admin=(current_user.kind == 1)
        )
        db.add(chat_company)
    
    # Add message
    new_message = ChatMessage(
        chat_id=chat.id,
        user_id=str(current_user.id) if current_user.kind == 0 else None,
        admin_user_id=current_user.id if current_user.kind == 1 else None,
        organization_of_admin=get_user_admin_company(current_user.id, db) if current_user.kind == 1 else None,
        message=message_data["message"]
    )
    
    db.add(new_message)
    
    # Update chat
    chat.last_message_date = new_message.sent_date
    chat.is_read_by_user = (complaint.user_id == current_user.id)
    
    # Update chat company read status
    if current_user.kind == 1:
        chat_companies = db.query(ChatCompany).filter(ChatCompany.chat_id == chat.id).all()
        for cc in chat_companies:
            cc.is_read_by_admin = (cc.company_id == get_user_admin_company(current_user.id, db))
    
    db.commit()
    
    return {"message": "Message sent successfully", "chat": chat}

def get_user_admin_companies(user_id: int, db: Session) -> List[int]:
    """Get list of company IDs where user is admin"""
    from app.models.organization import Organization
    orgs = db.query(Organization).filter(
        Organization.admins.contains([user_id])
    ).all()
    return [org.id for org in orgs]

def get_user_admin_company(user_id: int, db: Session) -> int:
    """Get first company ID where user is admin"""
    companies = get_user_admin_companies(user_id, db)
    return companies[0] if companies else None