from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from config import DATABASE_URL
from redis import Redis

engine = create_async_engine(DATABASE_URL)
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()


redis_email = Redis(host='localhost', port=6379, db=0)
redis_username = Redis(host='localhost', port=6379, db=1)

async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)




