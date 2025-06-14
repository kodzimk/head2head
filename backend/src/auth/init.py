from config import DATABASE_URL
from sqlalchemy import Column,  String, Integer
from sqlalchemy.ext.declarative import declarative_base
from fastapi import APIRouter
from pydantic import BaseModel,EmailStr
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine(DATABASE_URL)
SessionLocal = async_sessionmaker(bind=engine,expire_on_commit=False)
Base = declarative_base()

router = APIRouter()

class UserData(Base):
    __tablename__ = "user_data"
    username = Column(String, index=True,nullable=False)
    email = Column(String, primary_key=True,index=True,nullable=False)
    winRate = Column(Integer, index=True,nullable=False)
    totalBattle = Column(Integer, index=True,nullable=False)
    winBattle = Column(Integer, index=True,nullable=False)
    ranking = Column(Integer, index=True,nullable=False)
    favourite = Column(String, index=True,nullable=False)
    streak = Column(Integer, index=True,nullable=False)


class UserDataCreate(BaseModel):
    username: str
    email: EmailStr
    totalBattle: int
    winRate: int
    ranking: int
    favourite:str
    winBattle: int
    streak: int

