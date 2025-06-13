from auth.config import DATABASE_URL
from sqlalchemy import Column,  String
from sqlalchemy.ext.declarative import declarative_base
from fastapi import APIRouter
from pydantic import BaseModel,EmailStr
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine(DATABASE_URL)
SessionLocal = async_sessionmaker(bind=engine,expire_on_commit=False)
Base = declarative_base()

router = APIRouter()

class User(Base):
    __tablename__ = "users"
    password = Column(String, index=True,nullable=False)
    username = Column(String, index=True,nullable=False)
    email = Column(String, primary_key=True,index=True,nullable=False)

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

