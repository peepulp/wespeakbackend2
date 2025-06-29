from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import httpx
import secrets
from app.database import get_db
from app.models.user import User
from app.utils.auth import get_password_hash, create_access_token
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["social-auth"])

@router.get("/google")
async def google_auth():
    """Redirect to Google OAuth"""
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={settings.BASE_URL}/api/auth/google/callback&"
        f"scope=openid email profile&"
        f"response_type=code"
    )
    return RedirectResponse(url=google_auth_url)

@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    try:
        # Exchange code for token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": f"{settings.BASE_URL}/api/auth/google/callback"
                }
            )
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            # Get user info
            user_response = await client.get(
                f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={access_token}"
            )
            user_info = user_response.json()
        
        email = user_info.get("email")
        name = user_info.get("name")
        picture = user_info.get("picture")
        
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        
        if user:
            # User exists, log them in
            token = create_access_token(data={"sub": user.email, "id": user.id, "name": user.name})
        else:
            # Create new user
            user = User(
                name=name,
                email=email,
                password=get_password_hash(secrets.token_urlsafe(20)),
                user_image={"small": picture, "medium": "", "big": ""},
                google=True,
                follows=[]
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            token = create_access_token(data={"sub": user.email, "id": user.id, "name": user.name})
        
        # Redirect with token (you might want to redirect to your frontend)
        return RedirectResponse(url=f"OAuthLogin://login?user={token}")
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/facebook")
async def facebook_auth():
    """Redirect to Facebook OAuth"""
    facebook_auth_url = (
        f"https://www.facebook.com/v18.0/dialog/oauth?"
        f"client_id={settings.FACEBOOK_CLIENT_ID}&"
        f"redirect_uri={settings.BASE_URL}/api/auth/facebook/callback&"
        f"scope=email,public_profile&"
        f"response_type=code"
    )
    return RedirectResponse(url=facebook_auth_url)

@router.get("/facebook/callback")
async def facebook_callback(code: str, db: Session = Depends(get_db)):
    """Handle Facebook OAuth callback"""
    try:
        async with httpx.AsyncClient() as client:
            # Exchange code for token
            token_response = await client.get(
                f"https://graph.facebook.com/v18.0/oauth/access_token?"
                f"client_id={settings.FACEBOOK_CLIENT_ID}&"
                f"client_secret={settings.FACEBOOK_CLIENT_SECRET}&"
                f"redirect_uri={settings.BASE_URL}/api/auth/facebook/callback&"
                f"code={code}"
            )
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            # Get user info
            user_response = await client.get(
                f"https://graph.facebook.com/me?fields=id,name,email,picture&access_token={access_token}"
            )
            user_info = user_response.json()
        
        email = user_info.get("email")
        name = user_info.get("name")
        picture = user_info.get("picture", {}).get("data", {}).get("url")
        
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        
        if user:
            token = create_access_token(data={"sub": user.email, "id": user.id, "name": user.name})
        else:
            # Create new user
            user = User(
                name=name,
                email=email,
                password=get_password_hash(secrets.token_urlsafe(20)),
                user_image={"small": picture, "medium": "", "big": ""},
                facebook=True,
                follows=[]
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            token = create_access_token(data={"sub": user.email, "id": user.id, "name": user.name})
        
        return RedirectResponse(url=f"OAuthLogin://login?user={token}")
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/twitter")
async def twitter_auth():
    """Redirect to Twitter OAuth"""
    # Twitter OAuth 1.0a is more complex and requires additional libraries
    # For now, return a placeholder
    raise HTTPException(status_code=501, detail="Twitter OAuth not implemented yet")

@router.get("/twitter/callback")
async def twitter_callback():
    """Handle Twitter OAuth callback"""
    raise HTTPException(status_code=501, detail="Twitter OAuth not implemented yet")