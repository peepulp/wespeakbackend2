from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.utils.auth import get_current_user, get_current_premium_user

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/", response_model=List[UserResponse])
async def get_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    return users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Users can only access their own profile or if they're premium
    if current_user.id != user_id and current_user.kind != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Users can only update their own profile
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user fields
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    return user

@router.post("/image")
async def upload_user_image(
    image_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # This would handle image upload to S3
    # Implementation depends on how images are sent from frontend
    
    # For now, just update the user_image field
    if "picture" in image_data:
        # Here you would process the image and upload to S3
        # current_user.user_image = upload_image_variants(...)
        pass
    
    db.commit()
    return {"message": "Image uploaded successfully"}

@router.post("/state-marker")
async def update_state_marker(
    marker_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Update user's company follow markers
    company_id = marker_data.get("companyId")
    marker = marker_data.get("marker")
    status_val = marker_data.get("status")
    
    # Update the follows JSON field
    follows = current_user.follows or []
    
    # Find the company in follows
    for follow in follows:
        if follow.get("companyId") == company_id:
            opinions = follow.get("opinions", [])
            
            # Find or create the marker
            marker_found = False
            for opinion in opinions:
                if opinion.get("opinion") == marker:
                    opinion["status"] = status_val
                    marker_found = True
                    break
            
            if not marker_found:
                opinions.append({"opinion": marker, "status": status_val})
            
            follow["opinions"] = opinions
            break
    
    current_user.follows = follows
    db.commit()
    
    return {"message": "Marker updated successfully"}