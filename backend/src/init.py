from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from config import DATABASE_URL
from redis import Redis
import redis

engine = create_async_engine(DATABASE_URL)
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()


redis_email = redis.Redis.from_url("redis://redis:6379/0", decode_responses=True, socket_timeout=5, socket_connect_timeout=5)
redis_username = redis.Redis.from_url("redis://redis:6379/0", decode_responses=True, socket_timeout=5, socket_connect_timeout=5)

async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)