from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from app.routers import auth, data, users, organizations, complaints, chat, payment
from app.utils.social_auth import router as social_auth_router
from app.database import engine, Base
from app.utils.scheduler import start_scheduler

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="WeSpeak Backend API",
    description="Python backend for WeSpeak application",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(social_auth_router)
app.include_router(data.router)
app.include_router(users.router)
app.include_router(organizations.router)
app.include_router(complaints.router)
app.include_router(chat.router)
app.include_router(payment.router)

@app.get("/api")
async def root():
    return {"message": "API works."}

@app.get("/")
async def health_check():
    return {"status": "healthy", "message": "WeSpeak Backend API is running"}

@app.on_event("startup")
async def startup_event():
    """Start background tasks"""
    # Start the statistics update scheduler
    asyncio.create_task(start_scheduler())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)