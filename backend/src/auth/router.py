from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import EmailStr
from sqlalchemy import select
from models import UserData, UserDataCreate
from init import SessionLocal, redis
from .init import auth_router
import json

async def user_exists(db: AsyncSession, email: str) -> bool:
    stmt = select(UserData).where(UserData.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    return user is not None

@auth_router.post("/signup",name="signup")
async def create_user_data(user: UserDataCreate):
    async with SessionLocal() as db:
        if not await user_exists(db, user.email):
            db_user = UserData(
                username=user.username,
                email=user.email,
                totalBattle=user.totalBattle,
                winRate=user.winRate,
                ranking=user.ranking,
                winBattle=user.winBattle,
                favourite=user.favourite,
                streak=user.streak,
            )
            db.add(db_user)
            await db.commit()
            await db.refresh(db_user)

            user_dict = db_user.__dict__
            user_dict.pop('_sa_instance_state', None)         
            redis.set(user.email, json.dumps(user_dict))
            return db_user
        return None

@auth_router.get("/signin",name="signin")
async def get_user_data(email: EmailStr):
    async with SessionLocal() as db:
        data = await db.get(UserData, email)
        user_dict = data.__dict__
        user_dict.pop('_sa_instance_state', None)         
        redis.set(email, json.dumps(user_dict))
        return data





