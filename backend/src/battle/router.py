from battle.init import Battle,battle_router,battles
from db.router import update_user_data,get_user_by_username
from models import UserDataCreate,UserData
from fastapi import  Query
from fastapi import HTTPException
from init import SessionLocal
from models import BattleModel
import uuid
from init import redis_username,redis_email
from tasks import generate_ai_quiz, queue_quiz_generation_task
from celery.result import AsyncResult

import json
import math
from sqlalchemy import select
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

@battle_router.post("/create")
async def create_battle(first_opponent: str, sport: str = Query(...), level: str = Query(...)):
    try:
        logger.info(f"Creating battle for {first_opponent} with sport={sport}, level={level}")
        
        battle_id = str(uuid.uuid4())
        battles[battle_id] =  Battle(
            id=battle_id,
            first_opponent=first_opponent,
            sport=sport,
            level=level,
        )
        
        logger.info(f"Battle {battle_id} created successfully")
        
        # Trigger AI quiz generation as background task (non-blocking)
        try:
            task = queue_quiz_generation_task(battle_id, sport, level, 6)
            logger.info(f"Started AI quiz generation task {task.id} for battle {battle_id} (sport={sport}, level={level})")
        except Exception as e:
            logger.error(f"Failed to start AI quiz generation for battle {battle_id}: {str(e)}")
            # Don't fail the battle creation if quiz generation fails
            # The battle can still proceed with fallback questions
        
        # Broadcast new battle to all connected users via WebSocket
        try:
            from websocket import manager
            
            # Get creator's user data to include avatar
            creator_user = await get_user_by_username(first_opponent)
            creator_avatar = creator_user.get('avatar', '') if creator_user else ''
            
            # Prepare battle data for broadcast
            battle_data = {
                "id": battle_id,
                "first_opponent": first_opponent,
                "sport": sport,
                "level": level,
                "creator_avatar": creator_avatar
            }
            
            # Broadcast to all connected users
            broadcast_message = {
                "type": "battle_created",
                "data": battle_data
            }
            
            logger.info(f"Broadcasting battle creation to all connected users: {battle_data}")
            
            # Send to all connected users
            for connected_user in manager.active_connections.keys():
                try:
                    await manager.send_message(json.dumps(broadcast_message), connected_user)
                    logger.info(f"Sent battle creation notification to {connected_user}")
                except Exception as e:
                    logger.error(f"Failed to send battle creation notification to {connected_user}: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Failed to broadcast battle creation: {str(e)}")
            # Don't fail the battle creation if broadcasting fails
        
        return battles[battle_id]
    except Exception as e:
        logger.error(f"Error creating battle: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create battle: {str(e)}")

@battle_router.delete("/delete")
async def delete_battle(battle_id: str):
    if battle_id in battles:
        battles.pop(battle_id)

        # Broadcast battle removal to all connected users
        try:
            from websocket import manager
            
            broadcast_message = {
                "type": "battle_removed",
                "data": battle_id
            }
            
            logger.info(f"Broadcasting battle removal to all connected users: {battle_id}")
            
            # Send to all connected users
            for connected_user in manager.active_connections.keys():
                try:
                    await manager.send_message(json.dumps(broadcast_message), connected_user)
                    logger.info(f"Sent battle removal notification to {connected_user}")
                except Exception as e:
                    logger.error(f"Failed to send battle removal notification to {connected_user}: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Failed to broadcast battle removal: {str(e)}")

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
async def battle_result(battle_id: str, winner: str, loser: str, result: str, winner_score: int = None, loser_score: int = None):
    """Handle battle result and update user statistics"""
    try:
        logger.info(f"[BATTLE_ROUTER] Processing battle result: {battle_id}, winner: {winner}, loser: {loser}, result: {result}")
        logger.info(f"[BATTLE_ROUTER] Scores - winner: {winner_score}, loser: {loser_score}")
        
        # Get battle from memory
        battle = battles.get(battle_id)
        if not battle:
            logger.error(f"[BATTLE_ROUTER] Battle {battle_id} not found in memory")
            return False
        
        # Require provided scores, do not fallback
        if winner_score is not None and loser_score is not None:
            first_score = winner_score if battle.first_opponent == winner else loser_score
            second_score = loser_score if battle.first_opponent == winner else winner_score
        else:
            logger.error(f"[BATTLE_ROUTER] No valid scores provided for battle {battle_id}. Refusing to save.")
            return False
        
        logger.info(f"[BATTLE_ROUTER] Final scores - {battle.first_opponent}: {first_score}, {battle.second_opponent}: {second_score}")
        
        # Save battle to database
        async with SessionLocal() as session:
            battle_db = BattleModel(
                id=battle_id,
                sport=battle.sport,
                level=battle.level,
                first_opponent=battle.first_opponent,
                second_opponent=battle.second_opponent,
                first_opponent_score=first_score,
                second_opponent_score=second_score
            )
            session.add(battle_db)
            await session.commit()
            await session.refresh(battle_db)
            logger.info(f"[BATTLE_ROUTER] Battle {battle_id} saved to database")

        # Import the centralized update function
        from db.router import update_user_statistics
        
        if result == "draw":
            # Update both users for draw
            for username in [battle.first_opponent, battle.second_opponent]:
                try:
                    user = await get_user_by_username(username)
                    logger.info(f"[BATTLE_ROUTER] Updating user {username} for draw - before: totalBattle={user['totalBattle']}, winBattle={user['winBattle']}, winRate={user['winRate']}")
                    
                    # Calculate new stats
                    new_total_battle = user['totalBattle'] + 1
                    new_win_battle = user['winBattle']  # No change for draw
                    new_streak = 0  # Reset streak for draw
                    new_win_rate = math.floor((new_win_battle / new_total_battle) * 100) if new_win_battle > 0 else 0
                    
                    # Add battle to user's battle list
                    if battle_id not in user['battles']:
                        user['battles'].append(battle_id)
                    
                    # Update user statistics using centralized function
                    success = await update_user_statistics(
                        username=username,
                        total_battle=new_total_battle,
                        win_battle=new_win_battle,
                        streak=new_streak,
                        win_rate=new_win_rate,
                        battles_list=user['battles']
                    )
                    
                    if success:
                        logger.info(f"[BATTLE_ROUTER] Successfully updated user {username} for draw")
                    else:
                        logger.error(f"[BATTLE_ROUTER] Failed to update user {username} for draw")
                        
                except Exception as e:
                    logger.error(f"[BATTLE_ROUTER] Error updating user {username} for draw: {str(e)}")
        else:
            # Update winner
            try:
                user = await get_user_by_username(winner)
                logger.info(f"[BATTLE_ROUTER] Updating winner {winner} - before: totalBattle={user['totalBattle']}, winBattle={user['winBattle']}, winRate={user['winRate']}")
                
                # Calculate new stats
                new_total_battle = user['totalBattle'] + 1
                new_win_battle = user['winBattle'] + 1
                new_streak = user['streak'] + 1
                new_win_rate = math.floor((new_win_battle / new_total_battle) * 100)
                
                # Add battle to user's battle list
                if battle_id not in user['battles']:
                    user['battles'].append(battle_id)
                
                # Update user statistics using centralized function
                success = await update_user_statistics(
                    username=winner,
                    total_battle=new_total_battle,
                    win_battle=new_win_battle,
                    streak=new_streak,
                    win_rate=new_win_rate,
                    battles_list=user['battles']
                )
                
                if success:
                    logger.info(f"[BATTLE_ROUTER] Successfully updated winner {winner}")
                else:
                    logger.error(f"[BATTLE_ROUTER] Failed to update winner {winner}")
                    
            except Exception as e:
                logger.error(f"[BATTLE_ROUTER] Error updating winner {winner}: {str(e)}")

            # Update loser
            try:
                user = await get_user_by_username(loser)
                logger.info(f"[BATTLE_ROUTER] Updating loser {loser} - before: totalBattle={user['totalBattle']}, winBattle={user['winBattle']}, winRate={user['winRate']}")
                
                # Calculate new stats
                new_total_battle = user['totalBattle'] + 1
                new_win_battle = user['winBattle']  # No change for loss
                new_streak = 0  # Reset streak for loss
                new_win_rate = math.floor((new_win_battle / new_total_battle) * 100) if new_win_battle > 0 else 0
                
                # Add battle to user's battle list
                if battle_id not in user['battles']:
                    user['battles'].append(battle_id)
                
                # Update user statistics using centralized function
                success = await update_user_statistics(
                    username=loser,
                    total_battle=new_total_battle,
                    win_battle=new_win_battle,
                    streak=new_streak,
                    win_rate=new_win_rate,
                    battles_list=user['battles']
                )
                
                if success:
                    logger.info(f"[BATTLE_ROUTER] Successfully updated loser {loser}")
                else:
                    logger.error(f"[BATTLE_ROUTER] Failed to update loser {loser}")
                    
            except Exception as e:
                logger.error(f"[BATTLE_ROUTER] Error updating loser {loser}: {str(e)}")

        # Update all user rankings
        await update_user_rankings()
        logger.info(f"[BATTLE_ROUTER] Updated user rankings")

    except Exception as e:
        logger.error(f"[BATTLE_ROUTER] Error in battle_result: {str(e)}")
        return False

    # Clean up battle from memory
    if battle_id in battles:
        del battles[battle_id]
        logger.info(f"[BATTLE_ROUTER] Removed battle {battle_id} from memory")

    return True

@battle_router.post("/battle_draw_result")
async def battle_draw_result(battle_id: str, first_score: int = None, second_score: int = None):
    """Handle battle draw result and update user statistics"""
    try:
        logger.info(f"[BATTLE_ROUTER] Processing battle draw result: {battle_id}")
        logger.info(f"[BATTLE_ROUTER] Scores - first: {first_score}, second: {second_score}")
        
        # Get battle from memory
        battle = battles.get(battle_id)
        if not battle:
            logger.error(f"[BATTLE_ROUTER] Battle {battle_id} not found in memory")
            return False
        
        # Require provided scores, do not fallback
        if first_score is not None and second_score is not None:
            final_first_score = first_score
            final_second_score = second_score
        else:
            logger.error(f"[BATTLE_ROUTER] No valid scores provided for battle {battle_id}. Refusing to save.")
            return False
        
        logger.info(f"[BATTLE_ROUTER] Final scores - {battle.first_opponent}: {final_first_score}, {battle.second_opponent}: {final_second_score}")
        
        # Save battle to database
        async with SessionLocal() as session:
            battle_db = BattleModel(
                id=battle_id,
                sport=battle.sport,
                level=battle.level,
                first_opponent=battle.first_opponent,
                second_opponent=battle.second_opponent,
                first_opponent_score=final_first_score,
                second_opponent_score=final_second_score
            )
            session.add(battle_db)
            await session.commit()
            await session.refresh(battle_db)
            logger.info(f"[BATTLE_ROUTER] Battle {battle_id} saved to database")

        # Import the centralized update function
        from db.router import update_user_statistics

        # Update both users for draw
        for username in [battle.first_opponent, battle.second_opponent]:
            try:
                user = await get_user_by_username(username)
                logger.info(f"[BATTLE_ROUTER] Updating user {username} for draw - before: totalBattle={user['totalBattle']}, winBattle={user['winBattle']}, winRate={user['winRate']}")
                
                # Calculate new stats
                new_total_battle = user['totalBattle'] + 1
                new_win_battle = user['winBattle']  # No change for draw
                new_streak = 0  # Reset streak for draw
                new_win_rate = math.floor((new_win_battle / new_total_battle) * 100) if new_win_battle > 0 else 0
                
                # Add battle to user's battle list
                if battle_id not in user['battles']:
                    user['battles'].append(battle_id)
                
                # Update user statistics using centralized function
                success = await update_user_statistics(
                    username=username,
                    total_battle=new_total_battle,
                    win_battle=new_win_battle,
                    streak=new_streak,
                    win_rate=new_win_rate,
                    battles_list=user['battles']
                )
                
                if success:
                    logger.info(f"[BATTLE_ROUTER] Successfully updated user {username} for draw")
                else:
                    logger.error(f"[BATTLE_ROUTER] Failed to update user {username} for draw")
                    
            except Exception as e:
                logger.error(f"[BATTLE_ROUTER] Error updating user {username} for draw: {str(e)}")
        
        # Update all user rankings
        await update_user_rankings()
        logger.info(f"[BATTLE_ROUTER] Updated user rankings")

    except Exception as e:
        logger.error(f"[BATTLE_ROUTER] Error in battle_draw_result: {str(e)}")
        return False

    # Clean up battle from memory
    if battle_id in battles:
        del battles[battle_id]
        logger.info(f"[BATTLE_ROUTER] Removed battle {battle_id} from memory")

    return True

@battle_router.get("/get_battles")
async def get_battles(username: str):
    """Get all battles for a user, sorted by recency (newest first)"""
    logger.info(f"[BATTLE_ROUTER] Getting all battles for user: {username}")
    user = await get_user_by_username(username)
    battles_user = user['battles']
    logger.info(f"[BATTLE_ROUTER] User {username} has {len(battles_user)} battles in their list: {battles_user}")
    battles_list = []

    async with SessionLocal() as session:
        for battle_id in battles_user:
            logger.info(f"[BATTLE_ROUTER] Looking up battle {battle_id} in database")
            battle_data = await session.get(BattleModel, battle_id)
            if battle_data:
                logger.info(f"[BATTLE_ROUTER] Found battle {battle_id} in database: {battle_data.to_json()}")
                battles_list.append(battle_data.to_json())
            else:
                logger.warning(f"[BATTLE_ROUTER] Battle {battle_id} not found in database")
    
    # Sort by battle ID (newest first - assuming UUIDs are time-based)
    battles_list.sort(key=lambda x: x['id'], reverse=True)
    
    logger.info(f"[BATTLE_ROUTER] Returning {len(battles_list)} battles for user {username} (sorted by recency)")
    return battles_list

@battle_router.get("/get_recent_battles")
async def get_recent_battles(username: str, limit: int = 4):
    """Get recent battles for a user, sorted by recency (newest first)"""
    logger.info(f"[BATTLE_ROUTER] Getting recent battles for user: {username} (limit: {limit})")
    user = await get_user_by_username(username)
    battles_user = user['battles']
    logger.info(f"[BATTLE_ROUTER] User {username} has {len(battles_user)} battles in their list: {battles_user}")
    battles_list = []

    async with SessionLocal() as session:
        for battle_id in battles_user:
            logger.info(f"[BATTLE_ROUTER] Looking up battle {battle_id} in database")
            battle_data = await session.get(BattleModel, battle_id)
            if battle_data:
                logger.info(f"[BATTLE_ROUTER] Found battle {battle_id} in database: {battle_data.to_json()}")
                battles_list.append(battle_data.to_json())
            else:
                logger.warning(f"[BATTLE_ROUTER] Battle {battle_id} not found in database")
    
    # Sort by battle ID (newest first - assuming UUIDs are time-based)
    battles_list.sort(key=lambda x: x['id'], reverse=True)
    
    # Limit to specified number of recent battles
    battles_list = battles_list[:limit]
    
    logger.info(f"[BATTLE_ROUTER] Returning {len(battles_list)} recent battles for user {username}")
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

@battle_router.get("/quiz-status/{battle_id}")
async def get_quiz_generation_status(battle_id: str):
    """
    Check the status of AI quiz generation for a battle
    """
    try:
        # Check if questions are already generated and cached
        import redis
        redis_client = redis.Redis.from_url("redis://redis:6379/0")
        questions_key = f"battle_questions:{battle_id}"
        
        cached_questions = redis_client.get(questions_key)
        if cached_questions:
            questions = json.loads(cached_questions)
            return {
                "status": "completed",
                "battle_id": battle_id,
                "questions_count": len(questions),
                "message": "Questions are ready"
            }
        
        # If not cached, check if there's a running task
        # Note: In a production system, you'd want to store task IDs in a database
        # For now, we'll return a generic status
        return {
            "status": "generating",
            "battle_id": battle_id,
            "message": "Questions are being generated"
        }
        
    except Exception as e:
        logger.error(f"Error checking quiz status for battle {battle_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error checking quiz status")

@battle_router.get("/quiz/{battle_id}")
async def get_battle_quiz(battle_id: str):
    """
    Get the generated quiz questions for a battle
    """
    try:
        import redis
        redis_client = redis.Redis.from_url("redis://redis:6379/0")
        questions_key = f"battle_questions:{battle_id}"
        
        cached_questions = redis_client.get(questions_key)
        if not cached_questions:
            raise HTTPException(status_code=404, detail="Quiz questions not found or still being generated")
        
        questions = json.loads(cached_questions)
        return {
            "battle_id": battle_id,
            "questions": questions
        }
        
    except Exception as e:
        logger.error(f"Error retrieving quiz for battle {battle_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving quiz")
