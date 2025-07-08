from auth.router import auth_router
from db.router import db_router
from friends.router import router_friend
from battle.router import battle_router
from battle_ws import router as battle_ws_router
from training.router import training_router
from selection.router import router as selection_router
from news_router import router as news_router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from websocket import app
import os
import logging
from models import UserData, BattleModel
from init import engine, Base
from sqlalchemy import text
from datetime import datetime
import redis
from fastapi import FastAPI
import asyncio

logger = logging.getLogger(__name__)

os.makedirs("avatars", exist_ok=True)
app.mount("/avatars", StaticFiles(directory="avatars"), name="avatars")

# Comprehensive CORS configuration for production and development
origins = [
    "https://head2head.dev",
    "https://www.head2head.dev",
    "https://api.head2head.dev",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
]

# Add CORS middleware with comprehensive configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Use specific origins instead of wildcard
    allow_credentials=True,  # Enable credentials
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "Cache-Control",
        "Pragma",
        "Expires",
        "X-CSRF-Token",
        "X-Requested-With",
        "Accept-Version",
        "Content-Length",
        "Content-MD5",
        "Date",
        "X-Api-Version",
        "X-File-Name",
    ],
    expose_headers=["*"],
    max_age=86400,  # Cache preflight requests for 24 hours
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        
        # Check Redis connection
        redis_client = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))
        redis_client.ping()
        
        # Check Google API key
        google_api_key = os.getenv("GOOGLE_API_KEY")
        ai_status = "enabled" if google_api_key else "disabled"
        
        return {
            "status": "healthy",
            "database": "connected",
            "redis": "connected",
            "ai_quiz_generation": ai_status,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/cors-test")
async def cors_test():
    """Simple CORS test endpoint"""
    return {"message": "CORS is working", "timestamp": datetime.now().isoformat()}

app.include_router(auth_router,prefix="/auth",tags=["auth"])
app.include_router(db_router)
app.include_router(router_friend)
app.include_router(battle_router, prefix="/battle")
app.include_router(battle_ws_router)
app.include_router(training_router, prefix="/training", tags=["training"])
app.include_router(selection_router)
app.include_router(news_router)


@app.on_event("startup")
async def startup_event():
    """Initialize rankings and news service on server startup"""
    try:
        from battle.router import initialize_rankings
        await initialize_rankings()
        logger.info("User rankings initialized on startup")
    except Exception as e:
        logger.error(f"Error initializing rankings on startup: {e}")
    
    try:
        from news_service import news_service
        # Start background news refresh task
        asyncio.create_task(news_service.start_background_refresh())
        logger.info("News service background refresh started")
    except Exception as e:
        logger.error(f"Error starting news service: {e}")

@app.on_event("startup")
async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
