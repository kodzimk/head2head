from fastapi import APIRouter
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
import os

db_router = APIRouter(prefix="/db", tags=["db"])

# Database URL from environment variable or default
DATABASE_URL = os.getenv(
    'DATABASE_URL', 
    'postgresql://postgres:Kais123@localhost/head2head'
)

# Create sync engine for backward compatibility
sync_database_url = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
engine = create_engine(
    sync_database_url, 
    poolclass=NullPool
)

# Create async engine for new async operations
async_engine = create_async_engine(
    DATABASE_URL,
    poolclass=NullPool
)

# Create a configured "Session" class for sync operations
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create async session maker
AsyncSessionLocal = async_sessionmaker(
    async_engine, 
    expire_on_commit=False
)

# Base class for declarative models
Base = declarative_base()

# Dependency to get sync database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependency to get async database session
async def get_async_db() -> AsyncSession:
    async with AsyncSessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()
