from fastapi import WebSocket, FastAPI, WebSocketDisconnect
import json
import logging
from typing import Dict
from db.router import delete_user_data, get_user_data, update_user_data, get_user_by_username
from friends.router import add_friend, cancel_friend_request, send_friend_request
from battle.router import invite_friend, cancel_invitation, accept_invitation, battle_result, battle_draw_result, create_battle, get_waiting_battles
from battle.init import battles, Battle
from models import UserDataCreate
from init import init_models
from friends.router import remove_friend
import asyncio
import uuid
from fastapi import HTTPException
import redis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Redis client for checking cached questions
redis_client = redis.Redis.from_url("redis://redis:6379/0")

async def get_cached_questions(battle_id: str):
    """Get cached questions for a battle"""
    try:
        questions_key = f"battle_questions:{battle_id}"
        logger.info(f"[get_cached_questions] Fetching questions with key {questions_key}")
        cached_questions = redis_client.get(questions_key)
        if cached_questions:
            logger.info(f"[get_cached_questions] Found cached questions for {battle_id}")
            return json.loads(cached_questions)
        logger.info(f"[get_cached_questions] No cached questions found for {battle_id}")
        return None
    except Exception as e:
        logger.error(f"[get_cached_questions] Error getting cached questions for battle {battle_id}: {str(e)}")
        return None

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.active_connections[username] = websocket

    async def disconnect(self, username: str):
        if username in self.active_connections:
            del self.active_connections[username]
            user_warnings_sent.pop(username, None)
            await self.handle_battle_disconnect(username)

    async def handle_battle_disconnect(self, disconnected_username: str, reason: str = "disconnected"):
        try:
            for battle_id, battle in list(battles.items()):
                if (battle.first_opponent == disconnected_username or 
                    battle.second_opponent == disconnected_username):

                    # If it's a waiting battle (no second opponent), do nothing on disconnect.
                    # The inactivity monitor will clean it up if it's truly abandoned.
                    if not battle.second_opponent:
                        logger.info(f"User {disconnected_username} disconnected from a waiting battle ({battle_id}). Battle will not be removed immediately.")
                        continue

                    # The rest of this logic only applies to active battles.
                    if battle.first_opponent == disconnected_username:
                        winner = battle.second_opponent
                        loser = battle.first_opponent
                        battle.second_opponent_score = 10
                        
                    else:
                        winner = battle.first_opponent
                        loser = battle.second_opponent
                        battle.first_opponent_score = 10
                       
                    # Customize message based on reason
                    if reason == "inactive":
                        battle_finished_message = json.dumps({
                            "type": "battle_finished",
                            "data": {
                                "battle_id": battle_id,
                                "text": f"{winner} wins by default - {loser} was inactive for 1 minute",
                                "questions": f"{winner} wins because {loser} was inactive for 1 minute",
                                "loser": loser,
                                "winner": winner,
                            }
                        })
                    else:
                        battle_finished_message = json.dumps({
                            "type": "battle_finished",
                            "data": {
                                "battle_id": battle_id,
                                "text": f"{winner} wins by default - {loser} disconnected",
                                "questions": f"{winner} wins because {loser} left the game",
                                "loser": loser,
                                "winner": winner,
                            }
                        })
                    
                    if winner in self.active_connections:
                        await self.send_message(battle_finished_message, winner)
                       
                    
                    try:
                        from battle.router import battle_result
                        await battle_result(battle_id, winner, loser, "win")
                       
                    except Exception as e:
                        logger.error(f"Error processing battle result for disconnect: {str(e)}")
                    
                    if battle_id in battles:
                        del battles[battle_id]
                       
                    
                    break  
                    
        except Exception as e:
            logger.error(f"Error handling battle disconnect for {disconnected_username}: {str(e)}")

    async def send_message(self, message: str, username: str):
       
        if username in self.active_connections:
            await self.active_connections[username].send_text(message)
        else:
            logger.warning(f"User {username} not found in active connections")

    async def _notify_friend_update(self, friend: str):
        """Helper method to notify a friend about user updates"""
        try:
            await self.send_message(json.dumps({
                "type": "user_updated",
                "data": await get_user_by_username(friend)
            }), friend)
        except Exception as e:
            logger.error(f"Error notifying friend {friend}: {e}")

    async def _notify_friend_request_update(self, connected_user: str, old_username: str):
        """Helper method to notify a user about friend request updates"""
        try:
            user_data = await get_user_by_username(connected_user)
            if user_data and old_username in user_data.get('friendRequests', []):
                await self.send_message(json.dumps({
                    "type": "user_updated",
                    "data": user_data
                }), connected_user)
        except Exception as e:
            logger.error(f"Error notifying user {connected_user} about friend request update: {e}")

    async def _notify_invitation_update(self, connected_user: str, old_username: str):
        """Helper method to notify a user about invitation updates"""
        try:
            user_data = await get_user_by_username(connected_user)
            if user_data and old_username in user_data.get('invitations', []):
                await self.send_message(json.dumps({
                    "type": "user_updated",
                    "data": user_data
                }), connected_user)
        except Exception as e:
            logger.error(f"Error notifying user {connected_user} about invitation update: {e}")

manager = ConnectionManager()

user_last_activity = {}
user_warnings_sent = {} 

async def validate_and_fix_username(connecting_username: str) -> str:
    try:
        user_data = await get_user_by_username(connecting_username)
        if user_data:
            return connecting_username  
    except Exception:
        pass
    
    try:
        from db.init import SessionLocal
        from models import UserData
        from sqlalchemy import select
        
        async with SessionLocal() as db:
            all_users_stmt = select(UserData)
            all_users_result = await db.execute(all_users_stmt)
            all_users = all_users_result.scalars().all()
            
            for user in all_users:
                if connecting_username in user.friends:
                    logger.warning(f"User {connecting_username} tried to connect with old username, found in {user.username}'s friends list")
                    return None  
    except Exception as e:
        logger.error(f"Error validating username {connecting_username}: {e}")
    
    return None  

async def monitor_inactive_players():
    while True:
        try:
            current_time = asyncio.get_event_loop().time()
            warning_threshold = 45  
            inactive_threshold = 60  
            waiting_inactive_threshold = 600  
            
            for battle_id, battle in battles.items():
                if battle.second_opponent:
                    if battle.first_opponent in user_last_activity:
                        time_since_activity = current_time - user_last_activity[battle.first_opponent]
                        
                        if time_since_activity >= warning_threshold and time_since_activity < inactive_threshold:
                            if not user_warnings_sent.get(battle.first_opponent, False):
                                logger.info(f"Warning: Player {battle.first_opponent} inactive for {time_since_activity:.1f} seconds")
                                user_warnings_sent[battle.first_opponent] = True
                                
                                if battle.first_opponent in manager.active_connections:
                                    await manager.send_message(json.dumps({
                                        "type": "inactivity_warning",
                                        "data": {
                                            "message": "You have been inactive for 45 seconds. You will lose automatically in 15 seconds if you don't respond.",
                                            "time_remaining": 15
                                        }
                                    }), battle.first_opponent)
                        
                        if time_since_activity >= inactive_threshold:
                            logger.info(f"Player {battle.first_opponent} inactive for {time_since_activity:.1f} seconds - giving default win to {battle.second_opponent}")
                            battle.second_opponent_score = 10
                            await manager.handle_battle_disconnect(battle.first_opponent, "inactive")
                            user_warnings_sent.pop(battle.first_opponent, None)
                            continue
                    
                    if battle.second_opponent in user_last_activity:
                        time_since_activity = current_time - user_last_activity[battle.second_opponent]
                        
                        if time_since_activity >= warning_threshold and time_since_activity < inactive_threshold:
                            if not user_warnings_sent.get(battle.second_opponent, False):
                                logger.info(f"Warning: Player {battle.second_opponent} inactive for {time_since_activity:.1f} seconds")
                                user_warnings_sent[battle.second_opponent] = True

                                if battle.second_opponent in manager.active_connections:
                                    await manager.send_message(json.dumps({
                                        "type": "inactivity_warning",
                                        "data": {
                                            "message": "You have been inactive for 45 seconds. You will lose automatically in 15 seconds if you don't respond.",
                                            "time_remaining": 15
                                        }
                                    }), battle.second_opponent)
                        
                        
                        if time_since_activity >= inactive_threshold:
                            logger.info(f"Player {battle.second_opponent} inactive for {time_since_activity:.1f} seconds - giving default win to {battle.first_opponent}")
                            battle.first_opponent_score = 10
                            await manager.handle_battle_disconnect(battle.second_opponent, "inactive")
                            
                            user_warnings_sent.pop(battle.second_opponent, None)
                            continue
            
            
            for battle_id, battle in list(battles.items()):
                if not battle.second_opponent:  
                    if battle.first_opponent in user_last_activity:
                        time_since_activity = current_time - user_last_activity[battle.first_opponent]
                        
                        
                        if time_since_activity >= waiting_inactive_threshold - 60:  
                            logger.info(f"Waiting battle {battle_id} by {battle.first_opponent} will be removed in {waiting_inactive_threshold - time_since_activity:.1f} seconds")
                        
                        
                        if time_since_activity >= waiting_inactive_threshold:
                            logger.info(f"Player {battle.first_opponent} inactive in waiting room for {time_since_activity:.1f} seconds - removing waiting battle {battle_id}")
                            
                            battles.pop(battle_id)
                            
                            for connected_user in manager.active_connections.keys():
                                await manager.send_message(json.dumps({
                                    "type": "battle_removed",
                                    "data": battle_id
                                }), connected_user)
                            
                            if battle.first_opponent in manager.active_connections:
                                await manager.send_message(json.dumps({
                                    "type": "waiting_room_inactivity",
                                    "data": {
                                        "message": "You were inactive in the waiting room for 10 minutes. Your battle has been removed.",
                                        "battle_id": battle_id
                                    }
                                }), battle.first_opponent)
                            continue
            
            await asyncio.sleep(5)  
        except Exception as e:
            logger.error(f"Error in monitor_inactive_players: {str(e)}")
            await asyncio.sleep(5)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, username: str):
    try:
        valid_username = await validate_and_fix_username(username)
        if valid_username is None:
            logger.warning(f"Rejecting WebSocket connection for invalid/old username: {username}")
            await websocket.close(code=4000, reason="Invalid username")
            return
        
        actual_username = valid_username
        if actual_username != username:
            logger.info(f"Username corrected from {username} to {actual_username}")
        
        await manager.connect(websocket, actual_username)
        
        user_last_activity[actual_username] = asyncio.get_event_loop().time()

        try:
            user_data = await get_user_by_username(actual_username)
            if user_data and user_data.get('friends'):
                updated_friends = []
                for friend_username in user_data['friends']:
                    try:
                        friend_data = await get_user_by_username(friend_username)
                        if friend_data:
                            updated_friends.append(friend_username)
                        else:
                            logger.warning(f"Friend {friend_username} not found for user {actual_username}")
                    except Exception as e:
                        logger.error(f"Error checking friend {friend_username}: {e}")
                
                if len(updated_friends) != len(user_data['friends']):
                    logger.info(f"Updating friend list for {actual_username} due to username changes")
                    user_data['friends'] = updated_friends
                    user_update_data = UserDataCreate(**user_data)
                    await update_user_data(user_update_data)

                    await manager.send_message(json.dumps({
                        "type": "user_updated",
                        "data": user_data
                    }), actual_username)
        except Exception as e:
            logger.error(f"Error checking friend list for {actual_username}: {e}")

        
        try:
            waiting_battles = await get_waiting_battles()
            await manager.send_message(json.dumps({
                "type": "waiting_battles",
                "data": waiting_battles
            }), actual_username)
        except Exception as e:
            logger.error(f"Error sending waiting battles to {actual_username}: {str(e)}")

        while True:
            try:
                data = await websocket.receive_text()
                
                user_last_activity[actual_username] = asyncio.get_event_loop().time()
                
                user_warnings_sent.pop(actual_username, None)
                
                try:
                    message = json.loads(data)          
                    if message.get("type") == "user_update":
                        old_username = actual_username  
                        user_data = UserDataCreate(
                            username=message["username"],
                            email=message["email"],
                            totalBattle=message["totalBattle"],
                            winRate=message["winRate"],
                            ranking=message["ranking"],
                            winBattle=message["winBattle"],
                            favourite=message["favourite"],
                            streak=message["streak"],
                            password=message["password"],
                            friends=message["friends"],
                            friendRequests=message["friendRequests"],
                            avatar=message["avatar"],
                            battles=message["battles"],
                            invitations=message["invitations"]
                        )                     
                        
                        
                        await update_user_data(user_data)
                        updated_user = await get_user_by_username(message["username"])
                        user_dict = {
                            "email": updated_user['email'],
                            "username": updated_user['username'],
                            "totalBattle": updated_user['totalBattle'],
                            "winRate": updated_user['winRate'],
                            "ranking": updated_user['ranking'],
                            "winBattle": updated_user['winBattle'],
                            "favourite": updated_user['favourite'],
                            "streak": updated_user['streak'],
                            "password": updated_user['password'],
                            "friends": updated_user['friends'],
                            "friendRequests": updated_user['friendRequests'],
                            "avatar": updated_user['avatar'],
                            "battles": updated_user['battles'],
                            "invitations": updated_user['invitations']
                        }

                        
                        if old_username != message["username"]:
                            logger.info(f"Username changed from {old_username} to {message['username']}")
                            
                            
                            if old_username in manager.active_connections:
                                manager.active_connections[message["username"]] = manager.active_connections.pop(old_username)
                            
                            
                            if old_username in user_last_activity:
                                user_last_activity[message["username"]] = user_last_activity.pop(old_username)
                            
                            
                            if old_username in user_warnings_sent:
                                user_warnings_sent[message["username"]] = user_warnings_sent.pop(old_username)

                        
                        # Notify all friends in parallel
                        friend_notifications = []
                        for friend in updated_user['friends']:
                            friend_notifications.append(
                                manager._notify_friend_update(friend)
                            )
                        
                        # Run all friend notifications in parallel
                        if friend_notifications:
                            await asyncio.gather(*friend_notifications, return_exceptions=True)

                        # Notify connected users about friend request updates in parallel
                        friend_request_notifications = []
                        for connected_user in manager.active_connections.keys():
                            friend_request_notifications.append(
                                manager._notify_friend_request_update(connected_user, old_username)
                            )
                        
                        if friend_request_notifications:
                            await asyncio.gather(*friend_request_notifications, return_exceptions=True)

                        # Notify connected users about invitation updates in parallel
                        invitation_notifications = []
                        for connected_user in manager.active_connections.keys():
                            invitation_notifications.append(
                                manager._notify_invitation_update(connected_user, old_username)
                            )
                        
                        if invitation_notifications:
                            await asyncio.gather(*invitation_notifications, return_exceptions=True)

                        
                        await manager.send_message(json.dumps({
                            "type": "user_updated",
                            "data": user_dict
                        }), message["username"])
                    elif message.get("type") == "get_email":
                        user_data = await get_user_data(message["token"])
                        if user_data:
                            await manager.send_message(json.dumps({
                                "type": "user_updated",
                                "data": user_data
                            }), user_data['username'])            
                    elif message.get("type") == "accept_friend_request":
                       user_data = await add_friend(message["username"], message["friend_username"])
                       if user_data:
                            await manager.send_message(json.dumps({
                                "type": "user_updated",
                                "data": user_data
                            }), message["username"])
                            await manager.send_message(json.dumps({
                                "type": "friend_request_updated",
                                "data": await get_user_by_username(message["friend_username"])
                            }), message["friend_username"])
                    elif message.get("type") == "reject_friend_request":
                        user_data = await cancel_friend_request(message["username"], message["friend_username"])
                        if user_data:
                            await manager.send_message(json.dumps({
                                "type": "user_updated",
                                "data": user_data
                            }), message["username"])
                            await manager.send_message(json.dumps({
                                "type": "friend_request_updated",
                                "data": await get_user_by_username(message["friend_username"])
                            }), message["friend_username"])
                    elif message.get("type") == "send_friend_request":
                        await send_friend_request(message["username"], message["friend_username"])
                        try:
                                await manager.send_message(json.dumps({
                                    "type": "user_updated",
                                    "data": await get_user_by_username(message["friend_username"])
                                }), message["friend_username"])
                                await manager.send_message(json.dumps({
                                    "type": "user_updated",
                                    "data": await  get_user_by_username(message["username"])
                                }), message["username"])
                        except Exception as e:
                            manager.disconnect(message["friend_username"])
                            logger.error(f"Error in send_friend_request: {str(e)}")
                    elif message.get("type") == "remove_friend":
                        await remove_friend(message["username"], message["friend_username"])
                        await manager.send_message(json.dumps({
                            "type": "friend_request_updated",
                            "data": await get_user_by_username(message["friend_username"])
                        }), message["friend_username"])
                        await manager.send_message(json.dumps({
                            "type": "friend_request_updated",
                            "data": await get_user_by_username(message["username"])
                        }), message["username"])
                    elif message.get("type") == "cancel_friend_request":               
                        user_data = await cancel_friend_request(message["username"], message["friend_username"])
                        user_data = await get_user_by_username(message["friend_username"])
                        if user_data:
                            await manager.send_message(json.dumps({
                                "type": "user_updated",
                                "data": user_data
                            }), message["friend_username"])
                            await manager.send_message(json.dumps({
                                "type": "user_updated",
                                "data": await get_user_by_username(message["username"])
                            }), message["username"])
                    elif message.get("type") == "invite_friend":
                        await invite_friend(message["battle_id"], message["friend_username"])
                        await manager.send_message(json.dumps({
                            "type": "user_updated",
                            "data": await get_user_by_username(message["friend_username"])
                        }), message["friend_username"])
                    elif message.get("type") == "cancel_invitation":
                        await cancel_invitation(message["friend_username"], message["battle_id"])
                        await manager.send_message(json.dumps({
                            "type": "user_updated",
                            "data": await get_user_by_username(message["friend_username"])
                        }), message["friend_username"])
                    elif message.get("type") == "accept_invitation":
                        try:
                            success = await accept_invitation(message["friend_username"], message["battle_id"])
                            if success:
                                battle = battles.get(message["battle_id"])
                                battle_started_message = json.dumps({
                                    "type": "battle_started",
                                    "data": battle.id
                                })
                                await manager.send_message(battle_started_message, battle.first_opponent)
                                await manager.send_message(battle_started_message, battle.second_opponent)
                                
                                
                                for connected_user in manager.active_connections.keys():
                                    if connected_user not in [battle.first_opponent, battle.second_opponent]:
                                        await manager.send_message(json.dumps({
                                            "type": "battle_removed",
                                            "data": message["battle_id"]
                                        }), connected_user)
                                
                                
                                for connected_user in manager.active_connections.keys():
                                    if connected_user != battle.first_opponent and connected_user != battle.second_opponent:
                                        user_data = await get_user_by_username(connected_user)
                                        if user_data and message["battle_id"] in user_data.get('invitations', []):
                                            user_data['invitations'].remove(message["battle_id"])
                                            user_update_data = UserDataCreate(**user_data)
                                            await update_user_data(user_update_data)
                                            await manager.send_message(json.dumps({
                                                "type": "user_updated",
                                                "data": user_data
                                            }), connected_user)
                                
                                # Send immediate response that quiz is being generated
                                await manager.send_message(json.dumps({
                                    "type": "quiz_generating",
                                    "data": {"battle_id": battle.id}
                                }), battle.first_opponent)
                                await manager.send_message(json.dumps({
                                    "type": "quiz_generating",
                                    "data": {"battle_id": battle.id}
                                }), battle.second_opponent)
                                # Poll for questions in the background
                                async def poll_for_questions():
                                    try:
                                        logger.info(f"Polling for quiz questions for battle {battle.id} ({battle.sport}, {battle.level})")
                                        max_attempts = 30
                                        attempts = 0
                                        questions = await get_cached_questions(battle.id)
                                        while not questions and attempts < max_attempts:
                                            await asyncio.sleep(1)
                                            questions = await get_cached_questions(battle.id)
                                            attempts += 1
                                        if not questions:
                                            logger.warning(f"Quiz questions not ready in time for battle {battle.id}, using fallback questions")
                                            try:
                                                from aiquiz.router import generate_ai_quiz
                                                questions = await generate_ai_quiz(battle.sport, battle.level, 6)
                                                if not questions or len(questions) < 6:
                                                    logger.warning(f"AI fallback also returned no questions for battle {battle.id}, using static questions")
                                                    from aiquiz.router import generate_expanded_fallback_questions
                                                    questions = generate_expanded_fallback_questions(battle.sport, battle.level, 6)
                                            except Exception as e:
                                                logger.error(f"Error in AI fallback for battle {battle.id}: {str(e)}, using static questions")
                                                from aiquiz.router import generate_expanded_fallback_questions
                                                questions = generate_expanded_fallback_questions(battle.sport, battle.level, 6)
                                        battle.questions = questions
                                        logger.info(f"Quiz questions ready for battle {battle.id}")
                                        await manager.send_message(json.dumps({
                                            "type": "quiz_ready",
                                            "data": {"battle_id": battle.id, "questions": questions}
                                        }), battle.first_opponent)
                                        await manager.send_message(json.dumps({
                                            "type": "quiz_ready",
                                            "data": {"battle_id": battle.id, "questions": questions}
                                        }), battle.second_opponent)
                                    except Exception as e:
                                        logger.error(f"Error polling for quiz questions for battle {battle.id}: {str(e)}")
                                        error_message = json.dumps({
                                            "type": "quiz_error",
                                            "data": {"battle_id": battle.id, "message": "Failed to get quiz questions"}
                                        })
                                        await manager.send_message(error_message, battle.first_opponent)
                                        await manager.send_message(error_message, battle.second_opponent)
                                asyncio.create_task(poll_for_questions())
                        except HTTPException as e:
                            
                            await manager.send_message(json.dumps({
                                "type": "invitation_error",
                                "data": {
                                    "message": e.detail,
                                    "battle_id": message["battle_id"]
                                }
                            }), message["friend_username"])
                            
                            
                            if e.status_code == 409:
                                for connected_user in manager.active_connections.keys():
                                    await manager.send_message(json.dumps({
                                        "type": "battle_removed",
                                        "data": message["battle_id"]
                                    }), connected_user)
                    elif message.get("type") == "join_battle":
                        battle = battles.get(message["battle_id"])
                        if battle and not battle.second_opponent:
                            battle.second_opponent = message["username"]
                            from aiquiz.router import generate_ai_quiz, generate_expanded_fallback_questions
                            async def ensure_seven_questions():
                                questions = await get_cached_questions(battle.id)
                                if not questions or len(questions) < 7:
                                    try:
                                        questions = await generate_ai_quiz(battle.sport, battle.level, 6)
                                        if not questions or len(questions) < 6:
                                            questions = generate_expanded_fallback_questions(battle.sport, battle.level, 6)
                                        import redis
                                        redis_client = redis.Redis.from_url("redis://redis:6379/0")
                                        questions_key = f"battle_questions:{battle.id}"
                                        redis_client.setex(questions_key, 3600, json.dumps(questions))
                                    except Exception as e:
                                        logger.error(f"Error ensuring 7 questions for battle {battle.id}: {str(e)}")
                                battle.questions = questions
                            # Start quiz generation in the background
                            asyncio.create_task(ensure_seven_questions())
                            # Immediately notify both users that the battle has started
                            battle_started_message = json.dumps({
                                "type": "battle_started",
                                "data": battle.id
                            })
                            await manager.send_message(battle_started_message, battle.first_opponent)
                            await manager.send_message(battle_started_message, battle.second_opponent)
                            for connected_user in manager.active_connections.keys():
                                if connected_user not in [battle.first_opponent, battle.second_opponent]:
                                    await manager.send_message(json.dumps({
                                        "type": "battle_removed",
                                        "data": message["battle_id"]
                                    }), connected_user)
                            # Notify both users that quiz is being generated
                            await manager.send_message(json.dumps({
                                "type": "quiz_generating",
                                "data": {"battle_id": battle.id}
                            }), battle.first_opponent)
                            await manager.send_message(json.dumps({
                                "type": "quiz_generating",
                                "data": {"battle_id": battle.id}
                            }), battle.second_opponent)
                            # Poll for questions in the background
                            async def poll_for_questions():
                                try:
                                    logger.info(f"Polling for quiz questions for battle {battle.id} ({battle.sport}, {battle.level})")
                                    max_attempts = 30
                                    attempts = 0
                                    questions = await get_cached_questions(battle.id)
                                    while not questions and attempts < max_attempts:
                                        await asyncio.sleep(1)
                                        questions = await get_cached_questions(battle.id)
                                        attempts += 1
                                    if not questions:
                                        logger.warning(f"Quiz questions not ready in time for battle {battle.id}, using fallback questions")
                                        try:
                                            from aiquiz.router import generate_ai_quiz
                                            questions = await generate_ai_quiz(battle.sport, battle.level, 6)
                                            if not questions:
                                                logger.warning(f"AI fallback also returned no questions for battle {battle.id}, using static questions")
                                                from aiquiz.router import generate_expanded_fallback_questions
                                                questions = generate_expanded_fallback_questions(battle.sport, battle.level, 6)
                                        except Exception as e:
                                            logger.error(f"Error in AI fallback for battle {battle.id}: {str(e)}, using static questions")
                                            from aiquiz.router import generate_expanded_fallback_questions
                                            questions = generate_expanded_fallback_questions(battle.sport, battle.level, 6)
                                    battle.questions = questions
                                    logger.info(f"Quiz questions ready for battle {battle.id}")
                                    await manager.send_message(json.dumps({
                                        "type": "quiz_ready",
                                        "data": {"battle_id": battle.id, "questions": questions}
                                    }), battle.first_opponent)
                                    await manager.send_message(json.dumps({
                                        "type": "quiz_ready",
                                        "data": {"battle_id": battle.id, "questions": questions}
                                    }), battle.second_opponent)
                                except Exception as e:
                                    logger.error(f"Error polling for quiz questions for battle {battle.id}: {str(e)}")
                                    error_message = json.dumps({
                                        "type": "quiz_error",
                                        "data": {"battle_id": battle.id, "message": "Failed to get quiz questions"}
                                    })
                                    await manager.send_message(error_message, battle.first_opponent)
                                    await manager.send_message(error_message, battle.second_opponent)
                            asyncio.create_task(poll_for_questions())
      
                    elif message.get("type") == "delete_user":
                        token = message.get("token")
                        if not token:
                            logger.error("No token provided for delete_user request.")
                            await manager.send_message(json.dumps({
                                "type": "error",
                                "message": "No token provided for account deletion."
                            }), actual_username)
                        else:
                            friends = await delete_user_data(token)
                            # Notify all friends in parallel
                            friend_notifications = []
                            for friend in friends:
                                friend_notifications.append(
                                    manager.send_message(json.dumps({
                                        "type": "user_updated",
                                        "data": await get_user_by_username(friend)
                                    }), friend)
                                )
                            if friend_notifications:
                                await asyncio.gather(*friend_notifications, return_exceptions=True)
                  
                    elif message.get("type") == "start_battle":                       
                        if battles[message["battle_id"]].first_opponent == actual_username:
                         await manager.send_message(json.dumps({
                            "type": "battle_start",
                            "data": battles[message["battle_id"]].get_question(0)
                        }), battles[message["battle_id"]].first_opponent)
                        else:
                            await manager.send_message(json.dumps({
                            "type": "battle_start",
                            "data": battles[message["battle_id"]].get_question(1)
                        }), battles[message["battle_id"]].second_opponent)
                            

                        if battles[message["battle_id"]].first_opponent == actual_username:
                            # Notify all connected users about battle start in parallel
                            battle_start_notifications = []
                            for connected_user in manager.active_connections.keys():
                                if connected_user != battles[message["battle_id"]].first_opponent and connected_user != battles[message["battle_id"]].second_opponent:
                                    battle_start_notifications.append(
                                        manager.send_message(json.dumps({
                                            "type": "battle_start",
                                            "data": message["battle_id"]
                                        }), connected_user)
                                    )
                            if battle_start_notifications:
                                await asyncio.gather(*battle_start_notifications, return_exceptions=True)
               
                    elif message.get("type") == "submit_answer":
                        logger.info(f"Answer submitted by {message['username']} for battle {message['battle_id']}: {message['answer']}")
                        index = battles[message["battle_id"]].check_for_answer(message["username"],message["answer"])
                        battle = battles[message["battle_id"]]
                        
                        logger.info(f"Battle state after answer - First opponent: {battle.first_opponent_answers}/{len(battle.questions)}, Second opponent: {battle.second_opponent_answers}/{len(battle.questions)}")
                        
                        # Send score updates immediately to both players
                        score_update_data = {
                            "first_opponent": battle.first_opponent_score,
                            "second_opponent": battle.second_opponent_score,
                            "first_opponent_name": battle.first_opponent,
                        }
                        
                        await manager.send_message(json.dumps({
                            "type": "score_updated",
                            "data": score_update_data
                        }), battle.first_opponent)
                        
                        await manager.send_message(json.dumps({
                            "type": "score_updated",
                            "data": score_update_data
                        }), battle.second_opponent)
                        
                        # Wait 3 seconds before sending next question
                        logger.info(f"Waiting 3 seconds before sending next question for battle {message['battle_id']}")
                        await asyncio.sleep(3)
                        
                        # Check if battle is still active before sending next question
                        if message["battle_id"] not in battles:
                            logger.info(f"Battle {message['battle_id']} no longer exists, skipping next question")
                            continue
                        
                        # Log the questions list and current state
                        logger.info(f"Battle questions for {message['battle_id']}: {battle.questions}")
                        logger.info(f"First opponent answers: {battle.first_opponent_answers}, Second opponent answers: {battle.second_opponent_answers}")
                        logger.info(f"First opponent finished: {battle.first_opponent_finished}, Second opponent finished: {battle.second_opponent_finished}")
                        
                        # Send next question to the player who answered
                        if index == 0:
                            next_question = battle.get_question(0)
                            logger.info(f"Sending next question to {battle.first_opponent}: {next_question}")
                            await manager.send_message(json.dumps({
                                "type": "next_question",
                                "data": {
                                    "question": next_question,
                                    "first_opponent": battle.first_opponent_score,
                                    "second_opponent": battle.second_opponent_score,
                                    "first_opponent_name": battle.first_opponent,
                                }
                            }), battle.first_opponent)
                        elif index == 1:
                            next_question = battle.get_question(1)
                            logger.info(f"Sending next question to {battle.second_opponent}: {next_question}")
                            await manager.send_message(json.dumps({
                                "type": "next_question",
                                "data": {
                                    "question": next_question,
                                    "first_opponent": battle.first_opponent_score,
                                    "second_opponent": battle.second_opponent_score,
                                    "first_opponent_name": battle.first_opponent,
                                }
                            }), battle.second_opponent)

                    elif message.get("type") == "check_for_winner":
                        battle = battles[message["battle_id"]]
                        result = battle.check_for_winner()
     
                        if result == "draw":
                            # Call the battle cleanup function
                            await battle_draw_result(message["battle_id"])
                            
                            await manager.send_message(json.dumps({
                                "type": "battle_finished",
                                "data": {
                                    "battle_id": message["battle_id"],
                                    "text": "draw",
                                    "questions": f"{battle.first_opponent} and {battle.second_opponent} was good enough and it is a draw",
                                    "loser": battle.first_opponent,
                                    "winner": battle.second_opponent,
                                }
                            }), battle.first_opponent)
                            await manager.send_message(json.dumps({
                                "type": "battle_finished",
                                "data": {
                                    "battle_id": message["battle_id"],
                                    "text": "draw",   
                                    "questions": f"{battle.first_opponent} and {battle.second_opponent} was good enough and it is a draw",
                                    "loser": battle.second_opponent,
                                    "winner": battle.first_opponent,
                                }
                            }), battle.second_opponent)
                            
                            
                            # Remove battle from waiting battles for all users in parallel
                            battle_removal_notifications = []
                            for connected_user in manager.active_connections.keys():
                                battle_removal_notifications.append(
                                    manager.send_message(json.dumps({
                                        "type": "battle_removed",
                                        "data": message["battle_id"]
                                    }), connected_user)
                                )
                            if battle_removal_notifications:
                                await asyncio.gather(*battle_removal_notifications, return_exceptions=True)
                            continue
                        elif result == battle.first_opponent:
                            
                            await battle_result(message["battle_id"], battle.first_opponent, battle.second_opponent, "win")
                            
                            await manager.send_message(json.dumps({
                                "type": "battle_finished",
                                "data": {
                                    "battle_id": message["battle_id"],
                                    "text": f"{battle.first_opponent} is owned and kicked ass from {battle.second_opponent}",
                                    "questions": f"{battle.first_opponent} become a father of {battle.second_opponent}",
                                    "loser": battle.second_opponent,
                                    "winner": battle.first_opponent,
                                    "loser": battle.second_opponent,
                                }
                            }), battle.first_opponent)
                            await manager.send_message(json.dumps({
                                "type": "battle_finished",
                                "data": {
                                    "battle_id": message["battle_id"],
                                    "text": f"{battle.second_opponent} was owned and kicked by {battle.first_opponent}",
                                    "questions": f"{battle.second_opponent} become a son of {battle.first_opponent}",
                                    "loser": battle.second_opponent,
                                    "winner": battle.first_opponent,
                                }
                            }), battle.second_opponent)
                            
                            # Remove battle from waiting battles for all users in parallel
                            battle_removal_notifications = []
                            for connected_user in manager.active_connections.keys():
                                battle_removal_notifications.append(
                                    manager.send_message(json.dumps({
                                        "type": "battle_removed",
                                        "data": message["battle_id"]
                                    }), connected_user)
                                )
                            if battle_removal_notifications:
                                await asyncio.gather(*battle_removal_notifications, return_exceptions=True)
                            continue
                        elif result == battle.second_opponent:
                            # Call the battle cleanup function
                            await battle_result(message["battle_id"], battle.second_opponent, battle.first_opponent, "win")
                            
                            await manager.send_message(json.dumps({
                                "type": "battle_finished",
                                "data": {
                                    "battle_id": message["battle_id"],
                                    "text": f"{battle.second_opponent} is owned and kicked ass from {battle.first_opponent}",
                                        "questions": f"{battle.second_opponent} become a father of {battle.first_opponent}",
                                        "loser": battle.first_opponent,
                                        "winner": battle.second_opponent,
                                    }
                            }), battle.second_opponent)
                            await manager.send_message(json.dumps({
                                "type": "battle_finished",
                                "data": {
                                    "battle_id": message["battle_id"],
                                    "text": f"{battle.first_opponent} was owned and kicked by {battle.second_opponent}",
                                    "questions": f"{battle.first_opponent} become a son of {battle.second_opponent}",
                                    "loser": battle.first_opponent,
                                    "winner": battle.second_opponent,
                                }
                            }), battle.first_opponent)
                            
                            # Remove battle from waiting battles for all users in parallel
                            battle_removal_notifications = []
                            for connected_user in manager.active_connections.keys():
                                battle_removal_notifications.append(
                                    manager.send_message(json.dumps({
                                        "type": "battle_removed",
                                        "data": message["battle_id"]
                                    }), connected_user)
                                )
                            if battle_removal_notifications:
                                await asyncio.gather(*battle_removal_notifications, return_exceptions=True)
                            continue

                    elif message.get("type") == "battle_result":
                        await battle_result(message["battle_id"], message["winner"], message["loser"], message["result"])
                        await manager.send_message(json.dumps({
                            "type": "user_updated",
                            "data": await get_user_by_username(message["winner"])
                        }), message["winner"])
                        await manager.send_message(json.dumps({
                            "type": "user_updated",
                            "data": await get_user_by_username(message["loser"])
                        }), message["loser"])
                        
                        # Remove battle from waiting battles for all users in parallel
                        battle_removal_notifications = []
                        for connected_user in manager.active_connections.keys():
                            battle_removal_notifications.append(
                                manager.send_message(json.dumps({
                                    "type": "battle_removed",
                                    "data": message["battle_id"]
                                }), connected_user)
                            )
                        if battle_removal_notifications:
                            await asyncio.gather(*battle_removal_notifications, return_exceptions=True)
                        
                    elif message.get("type") == "battle_draw_result":
                        await battle_draw_result(message["battle_id"])
                        battle = battles.get(message["battle_id"])
                        if battle:
                            await manager.send_message(json.dumps({
                                "type": "user_updated",
                                "data": await get_user_by_username(battle.first_opponent)
                            }), battle.first_opponent)
                            await manager.send_message(json.dumps({
                                "type": "user_updated",
                                "data": await get_user_by_username(battle.second_opponent)
                            }), battle.second_opponent)
                            
                            # Remove battle from waiting battles for all users in parallel
                            battle_removal_notifications = []
                            for connected_user in manager.active_connections.keys():
                                battle_removal_notifications.append(
                                    manager.send_message(json.dumps({
                                        "type": "battle_removed",
                                        "data": message["battle_id"]
                                    }), connected_user)
                                )
                            if battle_removal_notifications:
                                await asyncio.gather(*battle_removal_notifications, return_exceptions=True)
               
                    elif message.get("type") == "notify_battle_created":
                        try:
                            # Check for duplicate battle with same sport and level
                            duplicate_battle = None
                            for b in battles.values():
                                if (b.first_opponent == message["first_opponent"] and 
                                    b.sport == message["sport"] and 
                                    b.level == message["level"] and 
                                    b.second_opponent == ''):
                                    duplicate_battle = b
                                    break
                            
                            if duplicate_battle:
                                logger.warning(f"Duplicate battle creation attempt for {duplicate_battle.id}, skipping creation.")
                                await manager.send_message(json.dumps({
                                    "type": "error",
                                    "message": f"You already have a {message['sport']} ({message['level']}) battle waiting. Please wait for someone to join or cancel it first."
                                }), message["first_opponent"])
                                return
                            
                            # Check total number of waiting battles for this user (limit to 3)
                            user_waiting_battles = [b for b in battles.values() 
                                                  if b.first_opponent == message["first_opponent"] and b.second_opponent == '']
                            
                            if len(user_waiting_battles) >= 3:
                                logger.warning(f"User {message['first_opponent']} tried to create more than 3 waiting battles.")
                                await manager.send_message(json.dumps({
                                    "type": "error",
                                    "message": "You can have up to 3 active battles waiting. Please wait for someone to join or cancel some battles first."
                                }), message["first_opponent"])
                                return
                            
                            battle_id = str(uuid.uuid4())
                            battle = Battle(
                                id=battle_id,
                                first_opponent=message["first_opponent"],
                                sport=message["sport"],
                                level=message["level"],
                            )
                            battles[battle_id] = battle
                            logger.info(f"Created battle {battle_id} for {message['first_opponent']}")
                            
                            # Trigger AI quiz generation as soon as battle is created
                            try:
                                from tasks import queue_quiz_generation_task
                                task = queue_quiz_generation_task(battle_id, message["sport"], message["level"], 6)
                                logger.info(f"Started AI quiz generation task {task.id} for battle {battle_id}")
                            except Exception as e:
                                logger.error(f"Failed to start AI quiz generation for battle {battle_id}: {str(e)}")

                            # Get creator's user data to include avatar
                            creator_user = await get_user_by_username(message["first_opponent"])
                            creator_avatar = creator_user.get('avatar', '') if creator_user else ''
                            # Send response to battle creator
                            response_message = json.dumps({
                                "type": "battle_created_response",
                                "data": {
                                    "id": battle.id,
                                    "first_opponent": battle.first_opponent,
                                    "sport": battle.sport,
                                    "level": battle.level,
                                    "creator_avatar": creator_avatar
                                }
                            })
                            logger.info(f"Sending battle_created_response to {message['first_opponent']}: {response_message}")
                            await manager.send_message(response_message, message["first_opponent"])
                            logger.info(f"Successfully sent battle_created_response to {message['first_opponent']}")

                            # Send notification to other users
                            for connected_user in manager.active_connections.keys():
                                if connected_user != message["first_opponent"]:
                                    await manager.send_message(json.dumps({
                                        "type": "battle_created",
                                        "data": {
                                            "id": battle.id,
                                            "first_opponent": battle.first_opponent,
                                            "sport": battle.sport,
                                            "level": battle.level,
                                            "creator_avatar": creator_avatar
                                        }
                                    }), connected_user)
                        except Exception as e:
                            logger.error(f"Error creating battle: {str(e)}")
                            # Send error message to the user
                            await manager.send_message(json.dumps({
                                "type": "error",
                                "message": f"Failed to create battle: {str(e)}"
                            }), message["first_opponent"])

                    elif message.get("type") == "notify_battle_started":
                        # Only notify both users that the battle has started. Do NOT trigger quiz generation here.
                        await manager.send_message(json.dumps({
                            "type": "battle_started",
                            "data": message["battle_id"]
                        }), message["first_opponent"])
                        await manager.send_message(json.dumps({
                            "type": "battle_started",
                            "data": message["battle_id"]
                        }), message["second_opponent"])

                    elif message.get("type") == "cancel_battle":
                        battle_id = message["battle_id"]
                        username = message["username"]
                        
                        # Check if the battle exists and belongs to the user
                        if battle_id in battles:
                            battle = battles[battle_id]
                            if battle.first_opponent == username and not battle.second_opponent:
                                # Remove the battle
                                del battles[battle_id]
                                logger.info(f"Battle {battle_id} cancelled by {username}")
                                # Notify all users that the battle was removed
                                for connected_user in manager.active_connections.keys():
                                    await manager.send_message(json.dumps({
                                        "type": "battle_removed",
                                        "data": battle_id
                                    }), connected_user)
                                await manager.send_message(json.dumps({
                                    "type": "battle_cancelled",
                                    "data": battle_id
                                }), username)
                            else:                          
                                logger.warning(f"User {username} tried to cancel battle {battle_id} but is not allowed (second_opponent exists or not first_opponent)")
                                await manager.send_message(json.dumps({
                                    "type": "error",
                                    "message": "Cannot cancel this battle. Only the creator can cancel a waiting battle."
                                }), username)
                        else:
                            logger.warning(f"User {username} tried to cancel non-existent battle {battle_id}")
                            await manager.send_message(json.dumps({
                                "type": "error",
                                "message": "Battle not found"
                            }), username)

            
                except Exception as e:
                    logger.error(f"Error in battle_draw_result: {str(e)}")


            except WebSocketDisconnect:
                await manager.disconnect(actual_username)
                logger.info(f"Client {actual_username} disconnected")
                break
            except Exception as e:
                logger.error(f"Error processing message from client {actual_username}: {str(e)}")
                try:
                    await manager.send_message(json.dumps({
                        "type": "error",
                        "message": "Internal server error"
                    }), actual_username)
                except:
                    break
    except Exception as e:
        logger.error(f"Error in websocket connection: {str(e)}")
    finally:
        await manager.disconnect(actual_username)
        logger.info(f"Cleaned up connection for client {actual_username}")

@app.on_event("startup")
async def startup_event():
    await init_models()

    asyncio.create_task(monitor_inactive_players())
    
    try:
        from db.router import cleanup_old_usernames
        cleanup_result = await cleanup_old_usernames()
        logger.info(f"Old username cleanup completed: {cleanup_result}")
    except Exception as e:
        logger.error(f"Error during old username cleanup: {e}")
    
    logger.info("WebSocket server started successfully")
