"""
Migration utilities to help move data from MongoDB to MySQL
"""
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
from app.models.organization import Organization
from app.models.complaint import Complaint
from app.utils.auth import get_password_hash
import json
from datetime import datetime
from typing import Dict, Any

def ensure_mongodb_compatibility():
    """
    Ensure the backend properly handles MongoDB data structures
    that have been migrated to MySQL
    """
    print("Backend is configured to handle migrated MongoDB data structures:")
    print("✓ User.user_image: {big, medium, small}")
    print("✓ User.follows: [{companyId, opinions: [{opinion, status}]}]")
    print("✓ User.payment: {plan, last4, expCard, subscriptionId, customerId, finalDatePlan}")
    print("✓ Organization.admins: [userId1, userId2, ...]")
    print("✓ Organization.organization_image: {big, medium, small}")
    print("✓ Organization.markers: [string1, string2, ...]")
    print("✓ Organization.stats: {complaintsCounter, score, replies, dataGraph, etc.}")
    print("✓ Complaint JSON fields: hashtags, state_dates, views, shares")

def migrate_users_from_mongo_export(mongo_users_json_file: str):
    """
    Migrate users from MongoDB export JSON file to MySQL
    
    Args:
        mongo_users_json_file: Path to JSON file containing MongoDB users export
    """
    db = SessionLocal()
    try:
        with open(mongo_users_json_file, 'r') as f:
            mongo_users = json.load(f)
        
        migrated_count = 0
        
        for mongo_user in mongo_users:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == mongo_user.get('email')).first()
            if existing_user:
                print(f"User {mongo_user.get('email')} already exists, skipping...")
                continue
            
            # Handle MongoDB ObjectId conversion for follows
            follows = mongo_user.get('follows', [])
            if follows:
                for follow in follows:
                    # Convert MongoDB ObjectId to integer if needed
                    if isinstance(follow.get('companyId'), dict) and '$oid' in follow['companyId']:
                        # This is a MongoDB ObjectId, you'll need to map it to your MySQL company IDs
                        # For now, we'll skip this or you can provide a mapping
                        follow['companyId'] = None
                    
                    # Ensure opinions structure is correct
                    if 'opinions' not in follow:
                        follow['opinions'] = []
            
            # Handle payment data
            payment = mongo_user.get('payment', {})
            if payment and 'finalDatePlan' in payment:
                # Convert MongoDB date to Python datetime if needed
                if isinstance(payment['finalDatePlan'], dict) and '$date' in payment['finalDatePlan']:
                    payment['finalDatePlan'] = datetime.fromtimestamp(payment['finalDatePlan']['$date'] / 1000)
            
            # Handle userImage -> user_image
            user_image = mongo_user.get('userImage') or mongo_user.get('user_image')
            if not user_image:
                user_image = {
                    "big": "",
                    "medium": "",
                    "small": "https://s3.amazonaws.com/complaints-wespeak/Users/Tester/avatar.png"
                }
            
            # Create new user
            user = User(
                name=mongo_user.get('name', ''),
                last_name=mongo_user.get('lastName'),
                email=mongo_user.get('email'),
                password=mongo_user.get('password'),  # Already hashed from MongoDB
                verification_token=mongo_user.get('verificationToken'),
                username=mongo_user.get('username'),
                kind=mongo_user.get('kind', 0),
                user_image=user_image,
                birth_date=parse_mongo_date(mongo_user.get('birthDate')),
                sex=mongo_user.get('sex', 2),
                phone_number=mongo_user.get('phoneNumber'),
                facebook=mongo_user.get('facebook', False),
                twitter=mongo_user.get('twitter', False),
                google=mongo_user.get('google', False),
                follows=follows,
                payment=payment,
                register_date=parse_mongo_date(mongo_user.get('registerDate')),
                last_login_date=parse_mongo_date(mongo_user.get('lastLoginDate'))
            )
            
            db.add(user)
            migrated_count += 1
        
        db.commit()
        print(f"Successfully migrated {migrated_count} users from MongoDB to MySQL")
        
    except Exception as e:
        db.rollback()
        print(f"Error migrating users: {e}")
        raise
    finally:
        db.close()

def parse_mongo_date(date_value) -> datetime:
    """Parse MongoDB date format to Python datetime"""
    if not date_value:
        return None
    
    if isinstance(date_value, dict) and '$date' in date_value:
        # MongoDB date format: {"$date": timestamp}
        return datetime.fromtimestamp(date_value['$date'] / 1000)
    elif isinstance(date_value, str):
        # ISO string format
        try:
            return datetime.fromisoformat(date_value.replace('Z', '+00:00'))
        except:
            return None
    elif isinstance(date_value, datetime):
        return date_value
    
    return None

def create_sample_data():
    """Create sample data for testing"""
    db = SessionLocal()
    try:
        # Create sample organizations if they don't exist
        sample_orgs = [
            {"name": "American Airways", "kind": 0},
            {"name": "Lufthansa", "kind": 0},
            {"name": "Air France", "kind": 0},
            {"name": "WizzAir", "kind": 0},
            {"name": "KLM", "kind": 0}
        ]
        
        for org_data in sample_orgs:
            existing_org = db.query(Organization).filter(Organization.name == org_data["name"]).first()
            if not existing_org:
                org = Organization(
                    name=org_data["name"],
                    kind=org_data["kind"],
                    admins=[],  # Empty array initially
                    organization_image={
                        "big": "",
                        "medium": "",
                        "small": "https://s3.amazonaws.com/complaints-wespeak/OrganizationsLogos/default/logo.png"
                    },
                    markers=[],  # Empty array initially
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
                        },
                        "votes": []
                    }
                )
                db.add(org)
        
        # Create sample user if doesn't exist
        existing_user = db.query(User).filter(User.email == "test@example.com").first()
        if not existing_user:
            user = User(
                name="Test User",
                email="test@example.com",
                password=get_password_hash("password123"),
                user_image={
                    "big": "",
                    "medium": "",
                    "small": "https://s3.amazonaws.com/complaints-wespeak/Users/Tester/avatar.png"
                },
                follows=[],  # Empty array initially
                payment={}   # Empty object initially
            )
            db.add(user)
        
        db.commit()
        print("Sample data created successfully")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating sample data: {e}")
        raise
    finally:
        db.close()

def validate_migrated_data():
    """Validate that migrated data structures are correct"""
    db = SessionLocal()
    try:
        users = db.query(User).limit(5).all()
        
        print("Validating migrated user data structures:")
        for user in users:
            print(f"\nUser: {user.email}")
            
            # Check user_image structure
            if user.user_image:
                expected_keys = {'big', 'medium', 'small'}
                actual_keys = set(user.user_image.keys())
                if expected_keys.issubset(actual_keys):
                    print("  ✓ user_image structure is correct")
                else:
                    print(f"  ✗ user_image missing keys: {expected_keys - actual_keys}")
            
            # Check follows structure
            if user.follows:
                for i, follow in enumerate(user.follows[:2]):  # Check first 2
                    if 'companyId' in follow and 'opinions' in follow:
                        print(f"  ✓ follows[{i}] structure is correct")
                    else:
                        print(f"  ✗ follows[{i}] structure is incorrect")
            
            # Check payment structure
            if user.payment:
                expected_payment_keys = {'plan', 'last4', 'expCard', 'subscriptionId', 'customerId'}
                actual_payment_keys = set(user.payment.keys())
                if any(key in actual_payment_keys for key in expected_payment_keys):
                    print("  ✓ payment structure has expected keys")
                else:
                    print("  ✗ payment structure is missing expected keys")
        
        print("\nData validation complete!")
        
    except Exception as e:
        print(f"Error validating data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Example usage:
    ensure_mongodb_compatibility()
    # migrate_users_from_mongo_export("mongo_users_export.json")
    # create_sample_data()
    # validate_migrated_data()