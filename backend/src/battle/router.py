from .init import Battle,battle_router,battles
from db.router import update_user_data,get_user_by_username
from models import UserDataCreate
from fastapi import  Query
from fastapi import HTTPException
import uuid

@battle_router.post("/create")
async def create_battle(first_opponent: str, sport: str = Query(...), duration: int = Query(...)):
    battle_id = str(uuid.uuid4())
    battles[battle_id] =  Battle(
        id=battle_id,
        first_opponent=first_opponent,
        sport=sport,
        duration=duration,
    )
    return battles[battle_id]

@battle_router.delete("/delete")
async def delete_battle(battle_id: str):
    battles.pop(battle_id)
    return {"message": "Battle deleted successfully"}


@battle_router.post("/invite-friend")
async def invite_friend(battle_id: str, friend_username: str):
    friend_user = await get_user_by_username(friend_username)
    if not friend_user:
        raise HTTPException(status_code=401, detail="Friend not found")
    
    if battle_id in friend_user['invitations']:
        return False
    friend_user['invitations'].append(battle_id)    

    user_data = UserDataCreate(
        **friend_user
    )
    await update_user_data(user_data)
    return True

@battle_router.post("/cancel-invitation")
async def cancel_invitation(friend_username: str, battle_id: str):
    friend_user = await get_user_by_username(friend_username)
    if not friend_user:
        raise HTTPException(status_code=401, detail="Friend not found")

    if battle_id not in friend_user['invitations']:
        return False
    friend_user['invitations'].remove(battle_id)
        
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
    friend_user = await get_user_by_username(friend_username)
    if not friend_user:
        raise HTTPException(status_code=401, detail="Friend not found")
    
    if battle_id not in friend_user['invitations']:
        return False
    
    friend_user['invitations'].remove(battle_id)


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

    battle = battles.get(battle_id)
    if not battle:
        raise HTTPException(status_code=401, detail="Battle not found")
    
    battle.second_opponent = friend_username
    return True