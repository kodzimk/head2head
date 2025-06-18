from .init import battle_router,redis_battle
from db.router import update_user_data
from init import redis_username
from models import BattleModel, UserDataCreate
from fastapi import  Query
from fastapi import HTTPException
import json
import uuid

@battle_router.post("/create")
async def create_battle(first_opponent: str, sport: str = Query(...), duration: int = Query(...)):
    battle_id = str(uuid.uuid4())
    battle = BattleModel(
        id=battle_id,
        first_opponent=first_opponent,
        second_opponent='',
        sport=sport,
        duration=duration,
        first_opponent_score=0,
        second_opponent_score=0
    )
    json_battle = json.dumps(battle.to_json())
    redis_battle.set(battle_id, json_battle)

    return battle.to_json()

@battle_router.delete("/delete")
async def delete_battle(battle_id: str):
    redis_battle.delete(battle_id)
    return {"message": "Battle deleted successfully"}


@battle_router.post("/invite-friend")
async def invite_friend(battle_id: str, friend_username: str):
    battle = redis_battle.get(battle_id)
   
    if not battle:
        raise HTTPException(status_code=401, detail="Battle not found")
    
    friend_user = redis_username.get(friend_username)
    if not friend_user:
        raise HTTPException(status_code=401, detail="Friend not found")
    
    friend_user = json.loads(friend_user)
    if battle_id in friend_user['invitations']:
        return False
    friend_user['invitations'].append(battle_id)
    redis_username.set(friend_username, json.dumps(friend_user))

    user_data = UserDataCreate(
        streak=friend_user['streak'],
        winRate=friend_user['winRate'],
        winBattle=friend_user['winBattle'],
        ranking=friend_user['ranking'],
        totalBattle=friend_user['totalBattle'],
        favourite=friend_user['favourite'],
        avatar=friend_user['avatar'],
        username=friend_user['username'],
        email=friend_user['email'],
        password=friend_user['password'],
        friends=friend_user['friends'],
        friendRequests=friend_user['friendRequests'],
        battles=friend_user['battles'],
        invitations=friend_user['invitations']
    )
    await update_user_data(user_data)
    return True

@battle_router.post("/cancel-invitation")
async def cancel_invitation(friend_username: str, battle_id: str):
    friend_user = redis_username.get(friend_username)
    if not friend_user:
        raise HTTPException(status_code=401, detail="Friend not found")
    
    friend_user = json.loads(friend_user)
    friend_user['invitations'].remove(battle_id)
    redis_username.set(friend_username, json.dumps(friend_user))        
    user_data = UserDataCreate(
         streak=friend_user['streak'],
         winRate=friend_user['winRate'],
         winBattle=friend_user['winBattle'],
         ranking=friend_user['ranking'],
         totalBattle=friend_user['totalBattle'],
         favourite=friend_user['favourite'],
         avatar=friend_user['avatar'],
         username=friend_user['username'],
         email=friend_user['email'],
         password=friend_user['password'],
         friends=friend_user['friends'],
         friendRequests=friend_user['friendRequests'],
         battles=friend_user['battles'],
         invitations=friend_user['invitations']
        )
    await update_user_data(user_data)
    return True

@battle_router.post("/accept-invitation")
async def accept_invitation(friend_username: str, battle_id: str):
    friend_user = redis_username.get(friend_username)
    if not friend_user:
        raise HTTPException(status_code=401, detail="Friend not found")
    
    friend_user = json.loads(friend_user)
    if battle_id not in friend_user['invitations']:
        return False
    
    friend_user['invitations'].remove(battle_id)
    redis_username.set(friend_username, json.dumps(friend_user))

    user_data = UserDataCreate(
         streak=friend_user['streak'],
         winRate=friend_user['winRate'],
         winBattle=friend_user['winBattle'],
         ranking=friend_user['ranking'],
         totalBattle=friend_user['totalBattle'],
         favourite=friend_user['favourite'],
         avatar=friend_user['avatar'],
         username=friend_user['username'],
         email=friend_user['email'],
         password=friend_user['password'],
         friends=friend_user['friends'],
         friendRequests=friend_user['friendRequests'],
         battles=friend_user['battles'],
         invitations=friend_user['invitations']
        )
    await update_user_data(user_data)

    battle = redis_battle.get(battle_id)
    if not battle:
        raise HTTPException(status_code=401, detail="Battle not found")
    battle = json.loads(battle)
    battle['second_opponent'] = friend_username
    redis_battle.set(battle_id, json.dumps(battle))
    
    return True