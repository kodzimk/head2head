from models import UserData, UserDataCreate
from init import SessionLocal, redis
from .init import db_router
from pydantic import EmailStr
import json

@db_router.post("/update-user",name="update user data")
async def update_user_data(user: UserDataCreate):
    async with SessionLocal() as db:
        db_user = await db.get(UserData, user.email)
        db_user.username = user.username
        db_user.email = user.email
        db_user.totalBattle = user.totalBattle
        db_user.winRate = user.winRate
        db_user.ranking = user.ranking
        db_user.winBattle = user.winBattle
        db_user.favourite = user.favourite
        db_user.streak = user.streak
        db_user.password = user.password
        
        await db.commit()
        await db.refresh(db_user)

        user_dict = db_user.__dict__
        user_dict.pop('_sa_instance_state', None)         
        redis.set(user.email, json.dumps(user_dict))
        return True
    
@db_router.delete("/delete-user",name="delete user")
async def delete_user_data(email: EmailStr):
    async with SessionLocal() as db:
        data = await db.get(UserData, email)
        await db.delete(data)
        await db.commit()
        redis.delete(email)
        return True
    
@db_router.on_event("shutdown")
async def end_event():
    redis.close()

@db_router.get("/get-user")
async def get_user_data(email: EmailStr):
    data = redis.get(email)
    if data is None:
        async with SessionLocal() as db:
            data = await db.get(UserData, email)
            user_dict = data.__dict__
            user_dict.pop('_sa_instance_state', None)         
            await redis.set(email, json.dumps(user_dict))
        return json.loads(data)
    return json.loads(data)




