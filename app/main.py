from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, data, users
from app.database import engine, Base

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
app.include_router(data.router)
app.include_router(users.router)

@app.get("/api")
async def root():
    return {"message": "API works."}

@app.get("/")
async def health_check():
    return {"status": "healthy", "message": "WeSpeak Backend API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)