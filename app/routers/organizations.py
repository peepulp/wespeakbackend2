from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.organization import Organization
from app.models.user import User
from app.schemas.organization import OrganizationResponse, OrganizationCreate, OrganizationUpdate
from app.utils.auth import get_current_user, get_current_premium_user
from app.utils.s3 import upload_image_variants

router = APIRouter(prefix="/api/organizations", tags=["organizations"])

@router.get("/", response_model=List[OrganizationResponse])
async def get_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    organizations = db.query(Organization).all()
    return organizations

@router.get("/page/{kind}", response_model=List[OrganizationResponse])
async def get_organizations_by_kind(
    kind: int,
    size: int = Query(20),
    page: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    organizations = db.query(Organization).filter(
        Organization.kind == kind
    ).order_by(Organization.name).offset(page).limit(size).all()
    return organizations

@router.get("/search", response_model=List[OrganizationResponse])
async def search_organizations(
    word: str = Query(...),
    size: int = Query(20),
    page: int = Query(0),
    db: Session = Depends(get_db)
):
    organizations = db.query(Organization).filter(
        Organization.name.like(f"{word}%")
    ).order_by(Organization.name).offset(page).limit(size).all()
    return organizations

@router.get("/public/", response_model=List[OrganizationResponse])
async def get_public_organizations(
    kind: int = Query(...),
    size: int = Query(20),
    page: int = Query(0),
    crisis: int = Query(0),
    sortBy: str = Query("score"),
    db: Session = Depends(get_db)
):
    query = db.query(Organization).filter(Organization.kind == kind)
    
    if crisis == 1:
        query = query.filter(Organization.is_crisis == True)
    
    # Handle sorting
    if sortBy == "score":
        # For JSON field sorting, you might need raw SQL or handle in Python
        organizations = query.offset(page).limit(size).all()
    else:
        order_field = getattr(Organization, sortBy, Organization.name)
        organizations = query.order_by(order_field).offset(page).limit(size).all()
    
    return organizations

@router.get("/{organization_id}", response_model=OrganizationResponse)
async def get_organization(
    organization_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    organization = db.query(Organization).filter(Organization.id == organization_id).first()
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    return organization

@router.get("/performancedetail/{name}", response_model=OrganizationResponse)
async def get_organization_by_name(
    name: str,
    db: Session = Depends(get_db)
):
    organization = db.query(Organization).filter(Organization.name == name).first()
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    return organization

@router.post("/follow")
async def follow_organization(
    follow_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    organization_id = follow_data.get("id")
    organization = db.query(Organization).filter(Organization.id == organization_id).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    follows = current_user.follows or []
    
    # Check if already following
    is_followed = any(follow.get("companyId") == organization_id for follow in follows)
    
    if not is_followed:
        default_markers = []
        if organization.markers:
            default_markers = [{"opinion": marker} for marker in organization.markers]
        else:
            default_markers = [{"opinion": ""}]
        
        follows.append({
            "companyId": organization_id,
            "opinions": default_markers
        })
        
        current_user.follows = follows
        db.commit()
    
    return {"follows": current_user.follows}

@router.post("/unfollow")
async def unfollow_organization(
    unfollow_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    organization_id = unfollow_data.get("id")
    follows = current_user.follows or []
    
    current_user.follows = [
        follow for follow in follows 
        if follow.get("companyId") != organization_id
    ]
    
    db.commit()
    return {"follows": current_user.follows}

@router.post("/neworganization", response_model=OrganizationResponse)
async def create_organization(
    org_data: dict,
    db: Session = Depends(get_db)
):
    # Check if organization already exists
    existing_org = db.query(Organization).filter(Organization.name == org_data["name"]).first()
    if existing_org:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The organization already exists"
        )
    
    # Handle image upload if provided
    organization_image = None
    if "organizationImage" in org_data:
        # Process image upload to S3
        # This would need to be implemented based on how images are sent
        pass
    
    new_org = Organization(
        name=org_data["name"],
        nick_name=org_data.get("nickName"),
        kind=org_data.get("kind", 0),
        sector=org_data.get("sector"),
        address=org_data.get("address"),
        info=org_data.get("info"),
        facebook=org_data.get("facebook"),
        twitter=org_data.get("twitter"),
        email=org_data.get("email"),
        phone_number_organization=org_data.get("phoneNumberOrganization"),
        markers=org_data.get("markers", []),
        organization_image=organization_image,
        stats={
            "complaintsCounter": 0,
            "score": 100,
            "replies": 0,
            "responseRate": 0,
            "resolves": 0,
            "resolveRate": 0,
            "totalResolves": 0,
            "reimbursed": 0,
            "gainedVotes": 0,
            "lostVotes": 0,
            "dataGraph": {
                "day": [0.0] * 12,
                "days": [0.0] * 31,
                "month": [0.0] * 12,
                "year": [0.0] * 12
            }
        }
    )
    
    db.add(new_org)
    db.commit()
    db.refresh(new_org)
    
    return new_org

@router.put("/welisten/editprofile", response_model=OrganizationResponse)
async def edit_organization_profile(
    org_data: OrganizationUpdate,
    current_user: User = Depends(get_current_premium_user),
    db: Session = Depends(get_db)
):
    # Find organization where user is admin
    organization = db.query(Organization).filter(
        Organization.admins.contains([current_user.id])
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found or access denied"
        )
    
    # Update organization fields
    update_data = org_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(organization, field, value)
    
    db.commit()
    db.refresh(organization)
    
    return organization