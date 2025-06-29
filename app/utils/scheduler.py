import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.utils.stats import update_organization_stats
from app.models.organization import Organization

async def run_hourly_stats_update():
    """Run hourly statistics update for all organizations"""
    db = SessionLocal()
    try:
        organizations = db.query(Organization).all()
        for org in organizations:
            update_organization_stats(org.id, db)
        print(f"Updated stats for {len(organizations)} organizations at {datetime.utcnow()}")
    finally:
        db.close()

async def start_scheduler():
    """Start the background scheduler"""
    while True:
        await asyncio.sleep(3600)  # Run every hour
        await run_hourly_stats_update()

# You can start this in your main.py with:
# import asyncio
# from app.utils.scheduler import start_scheduler
# asyncio.create_task(start_scheduler())