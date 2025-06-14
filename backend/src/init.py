from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from config import DATABASE_URL
from fastapi import FastAPI

engine = create_async_engine(DATABASE_URL)
SessionLocal = async_sessionmaker(bind=engine,expire_on_commit=False)
Base = declarative_base()

app = FastAPI()