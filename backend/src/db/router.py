from models import UserData, UserDataCreate
from init import SessionLocal, redis_email, redis_username
from .init import db_router
import json
from pydantic import EmailStr
from fastapi import HTTPException
from auth.router import username_exists

@db_router.post("/update-user",name="update user data")
async def update_user_data(user: UserDataCreate):
    async with SessionLocal() as db:
        db_user = await db.get(UserData, user.email)
        if await username_exists(db, user.username):
            raise HTTPException(status_code=401, detail="Username already exists")
       
        db_user.username = user.username
        db_user.email = user.email
        db_user.totalBattle = user.totalBattle
        db_user.winRate = user.winRate
        db_user.ranking = user.ranking
        db_user.winBattle = user.winBattle
        db_user.favourite = user.favourite
        db_user.streak = user.streak
        db_user.password = user.password
        db_user.friends = user.friends

        
        await db.commit()
        await db.refresh(db_user)

        user_dict = db_user.__dict__
        user_dict.pop('_sa_instance_state', None)         
        redis_email.set(user.email, json.dumps(user_dict))
        redis_username.set(user.username, json.dumps(user_dict))
        return True
    
@db_router.delete("/delete-user",name="delete user")
async def delete_user_data(email: EmailStr):
    async with SessionLocal() as db:
        data = await db.get(UserData, email)
        await db.delete(data)
        await db.commit()
        redis_email.delete(email)
        redis_username.delete(data.username)
        return True
    
@db_router.on_event("shutdown")
async def end_event():
    redis_email.close()
    redis_username.close()

@db_router.get("/get-user")
async def get_user_data(email: EmailStr):
        redis_data = redis_email.get(email)
        return json.loads(redis_data)

@db_router.get("/get-user-by-username")
async def get_user_by_username(username: str):
        redis_data = redis_username.get(username)
        return json.loads(redis_data)




