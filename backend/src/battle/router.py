from .init import Battle,battle_router,battles
from db.router import update_user_data,get_user_by_username
from models import UserDataCreate
from fastapi import  Query
from fastapi import HTTPException
from init import SessionLocal
from models import BattleModel
import uuid
from init import redis_username,redis_email
import json
import math

@battle_router.post("/create")
async def create_battle(first_opponent: str, sport: str = Query(...), level: str = Query(...)):
    battle_id = str(uuid.uuid4())
    battles[battle_id] =  Battle(
        id=battle_id,
        first_opponent=first_opponent,
        sport=sport,
        level=level,
    )
    
    # Broadcast battle creation to all connected users via websocket
    try:
        from websocket import manager
        import json
        
        battle_created_message = json.dumps({
            "type": "battle_created",
            "data": {
                "id": battle_id,
                "first_opponent": first_opponent,
                "sport": sport,
                "level": level,
                "created_at": battle_id
            }
        })
        
        print(f"Broadcasting battle_created for battle {battle_id}")
        # Send to all users except the creator
        for connected_user in manager.active_connections.keys():
            if connected_user != first_opponent:
                await manager.send_message(battle_created_message, connected_user)
                print(f"Sent battle_created to {connected_user}")
    except Exception as e:
        print(f"Error broadcasting battle_created: {e}")
    
    return battles[battle_id]

@battle_router.delete("/delete")
async def delete_battle(battle_id: str):
    if battle_id in battles:
        battle = battles[battle_id]
        battles.pop(battle_id)
        
        # Broadcast battle deletion to all connected users
        try:
            from websocket import manager
            import json
            
            battle_removed_message = json.dumps({
                "type": "battle_removed",
                "data": battle_id
            })
            
            print(f"Broadcasting battle_removed for battle {battle_id}")
            for connected_user in manager.active_connections.keys():
                await manager.send_message(battle_removed_message, connected_user)
                print(f"Sent battle_removed to {connected_user}")
        except Exception as e:
            print(f"Error broadcasting battle_removed: {e}")
    
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

@battle_router.post("/battle_result")
async def battle_result(battle_id: str, winner: str, loser: str, result: str):
    battle = battles.get(battle_id)
    if not battle:
        raise HTTPException(status_code=401, detail="Battle not found")
    
    async with SessionLocal() as session:
        # Save battle to DB
        battle_db = BattleModel(
            id=battle_id,
            sport=battle.sport,
            level=battle.level,
            first_opponent=battle.first_opponent,
            second_opponent=battle.second_opponent,
            first_opponent_score=battle.first_opponent_score,
            second_opponent_score=battle.second_opponent_score
        )
        session.add(battle_db)
        await session.commit()
        await session.refresh(battle_db)

        # Handle draw case
        if result == 'draw':
            # Update both users for draw
            for username in [battle.first_opponent, battle.second_opponent]:
                user = await get_user_by_username(username)
                user['totalBattle'] += 1
                user['streak'] = 0  # Reset streak on draw
                user['battles'].append(battle_id)
                
                # Recalculate win rate
                if user['winBattle'] > 0:
                    user['winRate'] = math.floor((user['winBattle'] / user['totalBattle']) * 100)
                else:
                    user['winRate'] = 0

                redis_username.set(user['username'], json.dumps(user))
                redis_email.set(user['email'], json.dumps(user))
                
                user_data = UserDataCreate(
                    streak=user['streak'],
                    winRate=user['winRate'],
                    winBattle=user['winBattle'],
                    ranking=user['ranking'],
                    totalBattle=user['totalBattle'],
                    favourite=user['favourite'],
                    avatar=user['avatar'],
                    username=user['username'],
                    email=user['email'],
                    password=user['password'],
                    friends=user['friends'],
                    friendRequests=user['friendRequests'],
                    battles=user['battles'],
                    invitations=user['invitations']
                )
                await update_user_data(user_data)
        else:
            # Handle win/lose case
            # Update winner user
            user = await get_user_by_username(winner)
            user['winBattle'] += 1
            user['totalBattle'] += 1
            user['streak'] += 1
            user['battles'].append(battle_id)

            if user['winBattle'] > 0:
                user['winRate'] = math.floor((user['winBattle'] / user['totalBattle']) * 100)
            else:
                user['winRate'] = 0

            redis_username.set(user['username'], json.dumps(user))
            redis_email.set(user['email'], json.dumps(user))
            user_data = UserDataCreate(
                streak=user['streak'],
                winRate=user['winRate'],
                winBattle=user['winBattle'],
                ranking=user['ranking'],
                totalBattle=user['totalBattle'],
                favourite=user['favourite'],
                avatar=user['avatar'],
                username=user['username'],
                email=user['email'],
                password=user['password'],
                friends=user['friends'],
                friendRequests=user['friendRequests'],
                battles=user['battles'],
                invitations=user['invitations']
            )
            await update_user_data(user_data)

            # Update loser user
            user = await get_user_by_username(loser)
            user['totalBattle'] += 1
            user['streak'] = 0
            user['battles'].append(battle_id)

            if user['winBattle'] > 0:
                user['winRate'] = math.floor((user['winBattle'] / user['totalBattle']) * 100)
            else:
                user['winRate'] = 0

            redis_username.set(user['username'], json.dumps(user))
            redis_email.set(user['email'], json.dumps(user))
            user_data = UserDataCreate(
                streak=user['streak'],
                winRate=user['winRate'],
                winBattle=user['winBattle'],
                ranking=user['ranking'],
                totalBattle=user['totalBattle'],
                favourite=user['favourite'],
                avatar=user['avatar'],
                username=user['username'],
                email=user['email'],
                password=user['password'],
                friends=user['friends'],
                friendRequests=user['friendRequests'],
                battles=user['battles'],
                invitations=user['invitations']
            )
            await update_user_data(user_data)

    # Remove battle from in-memory battles dict
    if battle_id in battles:
        del battles[battle_id]

    return True

@battle_router.post("/battle_draw_result")
async def battle_draw_result(battle_id: str):
    battle = battles.get(battle_id)
    if not battle:
        raise HTTPException(status_code=401, detail="Battle not found")
    
    async with SessionLocal() as session:
        # Save battle to DB
        battle_db = BattleModel(
            id=battle_id,
            sport=battle.sport,
            level=battle.level,
            first_opponent=battle.first_opponent,
            second_opponent=battle.second_opponent,
            first_opponent_score=battle.first_opponent_score,
            second_opponent_score=battle.second_opponent_score
        )
        session.add(battle_db)
        await session.commit()
        await session.refresh(battle_db)

        # Update both users for draw
        for username in [battle.first_opponent, battle.second_opponent]:
            user = await get_user_by_username(username)
            user['totalBattle'] += 1
            user['streak'] = 0  # Reset streak on draw
            user['battles'].append(battle_id)
            
            # Recalculate win rate
            if user['winBattle'] > 0:
                user['winRate'] = math.floor((user['winBattle'] / user['totalBattle']) * 100)
            else:
                user['winRate'] = 0

            redis_username.set(user['username'], json.dumps(user))
            redis_email.set(user['email'], json.dumps(user))
            
            user_data = UserDataCreate(
                streak=user['streak'],
                winRate=user['winRate'],
                winBattle=user['winBattle'],
                ranking=user['ranking'],
                totalBattle=user['totalBattle'],
                favourite=user['favourite'],
                avatar=user['avatar'],
                username=user['username'],
                email=user['email'],
                password=user['password'],
                friends=user['friends'],
                friendRequests=user['friendRequests'],
                battles=user['battles'],
                invitations=user['invitations']
            )
            await update_user_data(user_data)

    # Remove battle from in-memory battles dict
    if battle_id in battles:
        del battles[battle_id]

    return True

@battle_router.get("/get_battles")
async def get_battles(username: str):
    user = await get_user_by_username(username)
    battles_user = user['battles']
    battles_list = []

    async with SessionLocal() as session:
        for battle_id in battles_user:
            battle_data = await session.get(BattleModel, battle_id)
            if battle_data:
                battles_list.append(battle_data.to_json())
    return battles_list

@battle_router.get("/get_waiting_battles")
async def get_waiting_battles():
    waiting_battles = []
    for battle_id, battle in battles.items():
        if not battle.second_opponent:  # Only battles waiting for second opponent
            waiting_battles.append({
                "id": battle.id,
                "first_opponent": battle.first_opponent,
                "sport": battle.sport,
                "level": battle.level,
                "created_at": battle_id  # Using battle_id as created_at for now
            })
    return waiting_battles

@battle_router.get("/get-redis")
async def get_redis():
    for key in redis_username.keys():
        print(key)
    return True