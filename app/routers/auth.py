from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from datetime import timedelta
import secrets
from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.utils.auth import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    get_current_user
)
from app.utils.email import send_verification_email, send_password_reset_email
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/register", response_model=dict)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"The user with email {user.email} already exists"
        )
    
    # Get all organizations for follows initialization (matching MongoDB behavior)
    organizations = db.query(Organization).all()
    follows = []
    for org in organizations:
        follows.append({
            "companyId": org.id,
            "opinions": []
        })
    
    # Create new user with MongoDB-compatible structure
    verification_token = secrets.token_urlsafe(32)
    hashed_password = get_password_hash(user.password)
    
    db_user = User(
        name=user.name,
        last_name=user.last_name,
        email=user.email,
        password=hashed_password,
        verification_token=verification_token,
        user_image={
            "big": "",
            "medium": "",
            "small": "https://s3.amazonaws.com/complaints-wespeak/Users/Tester/avatar.png"
        },
        follows=follows,  # Initialize with all organizations
        payment={}  # Empty payment object
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Send verification email
    send_verification_email(user.email, user.name, verification_token)
    
    return {"message": f"Verification email sent to {user.email}"}

@router.post("/login", response_model=dict)
async def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token_expires = timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email, "id": db_user.id, "name": db_user.name},
        expires_delta=access_token_expires
    )
    
    # Update last login date
    from datetime import datetime
    db_user.last_login_date = datetime.utcnow()
    db.commit()
    
    return {
        "token": access_token,
        "message": "Login successful",
        "name": db_user.name,
        "email": db_user.email,
        "user": UserResponse.from_orm(db_user)
    }

@router.post("/welisten/login", response_model=dict)
async def welisten_login(user: UserLogin, db: Session = Depends(get_db)):
    """Premium user login for WeListen dashboard"""
    db_user = db.query(User).filter(User.email == user.email).first()
    
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials"
        )
    
    # Check if user is premium and has payment info
    if db_user.kind == 1 and db_user.payment and db_user.payment.get("customerId"):
        # Premium user with valid payment
        # Find organization where user is admin
        org = db.query(Organization).filter(
            Organization.admins.contains([db_user.id])
        ).first()
        
        access_token = create_access_token(
            data={
                "sub": db_user.email, 
                "id": db_user.id, 
                "kind": db_user.kind,
                "companyId": org.id if org else None
            }
        )
        
        return {
            "user": UserResponse.from_orm(db_user),
            "token": access_token,
            "dbOrg": org
        }
    elif db_user.kind == 0 and db_user.payment and db_user.payment.get("subscriptionId"):
        # Regular user with subscription
        return {
            "user": UserResponse.from_orm(db_user),
            "temp": True
        }
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized"
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse.from_orm(current_user)

@router.get("/welisten/me", response_model=dict)
async def get_current_premium_user_info(current_user: User = Depends(get_current_user)):
    """Get current premium user info for WeListen dashboard"""
    if current_user.kind == 1:
        # Premium user
        org = db.query(Organization).filter(
            Organization.admins.contains([current_user.id])
        ).first()
        
        return {
            "user": UserResponse.from_orm(current_user),
            "org": org
        }
    elif current_user.kind == 0 and current_user.payment and current_user.payment.get("subscriptionId"):
        return {
            "user": UserResponse.from_orm(current_user),
            "temp": True
        }
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid JWT token"
    )

@router.get("/email-verification")
async def verify_email(verificationToken: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == verificationToken).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This token URL is not associated with any user"
        )
    
    user.verification_token = None
    db.commit()
    
    return {"message": "User verification success"}

@router.post("/resetpassword")
async def reset_password(email: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Create reset token (expires in 15 minutes)
    reset_token = create_access_token(
        data={"sub": user.email, "id": user.id, "name": user.name},
        expires_delta=timedelta(minutes=15)
    )
    
    send_password_reset_email(user.email, user.name, reset_token)
    
    return {"message": "Password reset email sent"}

@router.get("/changepassword", response_class=HTMLResponse)
async def change_password_form(current_user: User = Depends(get_current_user)):
    html_content = """
    <form name="resetPass" method="post">
      <div class="form-control">
        <label>New Password</label>
        <input type="password" id="password" name="password" required />
      </div>
      <div class="form-control">
        <label>Repeat Password</label>
        <input type="password" id="confirm_password" name="confirm_password" required />
      </div>
      <div class="form-control">
        <span id='message'></span>
      </div>
      <button type="submit" class="btn btn-warning btn-block">Send</button>
    </form>
    
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
    <script>
      $('#password, #confirm_password').on('keyup', function () {
        if ($('#password').val() == $('#confirm_password').val()) {
          $('#message').html('Matching').css('color', 'green');
        } else
          $('#message').html('Not Matching').css('color', 'red');
      });
    </script>
    """
    return HTMLResponse(content=html_content)

@router.post("/changepassword")
async def change_password(
    password: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.password = get_password_hash(password)
    db.commit()
    
    return {"message": "Password was changed."}