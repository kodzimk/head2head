from auth.router import auth_router
from db.router import db_router
from friends.router import router_friend
from friends.chat_router import chat_router
from battle.router import battle_router
from battle_ws import router as battle_ws_router
from training.router import training_router
from selection.router import router as selection_router
from news_router import router as news_router
from transfer.router import router as transfer_router
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
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import asyncio
from websocket import chat_websocket_endpoint
from friends.simple_chat_router import simple_chat_router
from websocket import simple_chat_websocket_endpoint

logger = logging.getLogger(__name__)

os.makedirs("avatars", exist_ok=True)
app.mount("/avatars", StaticFiles(directory="avatars"), name="avatars")

# Comprehensive CORS configuration for production and development
origins = [
    "http://localhost:3000",
    "https://localhost:3000",
    "http://localhost:8000",
    "https://localhost:8000",
    "http://localhost:5173",
    "https://localhost:5173",
    "http://localhost",
    "https://localhost",
    "http://127.0.0.1:3000",
    "https://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "https://127.0.0.1:8000",
    "http://127.0.0.1:5173",
    "https://127.0.0.1:5173",
    "http://127.0.0.1",
    "https://127.0.0.1",
    "https://api.head2head.dev",
    "http://api.head2head.dev"
]

# Add CORS middleware with comprehensive configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,  # Enable credentials
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
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
app.include_router(router_friend, prefix="/api", tags=["friends"])
app.include_router(battle_router, prefix="/battle")
app.include_router(battle_ws_router)
app.include_router(training_router, prefix="/training", tags=["training"])
app.include_router(selection_router)
app.include_router(news_router)
app.include_router(transfer_router, prefix="/api", tags=["transfers"])
# Include chat router
app.include_router(chat_router, prefix="/api", tags=["chat"])
# Include simple chat router
app.include_router(simple_chat_router, prefix="/api", tags=["simple-chat"])

# Add compatibility route for chat-preview
app.include_router(simple_chat_router, prefix="/friends", tags=["friends-compat"])

# Add to WebSocket routes
@app.websocket("/ws/chat")
async def websocket_chat_endpoint(
    websocket: WebSocket, 
    username: str, 
    receiver: str
):
    await chat_websocket_endpoint(websocket, username, receiver)

# Add simple chat WebSocket endpoint
@app.websocket("/ws/simple-chat")
async def websocket_simple_chat_endpoint(
    websocket: WebSocket, 
    username: str, 
    receiver: str
):
    await simple_chat_websocket_endpoint(websocket, username, receiver)


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
    
    try:
        from transfer.service import transfer_service
       
        logger.info("Fetching initial transfer data on startup (direct API-Football)...")
        initial_fetch_success = await transfer_service.update_transfers_data()
        if initial_fetch_success:
            logger.info("Initial transfer data fetched successfully from API-Football on startup")
        else:
            logger.warning("Failed to fetch initial transfer data from API-Football on startup")
        
        # Start background transfer refresh task
        await transfer_service.start_background_refresh()
        logger.info("Transfer service background refresh started")
    except Exception as e:
        logger.error(f"Error starting transfer service: {e}")

@app.on_event("startup")
async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
