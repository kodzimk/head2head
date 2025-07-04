from .init import router_friend
from init import redis_username, redis_email
from models import UserDataCreate
from db.router import update_data
from fastapi import HTTPException
import json

@router_friend.post("/cancel-friend-request")
async def cancel_friend_request(username: str, from_username: str):
        user_model = redis_username.get(username)
        user_model = json.loads(user_model)
           
        if from_username in user_model['friendRequests']:
            user_model['friendRequests'].remove(from_username)

        redis_email.set(user_model['email'], json.dumps(user_model))
        redis_username.set(username, json.dumps(user_model))
        await update_data(UserDataCreate(**user_model)) 
        return user_model

@router_friend.post("/add-friend")
async def add_friend(username: str, friend_username: str):
        user_model = redis_username.get(username)
        friend_model = redis_username.get(friend_username)
        
        user_model = json.loads(user_model)
        friend_model = json.loads(friend_model)
        
        if not user_model or not friend_model:
            raise HTTPException(status_code=404, detail="User not found")
        
        if friend_username in user_model['friendRequests']:
            user_model['friendRequests'].remove(friend_username)
        
        if username in friend_model['friendRequests']:
            friend_model['friendRequests'].remove(username)

        if friend_username not in user_model['friends']:
            user_model['friends'].append(friend_username)
        if username not in friend_model['friends']:
            friend_model['friends'].append(username)

        redis_email.set(user_model['email'], json.dumps(user_model))
        redis_username.set(username, json.dumps(user_model))
        redis_email.set(friend_model['email'], json.dumps(friend_model))
        redis_username.set(friend_username, json.dumps(friend_model))
        await update_data(UserDataCreate(**user_model))
        await update_data(UserDataCreate(**friend_model))
        
        return user_model

@router_friend.post("/friend-requests")
async def send_friend_request(username: str, from_username: str):
        user_model = redis_username.get(username)
        user_model = json.loads(user_model)
       
        if from_username not in user_model['friendRequests']:
            user_model['friendRequests'].append(from_username)
        
        redis_email.set(user_model['email'], json.dumps(user_model))
        redis_username.set(username, json.dumps(user_model))
        await update_data(UserDataCreate(**user_model))
        return True

@router_friend.get("/check-friend-request")
async def check_friend_request(username: str, from_username: str) -> bool:
    user_model = redis_username.get(username)
    user_model = json.loads(user_model)
    return from_username in user_model['friendRequests']

@router_friend.post("/remove-friend")
async def remove_friend(username: str, from_username: str):
    user_model = redis_username.get(username)
    user_model = json.loads(user_model)
    user_model['friends'].remove(from_username)
    redis_email.set(user_model['email'], json.dumps(user_model))
    redis_username.set(username, json.dumps(user_model))
    await update_data(UserDataCreate(**user_model))

    friend_model = redis_username.get(from_username)
    friend_model = json.loads(friend_model)
    friend_model['friends'].remove(username)
    redis_email.set(friend_model['email'], json.dumps(friend_model))
    redis_username.set(from_username, json.dumps(friend_model))
    await update_data(UserDataCreate(**friend_model))

    return True

@router_friend.get("/search-user")
async def search_user(username: str):
    user_model = redis_username.get(username.strip())
    user_model = json.loads(user_model)
    return user_model