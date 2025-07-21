from fastapi import APIRouter, HTTPException
import json
from init import redis_username, redis_email
from models import UserDataCreate
from db.router import update_data

router_friend = APIRouter()

@router_friend.post("/cancel-friend-request")
async def cancel_friend_request(username: str, from_username: str):
    try:
        user_model = redis_username.get(username)
        if not user_model:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_model = json.loads(user_model)
        
        if from_username in user_model.get('friendRequests', []):
            user_model['friendRequests'].remove(from_username)
        
        redis_email.set(user_model['email'], json.dumps(user_model))
        redis_username.set(username, json.dumps(user_model))
        await update_data(UserDataCreate(**user_model)) 
        return user_model
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router_friend.post("/add-friend")
async def add_friend(username: str, friend_username: str):
    try:
        user_model = redis_username.get(username)
        friend_model = redis_username.get(friend_username)
        
        if not user_model or not friend_model:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_model = json.loads(user_model)
        friend_model = json.loads(friend_model)
        
        # Remove friend requests
        if friend_username in user_model.get('friendRequests', []):
            user_model['friendRequests'].remove(friend_username)
        
        if username in friend_model.get('friendRequests', []):
            friend_model['friendRequests'].remove(username)
        
        # Add to friends list
        if friend_username not in user_model.get('friends', []):
            user_model.setdefault('friends', []).append(friend_username)
        if username not in friend_model.get('friends', []):
            friend_model.setdefault('friends', []).append(username)
        
        # Update Redis and database
        redis_email.set(user_model['email'], json.dumps(user_model))
        redis_username.set(username, json.dumps(user_model))
        redis_email.set(friend_model['email'], json.dumps(friend_model))
        redis_username.set(friend_username, json.dumps(friend_model))
        
        await update_data(UserDataCreate(**user_model))
        await update_data(UserDataCreate(**friend_model))
        
        return user_model
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router_friend.post("/friend-requests")
async def send_friend_request(username: str, from_username: str):
    try:
        user_model = redis_username.get(username)
        if not user_model:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_model = json.loads(user_model)
        
        if from_username not in user_model.get('friendRequests', []):
            user_model.setdefault('friendRequests', []).append(from_username)
        
        redis_email.set(user_model['email'], json.dumps(user_model))
        redis_username.set(username, json.dumps(user_model))
        
        await update_data(UserDataCreate(**user_model))
        return True
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router_friend.get("/check-friend-request")
async def check_friend_request(username: str, from_username: str) -> bool:
    try:
        user_model = redis_username.get(username)
        if not user_model:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_model = json.loads(user_model)
        return from_username in user_model.get('friendRequests', [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router_friend.post("/remove-friend")
async def remove_friend(username: str, from_username: str):
    try:
        # Remove friend for first user
        user_model = redis_username.get(username)
        if not user_model:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_model = json.loads(user_model)
        if from_username in user_model.get('friends', []):
            user_model['friends'].remove(from_username)
        
        redis_email.set(user_model['email'], json.dumps(user_model))
        redis_username.set(username, json.dumps(user_model))
        await update_data(UserDataCreate(**user_model))
        
        # Remove friend for second user
        friend_model = redis_username.get(from_username)
        if not friend_model:
            raise HTTPException(status_code=404, detail="User not found")
        
        friend_model = json.loads(friend_model)
        if username in friend_model.get('friends', []):
            friend_model['friends'].remove(username)
        
        redis_email.set(friend_model['email'], json.dumps(friend_model))
        redis_username.set(from_username, json.dumps(friend_model))
        await update_data(UserDataCreate(**friend_model))
        
        return True
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router_friend.get("/search-user")
async def search_user(username: str):
    try:
        user_model = redis_username.get(username.strip())
        if not user_model:
            raise HTTPException(status_code=404, detail="User not found")
        
        return json.loads(user_model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))