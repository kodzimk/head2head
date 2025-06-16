from models import UserData, UserDataCreate
from init import SessionLocal, redis_email, redis_username
from .init import db_router
import json
from pydantic import EmailStr
from fastapi import HTTPException
from auth.router import username_exists
from sqlalchemy import select

@db_router.post("/update-user",name="update user data")
async def update_user_data(user: UserDataCreate):
    async with SessionLocal() as db:
        if await username_exists(db, user.username):
            raise HTTPException(status_code=401, detail="Username already exists")
        
        await update_data(user)
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
        print(json.loads(redis_data))
        return json.loads(redis_data)

@db_router.get("/get-user-by-username")
async def get_user_by_username(username: str):
        redis_data = redis_username.get(username)
        if not redis_data:
            raise HTTPException(status_code=404, detail="User not found")
        return json.loads(redis_data)

@db_router.post("/cancel-friend-request")
async def cancel_friend_request(username: str, from_username: str):
    async with SessionLocal() as db:
        user_result = await db.execute(select(UserData).filter(UserData.username == username))
        user_model = user_result.scalar_one_or_none()
       
        if from_username in user_model.friendRequests:
            user_model.friendRequests.remove(from_username)

        return await update_data(user_model)

@db_router.post("/add-friend")
async def add_friend(username: str, friend_username: str):
    async with SessionLocal() as db:
        user_result = await db.execute(select(UserData).filter(UserData.username == username))
        friend_result = await db.execute(select(UserData).filter(UserData.username == friend_username))
        
        user_model = user_result.scalar_one_or_none()
        friend_model = friend_result.scalar_one_or_none()
        
        if not user_model or not friend_model:
            raise HTTPException(status_code=404, detail="User not found")
        
        if friend_username in user_model.friendRequests:
            user_model.friendRequests.remove(friend_username)
        
        if username in friend_model.friendRequests:
            friend_model.friendRequests.remove(username)

        if friend_username not in user_model.friends:
            user_model.friends.append(friend_username)
        if username not in friend_model.friends:
            friend_model.friends.append(username)

        await update_data(user_model)
        await update_data(friend_model)
        
        return True

@db_router.post("/friend-requests")
async def send_friend_request(username: str, from_username: str):
    async with SessionLocal() as db:
        user_result = await db.execute(select(UserData).filter(UserData.username == username))
        user_model = user_result.scalar_one_or_none()
       
        if from_username not in user_model.friendRequests:
            user_model.friendRequests.append(from_username)
        
        return await update_data(user_model)

async def update_data(user: UserDataCreate):
    async with SessionLocal() as db:
        db_user = await db.get(UserData, user.email)
        temp = db_user.username
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
        db_user.friendRequests = user.friendRequests

        for friend in db_user.friends:
            friend_user = await db.execute(select(UserData).filter(UserData.username == friend))
            friend_user = friend_user.scalar_one_or_none()
            if friend_user:
                if temp in friend_user.friends:
                    friend_user.friends[friend_user.friends.index(temp)] = db_user.username
                    await update_data(friend_user)
                   

        await db.commit()
        await db.refresh(db_user)

        user_dict = db_user.__dict__
        user_dict.pop('_sa_instance_state', None)         
        redis_email.set(db_user.email, json.dumps(user_dict))
        redis_username.set(db_user.username, json.dumps(user_dict))
        return True

@db_router.get("/check-friend-request")
async def check_friend_request(username: str, from_username: str) -> bool:
    async with SessionLocal() as db:
        user_result = await db.execute(select(UserData).filter(UserData.username == username))
        user_model = user_result.scalar_one_or_none()

        return from_username in user_model.friendRequests
