from .init import Battle,battle_router,battles
from db.router import update_user_data,get_user_by_username
from models import UserDataCreate,UserData
from fastapi import  Query
from fastapi import HTTPException
from init import SessionLocal
from models import BattleModel
import uuid
from init import redis_username,redis_email

import json
import math
from sqlalchemy import select
import logging

logger = logging.getLogger(__name__)

@battle_router.post("/create")
async def create_battle(first_opponent: str, sport: str = Query(...), level: str = Query(...)):
    battle_id = str(uuid.uuid4())
    battles[battle_id] =  Battle(
        id=battle_id,
        first_opponent=first_opponent,
        sport=sport,
        level=level,
    )
    return battles[battle_id]

@battle_router.delete("/delete")
async def delete_battle(battle_id: str):
    if battle_id in battles:
        battles.pop(battle_id)

        from websocket import manager
        for connected_user in manager.active_connections.keys():
            await manager.send_message(json.dumps({
                "type": "battle_removed",
                "data": battle_id
            }), connected_user)


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
        raise HTTPException(status_code=400, detail="Invitation not found")
    
    battle = battles.get(battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
    
    # Check if battle already has a second opponent
    if battle.second_opponent:
        # Remove the invitation since the battle is full
        friend_user['invitations'].remove(battle_id)
        user_data = UserDataCreate(**friend_user)
        await update_user_data(user_data)
        raise HTTPException(status_code=409, detail="Battle is already full. Another player has already joined.")
    
    # Remove invitation and add friend as second opponent
    friend_user['invitations'].remove(battle_id)
    user_data = UserDataCreate(**friend_user)
    await update_user_data(user_data)
    
    battle.second_opponent = friend_username
    return True

@battle_router.post("/battle_result")
async def battle_result(battle_id: str, winner: str, loser: str, result: str):
    battle = battles.get(battle_id)
    if not battle:
        raise HTTPException(status_code=401, detail="Battle not found")
    
    async with SessionLocal() as session:
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

        if result == "draw":
            for username in [battle.first_opponent, battle.second_opponent]:
                user = await get_user_by_username(username)
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
        else:
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

        # Update all user rankings once at the end
        await update_user_rankings()

    if battle_id in battles:
        del battles[battle_id]

    return True

@battle_router.post("/battle_draw_result")
async def battle_draw_result(battle_id: str):
    battle = battles.get(battle_id)
    if not battle:
        raise HTTPException(status_code=401, detail="Battle not found")
    
    async with SessionLocal() as session:
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

        for username in [battle.first_opponent, battle.second_opponent]:
            user = await get_user_by_username(username)
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
        
        # Update all user rankings once at the end
        await update_user_rankings()

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
    for battle in battles.values():
        if battle.second_opponent == '':  
            # Get the creator's user data to include avatar
            try:
                creator_user = await get_user_by_username(battle.first_opponent)
                waiting_battles.append({
                    "id": battle.id,
                    "first_opponent": battle.first_opponent,
                    "sport": battle.sport,
                    "level": battle.level,
                    "creator_avatar": creator_user.get('avatar', '') if creator_user else ''
                })
            except Exception as e:
                # If we can't get user data, include battle without avatar
                waiting_battles.append({
                    "id": battle.id,
                    "first_opponent": battle.first_opponent,
                    "sport": battle.sport,
                    "level": battle.level,
                    "creator_avatar": ''
                })
    return waiting_battles

async def calculate_user_points(user: UserData) -> int:
    """Calculate ranking points for a user based on multiple factors"""
    base_points = user.winBattle * 100  # 100 points per win
    
    # Win rate bonus (0-50 points)
    win_rate_bonus = min(50, user.winRate // 2) if user.winRate > 0 else 0
    
    # Streak bonus (0-100 points)
    streak_bonus = min(100, user.streak * 10) if user.streak > 0 else 0
    
    # Experience bonus (0-25 points)
    experience_bonus = min(25, user.totalBattle // 4) if user.totalBattle > 0 else 0
    
    # Consistency bonus (bonus for high win rate with many battles)
    consistency_bonus = 0
    if user.totalBattle >= 10 and user.winRate >= 70:
        consistency_bonus = 25
    elif user.totalBattle >= 5 and user.winRate >= 80:
        consistency_bonus = 15
    
    # New user bonus (encourage new players)
    new_user_bonus = 0
    if user.totalBattle <= 3 and user.winBattle > 0:
        new_user_bonus = 20  # Bonus for winning early battles
    
    total_points = base_points + win_rate_bonus + streak_bonus + experience_bonus + consistency_bonus + new_user_bonus
    
    return total_points

def get_ranking_tier(points: int) -> dict:
    """Get ranking tier information based on points"""
    if points >= 1000:
        return {
            "tier": "Elite",
            "color": "purple",
            "icon": "👑",
            "description": "Elite Champion"
        }
    elif points >= 500:
        return {
            "tier": "Master",
            "color": "gold",
            "icon": "🏆",
            "description": "Master Player"
        }
    elif points >= 200:
        return {
            "tier": "Expert",
            "color": "silver",
            "icon": "🥈",
            "description": "Expert Competitor"
        }
    elif points >= 100:
        return {
            "tier": "Veteran",
            "color": "bronze",
            "icon": "🥉",
            "description": "Veteran Player"
        }
    elif points >= 50:
        return {
            "tier": "Rising",
            "color": "blue",
            "icon": "⭐",
            "description": "Rising Star"
        }
    else:
        return {
            "tier": "Rookie",
            "color": "gray",
            "icon": "🌱",
            "description": "Rookie Player"
        }

async def update_user_rankings():
    """Update all user rankings based on a sophisticated points system"""
    try:
        async with SessionLocal() as db:
            # Get all users
            stmt = select(UserData)
            result = await db.execute(stmt)
            users = result.scalars().all()
            
            # Calculate points for each user
            user_points = []
            for user in users:
                points = await calculate_user_points(user)
                user_points.append({
                    'user': user,
                    'points': points,
                    'wins': user.winBattle,
                    'win_rate': user.winRate,
                    'streak': user.streak,
                    'total_battles': user.totalBattle
                })
            
            # Sort by points (descending), then by wins (descending), then by win rate (descending)
            user_points.sort(key=lambda x: (x['points'], x['wins'], x['win_rate']), reverse=True)
            
            # Update rankings
            for index, user_data in enumerate(user_points, 1):
                user = user_data['user']
                user.ranking = index
                
                # Update Redis cache
                user_dict = {
                    'username': user.username,
                    'email': user.email,
                    'totalBattle': user.totalBattle,
                    'winRate': user.winRate,
                    'ranking': index,
                    'winBattle': user.winBattle,
                    'favourite': user.favourite,
                    'streak': user.streak,
                    'password': user.password,
                    'friends': user.friends,
                    'friendRequests': user.friendRequests,
                    'avatar': user.avatar,
                    'battles': user.battles,
                    'invitations': user.invitations
                }
                redis_username.set(user.username, json.dumps(user_dict))
                redis_email.set(user.email, json.dumps(user_dict))
            
            await db.commit()
            logger.info(f"Updated rankings for {len(users)} users")
            return True
    except Exception as e:
        logger.error(f"Error updating rankings: {str(e)}")
        return False

async def initialize_rankings():
    """Initialize rankings for all users on startup"""
    try:
        await update_user_rankings()
        logger.info("User rankings initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing rankings: {str(e)}")

# Initialize rankings on module import
import asyncio
try:
    loop = asyncio.get_event_loop()
    if loop.is_running():
        # If loop is running, schedule the initialization
        loop.create_task(initialize_rankings())
    else:
        # If loop is not running, run it
        loop.run_until_complete(initialize_rankings())
except Exception as e:
    logger.error(f"Could not initialize rankings: {str(e)}")

@battle_router.post("/recalculate-rankings")
async def recalculate_rankings():
    """Manually recalculate all user rankings"""
    try:
        success = await update_user_rankings()
        if success:
            return {"message": "Rankings recalculated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to recalculate rankings")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error recalculating rankings: {str(e)}")
