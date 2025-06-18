from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from redis import Redis
from config import DATABASE_URL, REDIS_URL
from urllib.parse import urlparse

# Parse Redis URL
redis_url = urlparse(REDIS_URL)
redis_host = redis_url.hostname or 'localhost'
redis_port = redis_url.port or 6379

# Create Redis connections
redis_email = Redis(host=redis_host, port=redis_port, db=0)
redis_username = Redis(host=redis_host, port=redis_port, db=1)

# Create async engine
engine = create_async_engine(DATABASE_URL)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def init_models():
    async with engine.begin() as conn:
        # await conn.run_sync(Base.metadata.drop_all)
        # await conn.run_sync(Base.metadata.create_all)
        pass




