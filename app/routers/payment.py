from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import stripe
from app.database import get_db
from app.models.user import User
from app.utils.auth import get_current_user, get_current_premium_user
from app.config import settings

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/api/payment", tags=["payment"])

@router.get("/plans")
async def get_plans():
    try:
        plans = stripe.Plan.list(product=settings.STRIPE_PRODUCT_ID)
        return plans
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/subscription")
async def create_subscription(
    subscription_data: dict,
    db: Session = Depends(get_db)
):
    try:
        stripe_token = subscription_data.get("stripeToken")
        plan = subscription_data.get("plan")
        user_data = subscription_data.get("user")
        
        if not stripe_token or not plan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required data"
            )
        
        # Create customer
        customer = stripe.Customer.create(
            source=stripe_token["id"],
            description=stripe_token["name"],
            email=user_data["email"]
        )
        
        # Create subscription
        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{"plan": plan["id"]}]
        )
        
        # Update user in database
        user = db.query(User).filter(User.email == user_data["email"]).first()
        if user:
            payment_data = {
                "plan": user_data["plan"],
                "last4": stripe_token["card"]["last4"],
                "expCard": stripe_token["card"]["expDate"],
                "subscriptionId": subscription.id,
                "customerId": customer.id,
                "finalDatePlan": subscription.current_period_end
            }
            
            user.payment = payment_data
            user.kind = 1  # Premium user
            db.commit()
            
            return {"user": user, "message": "Subscription created successfully"}
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/cancel")
async def cancel_subscription(
    cancel_data: dict,
    current_user: User = Depends(get_current_premium_user),
    db: Session = Depends(get_db)
):
    try:
        customer_id = cancel_data.get("customerId")
        
        if not customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer ID required"
            )
        
        # Delete customer from Stripe
        stripe.Customer.delete(customer_id)
        
        # Update user
        current_user.payment = {}
        current_user.kind = 0  # Regular user
        db.commit()
        
        return {"message": "Customer removed!"}
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/update-plan")
async def update_plan(
    plan_data: dict,
    current_user: User = Depends(get_current_premium_user),
    db: Session = Depends(get_db)
):
    try:
        profile = plan_data.get("profile")
        new_plan = plan_data.get("plan")
        
        if profile["plan"] == new_plan["nickname"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Same plan selected"
            )
        
        # Cancel old subscription
        stripe.Subscription.delete(profile["subscriptionId"])
        
        # Create new subscription
        subscription = stripe.Subscription.create(
            customer=profile["customerId"],
            items=[{"plan": new_plan["id"]}]
        )
        
        # Update user
        payment = current_user.payment or {}
        payment["plan"] = plan_data["user"]["plan"]
        payment["subscriptionId"] = subscription.id
        payment["finalDatePlan"] = plan_data["user"]["finalDatePlan"]
        
        current_user.payment = payment
        db.commit()
        
        return {"user": current_user, "message": "Plan updated successfully"}
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/update-card")
async def update_card(
    card_data: dict,
    current_user: User = Depends(get_current_premium_user),
    db: Session = Depends(get_db)
):
    try:
        profile = card_data.get("profile")
        stripe_token = card_data.get("stripeToken")
        
        # Update customer card
        stripe.Customer.modify(
            profile["customerId"],
            source=stripe_token["id"]
        )
        
        # Update user
        payment = current_user.payment or {}
        payment["last4"] = stripe_token["card"]["last4"]
        current_user.payment = payment
        db.commit()
        
        return {"user": current_user, "message": "Card updated successfully"}
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/get-charges")
async def get_charges(
    current_user: User = Depends(get_current_premium_user),
    db: Session = Depends(get_db)
):
    try:
        payment = current_user.payment or {}
        customer_id = payment.get("customerId")
        
        if not customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No customer ID found"
            )
        
        charges = stripe.Charge.list(customer=customer_id)
        return charges
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )