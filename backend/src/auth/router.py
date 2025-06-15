from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import EmailStr
from sqlalchemy import select
from models import UserData, UserDataCreate
from init import SessionLocal, redis_email, redis_username
from .init import auth_router
import json
import bcrypt
from fastapi import APIRouter, HTTPException

auth_router = APIRouter()

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

async def user_exists(db: AsyncSession, email: str) -> bool:
    stmt = select(UserData).where(UserData.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    return user is not None

async def username_exists(db: AsyncSession, username: str) -> bool:
    stmt = select(UserData).where(UserData.username == username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    return user is not None

@auth_router.post("/signup",name="signup")
async def create_user_data(user: UserDataCreate):
    async with SessionLocal() as db:
        if await username_exists(db, user.username):
            raise HTTPException(status_code=401, detail="Username already exists")
        if not await user_exists(db, user.email):
            hashed_password = hash_password(user.password)
            
            db_user = UserData(
                username=user.username,
                email=user.email,
                totalBattle=user.totalBattle,
                winRate=user.winRate,
                ranking=user.ranking,
                winBattle=user.winBattle,
                favourite=user.favourite,
                streak=user.streak,
                password=hashed_password,
                friends=[],
                friendRequests=[]
            )
            db.add(db_user)
            await db.commit()
            await db.refresh(db_user)

            user_dict = db_user.__dict__
            user_dict.pop('_sa_instance_state', None)         
            redis_email.set(user.email, json.dumps(user_dict))
            redis_username.set(user.username, json.dumps(user_dict))
            return db_user
        return None


    
@auth_router.get("/signin",name="signin")
async def get_user_data(email: EmailStr,password: str):
    async with SessionLocal() as db:
        data = await db.get(UserData, email)
        if not data:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not verify_password(password, data.password):
            raise HTTPException(status_code=401, detail="Invalid password")
        
        user_dict = data.__dict__
        user_dict.pop('_sa_instance_state', None)         
        redis_email.set(email, json.dumps(user_dict))
        redis_username.set(user_dict['username'], json.dumps(user_dict))
        return data





