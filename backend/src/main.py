from auth.router import auth_router
from db.router import db_router
from friends.router import router_friend
from battle.router import battle_router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from websocket import app
import os
import logging
from models import UserData, BattleModel
from init import engine, Base

logger = logging.getLogger(__name__)

os.makedirs("avatars", exist_ok=True)
app.mount("/avatars", StaticFiles(directory="avatars"), name="avatars")

app.include_router(auth_router,prefix="/auth",tags=["auth"])
app.include_router(db_router)
app.include_router(router_friend)
app.include_router(battle_router)

origins = [
    "https://head2head.dev",
    "https://127.0.0.1:5173",
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