from models import UserData, UserDataCreate
from init import SessionLocal, redis_email, redis_username
from .init import db_router
import json
from pydantic import EmailStr
from fastapi import HTTPException, UploadFile, File
import aiofiles
import os
from datetime import datetime

@db_router.post("/update-user",name="update user data")
async def update_user_data(user: UserDataCreate):
    await update_data(user)
    return user
    
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
        if not redis_data:
            raise HTTPException(status_code=404, detail="User not found")
        return json.loads(redis_data)

@db_router.post("/upload-avatar")
async def upload_avatar(email: EmailStr, file: UploadFile = File(...)):
    try:
        # Create avatars directory if it doesn't exist
        os.makedirs("avatars", exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        filename = f"{email}_{timestamp}{file_extension}"
        file_path = os.path.join("avatars", filename)
        
        # Save the file
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        # Update user data in database and cache
        async with SessionLocal() as db:
            user_model = await db.get(UserData, email)
            if user_model is None:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Delete old avatar if exists
            if user_model.avatar and os.path.exists(user_model.avatar):
                os.remove(user_model.avatar)
            
            # Store relative path for serving
            relative_path = f"/avatars/{filename}"
            user_model.avatar = relative_path
            await db.commit()
            
            # Update Redis cache
            user_dict = {
                'username': user_model.username,
                'email': user_model.email,
                'totalBattle': user_model.totalBattle,
                'winRate': user_model.winRate,
                'ranking': user_model.ranking,
                'winBattle': user_model.winBattle,
                'favourite': user_model.favourite,
                'streak': user_model.streak,
                'password': user_model.password,
                'friends': user_model.friends,
                'friendRequests': user_model.friendRequests,
                'avatar': relative_path
            }
            redis_email.set(email, json.dumps(user_dict))
            redis_username.set(user_model.username, json.dumps(user_dict))
            
        return {"message": "Avatar uploaded successfully", "avatar_path": relative_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def update_data(user: UserDataCreate):
    async with SessionLocal() as db:
        user_model = await db.get(UserData, user.email)

        if user_model is None:
            raise HTTPException(status_code=404, detail="User not found")

        temp = user_model.username
        user_model.username = user.username
        user_model.email = user.email
        user_model.totalBattle = user.totalBattle
        user_model.winRate = user.winRate
        user_model.ranking = user.ranking
        user_model.winBattle = user.winBattle
        user_model.favourite = user.favourite
        user_model.streak = user.streak
        user_model.password = user.password
        user_model.friends = user.friends
        user_model.friendRequests = user.friendRequests
        if user.avatar:
            user_model.avatar = user.avatar

        # Only update friends' arrays if username has changed
        if temp != user.username:
            for friend in user_model.friends:
                try:
                    friend_data = redis_username.get(friend)
                    if not friend_data:
                        raise HTTPException(status_code=404, detail=f"Friend {friend} not found in cache")
                    
                    friend_model = json.loads(friend_data)
                    if temp in friend_model['friends']:
                        # Update the old username to new username in friend's array
                        friend_model['friends'][friend_model['friends'].index(temp)] = user.username
                        # Update both Redis caches
                        redis_username.set(friend, json.dumps(friend_model))
                        redis_email.set(friend_model['email'], json.dumps(friend_model))
                        
                        # Update the database
                        friend_update = UserDataCreate(**friend_model)
                        async with SessionLocal() as friend_db:
                            db_friend = await friend_db.get(UserData, friend_model['email'])
                            if db_friend:
                                db_friend.friends = friend_model['friends']
                                await friend_db.commit()
                except json.JSONDecodeError:
                    print(f"Error decoding friend data for {friend}")
                    continue
                except Exception as e:
                    print(f"Error updating friend {friend}: {str(e)}")
                    continue

        await db.commit()
        await db.refresh(user_model)

        user_dict = {
            'username': user_model.username,
            'email': user_model.email,
            'totalBattle': user_model.totalBattle,
            'winRate': user_model.winRate,
            'ranking': user_model.ranking,
            'winBattle': user_model.winBattle,
            'favourite': user_model.favourite,
            'streak': user_model.streak,
            'password': user_model.password,
            'friends': user_model.friends,
            'friendRequests': user_model.friendRequests,
            'avatar': user_model.avatar
        }
        redis_email.set(user_model.email, json.dumps(user_dict))
        redis_username.set(user_model.username, json.dumps(user_dict))
        return True

