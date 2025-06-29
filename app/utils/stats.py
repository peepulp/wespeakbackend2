from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, List
import json
from app.models.complaint import Complaint
from app.models.organization import Organization
from app.models.chat import Chat

def update_organization_stats(organization_id: int, db: Session):
    """Update organization statistics"""
    organization = db.query(Organization).filter(Organization.id == organization_id).first()
    if not organization:
        return
    
    # Get all complaints for this organization
    complaints = db.query(Complaint).filter(Complaint.company_id == organization_id).all()
    
    total_complaints = len(complaints)
    resolved_complaints = len([c for c in complaints if c.state in ["resolved", "reimbursed"]])
    unresolved_complaints = total_complaints - resolved_complaints
    
    # Calculate score based on unresolved complaints and their age
    today = datetime.utcnow()
    total_days_unresolved = 0
    
    for complaint in complaints:
        if complaint.state not in ["resolved", "reimbursed"]:
            days_old = (today - complaint.created).days
            total_days_unresolved += days_old
    
    score = max(0, 100 - (unresolved_complaints + 0.25 * total_days_unresolved))
    
    # Get chat/reply count
    chat_count = db.query(Chat).filter(Chat.company_id == organization_id).count()
    
    # Update organization stats
    stats = organization.stats or {}
    stats.update({
        "complaintsCounter": total_complaints,
        "score": round(score, 1),
        "replies": chat_count,
        "resolves": resolved_complaints,
        "reimbursed": len([c for c in complaints if c.state == "reimbursed"]),
        "resolveRate": round((resolved_complaints / total_complaints * 100), 1) if total_complaints > 0 else 0,
        "responseRate": round((chat_count / total_complaints * 100), 1) if total_complaints > 0 else 0
    })
    
    # Update data graphs
    stats["dataGraph"] = update_data_graphs(score, stats.get("dataGraph", {}))
    
    organization.stats = stats
    db.commit()

def update_data_graphs(score: float, current_graphs: Dict) -> Dict:
    """Update the data graphs with current score"""
    today = datetime.utcnow()
    
    # Initialize graphs if empty
    if not current_graphs:
        current_graphs = {
            "day": [0.0] * 12,
            "days": [0.0] * 31,
            "month": [0.0] * 12,
            "year": [0.0] * 12
        }
    
    # Update hourly data (12 2-hour periods)
    hour_index = today.hour // 2
    current_graphs["day"][hour_index] = score
    
    # Update daily data
    day_index = today.day - 1
    # Calculate average of hours up to current time
    hours_data = current_graphs["day"][:hour_index + 1]
    if hours_data:
        current_graphs["days"][day_index] = round(sum(hours_data) / len(hours_data), 2)
    
    # Update monthly data
    month_index = today.month - 1
    # Calculate average of days up to current day
    days_data = current_graphs["days"][:day_index + 1]
    if days_data:
        current_graphs["month"][month_index] = round(sum(days_data) / len(days_data), 2)
    
    # Update yearly data
    year_index = (today.year - 2018) % 12
    # Calculate average of months up to current month
    months_data = current_graphs["month"][:month_index + 1]
    if months_data:
        current_graphs["year"][year_index] = round(sum(months_data) / len(months_data), 2)
    
    return current_graphs

def check_crisis_status(organization_id: int, db: Session):
    """Check if organization is in crisis and update status"""
    from app.models.user import User
    
    # Get total user count (for threshold calculation)
    total_users = db.query(User).count()
    threshold = total_users ** 0.4  # Same formula as original
    
    # Get organization
    organization = db.query(Organization).filter(Organization.id == organization_id).first()
    if not organization:
        return
    
    # Get unresolved complaints
    unresolved_complaints = db.query(Complaint).filter(
        Complaint.company_id == organization_id,
        ~Complaint.state.in_(["resolved", "reimbursed"])
    ).count()
    
    # Update crisis status
    is_crisis = unresolved_complaints >= threshold
    organization.is_crisis = is_crisis
    db.commit()
    
    return is_crisis

def update_complaint_stats(complaint: Complaint, db: Session):
    """Update stats when complaint state changes"""
    if complaint.state in ["resolved", "reimbursed"]:
        # Complaint was resolved - update organization stats positively
        update_organization_stats(complaint.company_id, db)
    else:
        # Complaint is still unresolved or reopened
        update_organization_stats(complaint.company_id, db)
    
    # Check crisis status
    check_crisis_status(complaint.company_id, db)