from auth.router import auth_router
from db.router import db_router
from friends.router import router_friend
from battle.router import battle_router
from battle_ws import router as battle_ws_router
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

logger = logging.getLogger(__name__)

os.makedirs("avatars", exist_ok=True)
app.mount("/avatars", StaticFiles(directory="avatars"), name="avatars")

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
        
        return {
            "status": "healthy",
            "database": "connected",
            "redis": "connected",
            "manual_questions": "enabled",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

app.include_router(auth_router,prefix="/auth",tags=["auth"])
app.include_router(db_router)
app.include_router(router_friend)
app.include_router(battle_router, prefix="/battle")
app.include_router(battle_ws_router)

origins = [
    "https://head2head.dev",
    "http://localhost:5173",
    "https://www.head2head.dev",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

@app.on_event("startup")
async def startup_event():
    """Initialize rankings on server startup"""
    try:
        from battle.router import initialize_rankings
        await initialize_rankings()
        logger.info("User rankings initialized on startup")
    except Exception as e:
        logger.error(f"Error initializing rankings on startup: {e}")

@app.on_event("startup")
async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)