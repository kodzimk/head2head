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
        db_user.friendRequests = user.friendRequests    
        
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

    
@db_router.post("/cancel-friend-request")
async def cancel_friend_request(username: str, from_username: str):
    async with SessionLocal() as db:
        user_result = await db.execute(select(UserData).filter(UserData.username == username))
        user_model = user_result.scalar_one_or_none()
        
        if not user_model:
            raise HTTPException(status_code=404, detail="User not found")

       
        if from_username in user_model.friendRequests:
            user_model.friendRequests.remove(from_username)

        
        db.add(user_model)
        await db.commit()
        await db.refresh(user_model)

        return True


@db_router.post("/add-friend")
async def add_friend(username: str, friend_username: str):
    async with SessionLocal() as db:
        user_result = await db.execute(select(UserData).filter(UserData.username == username))
        friend_result = await db.execute(select(UserData).filter(UserData.username == friend_username))
        
        user_model = user_result.scalar_one_or_none()
        friend_model = friend_result.scalar_one_or_none()
        
        if not user_model or not friend_model:
            raise HTTPException(status_code=404, detail="User not found")

      
        user_model.friends.append(friend_username)
        friend_model.friends.append(username)

        db.add(user_model)
        db.add(friend_model)

        await db.commit()
        
        await db.refresh(user_model)
        await db.refresh(friend_model)

        return True

@db_router.post("/friend-requests")
async def send_friend_request(username: str, from_username: str):
    async with SessionLocal() as db:
        user_result = await db.execute(select(UserData).filter(UserData.username == username))
        from_user_result = await db.execute(select(UserData).filter(UserData.username == from_username))
        
        user_model = user_result.scalar_one_or_none()
        from_user_model = from_user_result.scalar_one_or_none()
        
        if not user_model or not from_user_model:
            raise HTTPException(status_code=404, detail="User not found")

        # Initialize friendRequests lists if None
        if user_model.friendRequests is None:
            user_model.friendRequests = []
        if from_user_model.friendRequests is None:
            from_user_model.friendRequests = []

        # Add friend requests
        if from_username not in user_model.friendRequests:
            user_model.friendRequests.append(from_username)
        if username not in from_user_model.friendRequests:
            from_user_model.friendRequests.append(username)

        # Update both users
        db.add(user_model)
        db.add(from_user_model)
        await db.commit()
        await db.refresh(user_model)
        await db.refresh(from_user_model)

        # Update Redis cache for both users
        user_dict = {
            "username": user_model.username,
            "email": user_model.email,
            "winRate": user_model.winRate,
            "totalBattle": user_model.totalBattle,
            "winBattle": user_model.winBattle,
            "ranking": user_model.ranking,
            "favourite": user_model.favourite,
            "streak": user_model.streak,
            "password": user_model.password,
            "friends": user_model.friends,
            "friendRequests": user_model.friendRequests
        }
        from_user_dict = {
            "username": from_user_model.username,
            "email": from_user_model.email,
            "winRate": from_user_model.winRate,
            "totalBattle": from_user_model.totalBattle,
            "winBattle": from_user_model.winBattle,
            "ranking": from_user_model.ranking,
            "favourite": from_user_model.favourite,
            "streak": from_user_model.streak,
            "password": from_user_model.password,
            "friends": from_user_model.friends,
            "friendRequests": from_user_model.friendRequests
        }
        redis_username.set(username, json.dumps(user_dict))
        redis_username.set(from_username, json.dumps(from_user_dict))

        return True



