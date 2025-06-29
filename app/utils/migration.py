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
            
            # Create new user
            user = User(
                name=mongo_user.get('name', ''),
                last_name=mongo_user.get('lastName'),
                email=mongo_user.get('email'),
                password=mongo_user.get('password'),  # Already hashed from MongoDB
                verification_token=mongo_user.get('verificationToken'),
                username=mongo_user.get('username'),
                kind=mongo_user.get('kind', 0),
                user_image=mongo_user.get('userImage'),
                birth_date=mongo_user.get('birthDate'),
                sex=mongo_user.get('sex', 2),
                phone_number=mongo_user.get('phoneNumber'),
                facebook=mongo_user.get('facebook', False),
                twitter=mongo_user.get('twitter', False),
                google=mongo_user.get('google', False),
                follows=mongo_user.get('follows', []),
                payment=mongo_user.get('payment'),
                register_date=mongo_user.get('registerDate'),
                last_login_date=mongo_user.get('lastLoginDate')
            )
            
            db.add(user)
            migrated_count += 1
        
        db.commit()
        print(f"Successfully migrated {migrated_count} users from MongoDB to MySQL")
        
    except Exception as e:
        db.rollback()
        print(f"Error migrating users: {e}")
    finally:
        db.close()

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
                follows=[]
            )
            db.add(user)
        
        db.commit()
        print("Sample data created successfully")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating sample data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Example usage:
    # migrate_users_from_mongo_export("mongo_users_export.json")
    create_sample_data()