from battle.init import Battle,battle_router,battles
from models import UserDataCreate,UserData
from fastapi import  Query
from fastapi import HTTPException
from init import SessionLocal
from models import BattleModel
import uuid
from init import redis_username,redis_email
from tasks import queue_quiz_generation_task
from db.router import update_user_data,get_user_by_username,repair_user_battles

import json
import math
from sqlalchemy import select
import logging
import traceback


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
            task = queue_quiz_generation_task(battle_id, sport, level, 7)
            logger.info(f"Started AI quiz generation task for battle {battle_id}")
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
    logger.info(f"Attempting to delete battle {battle_id}")
    logger.info(f"Available battles before deletion: {list(battles.keys())}")
    
    if battle_id in battles:
        battles.pop(battle_id)
        logger.info(f"Battle {battle_id} deleted successfully")
        logger.info(f"Available battles after deletion: {list(battles.keys())}")

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
    else:
        logger.warning(f"Battle {battle_id} not found in memory for deletion")

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

@battle_router.post("/reject-invitation")
async def reject_invitation(friend_username: str, battle_id: str):
    """
    Reject a battle invitation and notify the battle creator
    """
    try:
        logger.info(f"Rejecting invitation for {friend_username} to battle {battle_id}")
        
        # Get the friend who is rejecting
        friend_user = await get_user_by_username(friend_username)
        if not friend_user:
            logger.error(f"Friend {friend_username} not found")
            raise HTTPException(status_code=401, detail="Friend not found")

        if battle_id not in friend_user['invitations']:
            logger.warning(f"Battle {battle_id} not found in {friend_username}'s invitations")
            return False
            
        # Remove the invitation from the friend's list
        friend_user['invitations'].remove(battle_id)
        
        # Update the friend's data
        user_data = UserDataCreate(**friend_user)
        await update_user_data(user_data)
        
        # Get the battle to find the creator
        battle = battles.get(battle_id)
        if battle:
            battle_creator = battle.first_opponent
            logger.info(f"Battle creator {battle_creator} will be notified of rejection")
            
            # Notify the battle creator via websocket
            try:
                from websocket import manager
                
                # Create rejection notification message
                rejection_message = {
                    "type": "invitation_rejected",
                    "data": {
                        "battle_id": battle_id,
                        "rejected_by": friend_username,
                        "battle_creator": battle_creator,
                        "sport": battle.sport,
                        "level": battle.level
                    }
                }
                
                # Send notification to battle creator if they're connected
                if battle_creator in manager.active_connections:
                    await manager.send_message(json.dumps(rejection_message), battle_creator)
                    logger.info(f"Sent rejection notification to battle creator {battle_creator}")
                else:
                    logger.info(f"Battle creator {battle_creator} is not connected, notification will be sent when they connect")
                
                # Also send notification to the user who rejected the invitation
                if friend_username in manager.active_connections:
                    await manager.send_message(json.dumps(rejection_message), friend_username)
                    logger.info(f"Sent rejection notification to user who rejected {friend_username}")
                else:
                    logger.info(f"User who rejected {friend_username} is not connected, notification will be sent when they connect")
                    
            except Exception as e:
                logger.error(f"Failed to send rejection notification: {str(e)}")
                # Don't fail the rejection if notification fails
        
        logger.info(f"Successfully rejected invitation for {friend_username} to battle {battle_id}")
        return True
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting invitation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to reject invitation: {str(e)}")

@battle_router.post("/battle_result")
async def battle_result(battle_id: str, winner: str, loser: str, result: str):
    import math
    import json
    # Import here to avoid circular import
    from db.router import update_user_data, get_user_by_username
    from init import redis_username, redis_email

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
    if battle_id in battles:
        del battles[battle_id]
    # --- Begin repair-style update logic, but increment stats for this battle ---
    from models import UserData, BattleModel
    from init import redis_username, redis_email, SessionLocal
    import math
    import logging
    logger = logging.getLogger(__name__)
    try:
        async with SessionLocal() as db:
            # Get all users
            users_result = await db.execute(select(UserData))
            users = users_result.scalars().all()
            # Get all battles
            battles_result = await db.execute(select(BattleModel))
            battles = battles_result.scalars().all()
            # Build a mapping from username to battle objects
            user_battles_map = {user.username: [] for user in users}
            for battle in battles:
                if battle.first_opponent:
                    user_battles_map.setdefault(battle.first_opponent, []).append(battle)
                if battle.second_opponent:
                    user_battles_map.setdefault(battle.second_opponent, []).append(battle)
            # Update each user
            for user in users:
                user_battles = user_battles_map.get(user.username, [])
                user_battles.sort(key=lambda b: str(b.id))
                battle_ids = [b.id for b in user_battles]
                user.battles = battle_ids
                user.totalBattle = len(battle_ids)
                # Calculate winBattle and streak
                win_count = 0
                streak = 0
                current_streak = 0
                for battle in reversed(user_battles):  # Most recent first
                    if battle.first_opponent == user.username:
                        my_score = battle.first_opponent_score
                        opp_score = battle.second_opponent_score
                    else:
                        my_score = battle.second_opponent_score
                        opp_score = battle.first_opponent_score
                    if my_score > opp_score:
                        win_count += 1
                        current_streak += 1
                    else:
                        if my_score == opp_score:
                            current_streak = 0
                        else:
                            current_streak = 0
                    if streak == 0 and current_streak > 0:
                        streak = current_streak
                user.winBattle = win_count
                user.streak = streak
                user.winRate = math.floor((user.winBattle / user.totalBattle) * 100) if user.totalBattle > 0 else 0
                try:
                    await db.commit()
                    await db.refresh(user)
                    # Update Redis
                    user_dict = {
                        'username': user.username,
                        'email': user.email,
                        'totalBattle': user.totalBattle,
                        'winRate': user.winRate,
                        'ranking': user.ranking,
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
                    logger.info(f"[RESULT-REPAIR] Updated user {user.username}: battles={user.totalBattle}, wins={user.winBattle}, streak={user.streak}, winRate={user.winRate}")
                except Exception as e:
                    logger.error(f"[RESULT-REPAIR] Failed to update user {user.username}: {str(e)}")
    except Exception as e:
        logger.error(f"[RESULT-REPAIR] Fatal error in result repair logic: {str(e)}")
    # --- End repair-style update logic ---
    return True

@battle_router.post("/battle_draw_result", tags=["battle"])
async def battle_draw_result(battle_id: str, first_opponent: str, second_opponent: str, score1: int, score2: int):
    logger.info(f"[BATTLE_ROUTER] battle_draw_result called for battle_id={battle_id}, {first_opponent}({score1})-{second_opponent}({score2})")
    try:
        from models import BattleModel
        from init import SessionLocal
        async with SessionLocal() as session:
            battle_db = BattleModel(
                id=battle_id,
                sport=None,
                level=None,
                first_opponent=first_opponent,
                second_opponent=second_opponent,
                first_opponent_score=score1,
                second_opponent_score=score2
            )
            session.add(battle_db)
            await session.commit()
            await session.refresh(battle_db)
            logger.info(f"[BATTLE_ROUTER] Battle {battle_id} (draw) saved to database.")
    except Exception as e:
        logger.error(f"[BATTLE_ROUTER] Error saving draw battle: {str(e)}\n{traceback.format_exc()}")
        return {"success": False, "error": str(e)}
    
    # Update user stats for both users
    from db.router import update_user_statistics, get_user_by_username
    import math
    try:
        usernames = [first_opponent, second_opponent]
        for username in usernames:
            user = await get_user_by_username(username)
            if not user:
                logger.error(f"[BATTLE_ROUTER] User {username} not found for draw update")
                continue
                
            new_total_battle = user['totalBattle'] + 1
            new_win_battle = user['winBattle']  # No win for draw
            new_streak = 0  # Draw breaks streak
            new_win_rate = math.floor((new_win_battle / new_total_battle) * 100) if new_total_battle > 0 else 0
            
            # Update battles list
            battles_list = user.get('battles', [])
            if battle_id not in battles_list:
                battles_list.append(battle_id)
            
            success = await update_user_statistics(
                username=username,
                total_battle=new_total_battle,
                win_battle=new_win_battle,
                streak=new_streak,
                win_rate=new_win_rate,
                battles_list=battles_list
            )
            if not success:
                logger.error(f"[BATTLE_ROUTER] Failed to update user {username} for draw")
                return {"success": False, "error": f"Failed to update user {username} for draw"}
            else:
                logger.info(f"[BATTLE_ROUTER] Successfully updated user {username} for draw: totalBattle={new_total_battle}, winBattle={new_win_battle}, streak={new_streak}, winRate={new_win_rate}")
                
        logger.info(f"[BATTLE_ROUTER] User stats updated for both users (draw).")
    except Exception as e:
        logger.error(f"[BATTLE_ROUTER] Error updating user stats for draw: {str(e)}\n{traceback.format_exc()}")
        return {"success": False, "error": str(e)}
    return {"success": True}

@battle_router.get("/get_battles")
async def get_battles(username: str):
    """Get all battles for a user, sorted by recency (newest first)"""
    # Import here to avoid circular import
    from db.router import get_user_by_username
    logger.info(f"[BATTLE_ROUTER] Getting all battles for user: {username}")
    user = await get_user_by_username(username)
    if not user:
        logger.error(f"[BATTLE_ROUTER] User {username} not found in DB (get_battles)")
        return []
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
    battles_list.sort(key=lambda x: x['id'], reverse=True)
    logger.info(f"[BATTLE_ROUTER] Returning {len(battles_list)} battles for user {username} (sorted by recency)")
    return battles_list

@battle_router.get("/get_recent_battles")
async def get_recent_battles(username: str, limit: int = 4):
    """Get recent battles for a user, sorted by recency (newest first)"""
    # Import here to avoid circular import
    from db.router import get_user_by_username
    logger.info(f"[BATTLE_ROUTER] Getting recent battles for user: {username} (limit: {limit})")
    user = await get_user_by_username(username)
    if not user:
        logger.error(f"[BATTLE_ROUTER] User {username} not found in DB (get_recent_battles)")
        return []
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
    battles_list.sort(key=lambda x: x['id'], reverse=True)
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
                redis_email.set(user.email, json.dumps(user_dict))
                redis_username.set(user.username, json.dumps(user_dict))
            
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
    Check the status of manual quiz generation for a battle
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
    Get the generated manual quiz questions for a battle
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

@battle_router.get("/get_all_battles")
async def get_all_battles_for_user(username: str):
    """Get all battles for a specific user, sorted by recency (newest first)"""
    # Import here to avoid circular import
    from db.router import get_user_by_username
    logger.info(f"[BATTLE_ROUTER] Getting all battles for user: {username}")
    user = await get_user_by_username(username)
    if not user:
        logger.error(f"[BATTLE_ROUTER] User {username} not found in DB (get_all_battles_for_user)")
        return []
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
    battles_list.sort(key=lambda x: x['id'], reverse=True)
    logger.info(f"[BATTLE_ROUTER] Returning {len(battles_list)} all battles for user {username} (sorted by recency)")
    return battles_list

@battle_router.get("/all_battles", tags=["debug"])
async def get_all_battles():
    """Return all battles in the battles database table."""
    from models import BattleModel
    from init import SessionLocal
    battles_list = []
    async with SessionLocal() as session:
        result = await session.execute(select(BattleModel))
        battles = result.scalars().all()
        for battle in battles:
            battles_list.append(battle.to_json())
    return {"total_battles": len(battles_list), "battles": battles_list}

@battle_router.get("/get-battle")
async def get_battle(battle_id: str):
    try:
        if battle_id in battles:
            battle = battles[battle_id]
            
            battle_data = {
                "battle_id": battle.id,
                "sport": battle.sport,
                "level": battle.level,
                "duration": battle.duration if hasattr(battle, 'duration') else 0,
                "first_opponent": battle.first_opponent,
                "second_opponent": battle.second_opponent,
                "status": battle.status if hasattr(battle, 'status') else "waiting"
            }
            
            return battle_data
        
        async with SessionLocal() as session:
            battle_data = await session.get(BattleModel, battle_id)
            if battle_data:
                return {
                    "battle_id": battle_data.id,
                    "sport": battle_data.sport,
                    "level": battle_data.level,
                    "duration": getattr(battle_data, 'duration', 0),
                    "first_opponent": battle_data.first_opponent,
                    "second_opponent": battle_data.second_opponent,
                    "status": getattr(battle_data, 'status', 'waiting')
                }
        
        raise HTTPException(status_code=404, detail="Battle not found")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get battle: {str(e)}")