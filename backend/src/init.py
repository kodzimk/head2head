from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from config import DATABASE_URL
from redis import Redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
import redis

# Initialize FastAPI app
app = FastAPI()

# Mount static files directory for avatars
avatar_dir = "avatars"
os.makedirs(avatar_dir, exist_ok=True)  # Ensure directory exists
app.mount("/avatars", StaticFiles(directory=avatar_dir), name="avatars")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

# Redis setup
redis_email = redis.Redis(host='redis', port=6379, db=0)
redis_username = redis.Redis(host='redis', port=6379, db=1)

async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)