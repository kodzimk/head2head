from fastapi import WebSocket, FastAPI, WebSocketDisconnect
import json
import logging
from typing import Dict
from db.router import delete_user_data, get_user_data, update_user_data, get_user_by_username
from friends.router import add_friend, cancel_friend_request, send_friend_request
from battle.router import invite_friend, cancel_invitation, accept_invitation, battle_result, battle_draw_result, create_battle, get_waiting_battles
from battle.init import battles
from models import UserDataCreate
from init import init_models
from friends.router import remove_friend
from aiquiz.router import generate_ai_quiz
import asyncio


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.active_connections[username] = websocket
        logger.info(f"Client {username} connected. Total connections: {len(self.active_connections)}")

    async def disconnect(self, username: str):
        if username in self.active_connections:
            del self.active_connections[username]
            logger.info(f"Client {username} disconnected. Total connections: {len(self.active_connections)}")
            
            await self.handle_battle_disconnect(username)

    async def handle_battle_disconnect(self, disconnected_username: str):
        try:
            for battle_id, battle in battles.items():
                if (battle.first_opponent == disconnected_username or 
                    battle.second_opponent == disconnected_username):
                    if battle.first_opponent == disconnected_username:
                        winner = battle.second_opponent
                        loser = battle.first_opponent
                        battle.second_opponent_score = 10
                        
                    else:
                        winner = battle.first_opponent
                        loser = battle.second_opponent
                        battle.first_opponent_score = 10
                       
                    
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
            logger.info(f"Message sent to client {username}")
        else:
           
            logger.warning(f"User {username} not found in active connections")

manager = ConnectionManager()

user_last_activity = {}

async def monitor_inactive_players():
    while True:
        try:
            current_time = asyncio.get_event_loop().time()
            inactive_threshold = 30  
            
            for battle_id, battle in battles.items():
                if battle.first_opponent in user_last_activity:
                    time_since_activity = current_time - user_last_activity[battle.first_opponent]
                    if time_since_activity > inactive_threshold:
                        battle.second_opponent_score = 10
                        await manager.handle_battle_disconnect(battle.first_opponent)
                        continue
                
                if battle.second_opponent in user_last_activity:
                    time_since_activity = current_time - user_last_activity[battle.second_opponent]
                    if time_since_activity > inactive_threshold:                  
                        battle.first_opponent_score = 10
                        await manager.handle_battle_disconnect(battle.second_opponent)
                        continue
            
            await asyncio.sleep(10)  
        except Exception as e:
            logger.error(f"Error in monitor_inactive_players: {str(e)}")
            await asyncio.sleep(10)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, username: str):
    try:
        await manager.connect(websocket, username)
        
        user_last_activity[username] = asyncio.get_event_loop().time()

        # Send waiting battles to the user when they connect
        try:
            waiting_battles = await get_waiting_battles()
            await manager.send_message(json.dumps({
                "type": "waiting_battles",
                "data": waiting_battles
            }), username)
        except Exception as e:
            logger.error(f"Error sending waiting battles to {username}: {str(e)}")

        while True:
            try:
                data = await websocket.receive_text()
                
                user_last_activity[username] = asyncio.get_event_loop().time()
                
                try:
                    message = json.loads(data)          
                    if message.get("type") == "user_update":
                        temp = message["username"]
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

                        for friend in updated_user['friends']:
                            await manager.send_message(json.dumps({
                                "type": "user_updated",
                                "data": await get_user_by_username(friend)
                            }), friend)


                        await manager.send_message(json.dumps({
                            "type": "user_updated",
                            "data": user_dict
                        }), temp)
                        manager.active_connections[message['username']] = websocket               
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
                                battle.questions = await generate_ai_quiz(f"make a quiz for {battle.sport} for level {battle.level}")
                        
                    elif message.get("type") == "join_battle":
                            battle = battles.get(message["battle_id"])
                            if battle and not battle.second_opponent:
                                battle.second_opponent = message["username"]
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
                                battle.questions = await generate_ai_quiz(f"make a quiz for {battle.sport} for level {battle.level}")

                    elif message.get("type") == "battle_created":
                        
                            battle = battles.get(message["battle_id"])
                            if battle:
                                battle_created_message = json.dumps({
                                    "type": "battle_created",
                                    "data": {
                                        "id": battle.id,
                                        "first_opponent": battle.first_opponent,
                                        "sport": battle.sport,
                                        "level": battle.level,
                                        "created_at": battle.id
                                    }
                                })
                                
                                for connected_user in manager.active_connections.keys():
                                    if connected_user != battle.first_opponent:
                                        await manager.send_message(battle_created_message, connected_user)
                            
                    elif message.get("type") == "delete_user":
                       friends =  await delete_user_data(message["email"])
                       for friend in friends:
                           await manager.send_message(json.dumps({
                               "type": "user_updated",
                               "data": await get_user_by_username(friend)
                           }), friend)
                  
                    elif message.get("type") == "start_battle":                       
                        if battles[message["battle_id"]].first_opponent == username:
                         await manager.send_message(json.dumps({
                            "type": "battle_start",
                            "data": battles[message["battle_id"]].get_question(0)
                        }), battles[message["battle_id"]].first_opponent)
                        else:
                            await manager.send_message(json.dumps({
                            "type": "battle_start",
                            "data": battles[message["battle_id"]].get_question(1)
                        }), battles[message["battle_id"]].second_opponent)
                            
                        for connected_user in manager.active_connections.keys():
                            if connected_user != battles[message["battle_id"]].first_opponent and connected_user != battles[message["battle_id"]].second_opponent:
                                await manager.send_message(json.dumps({
                                    "type": "battle_start",
                                    "data": message["battle_id"]
                                }), connected_user)

                    elif message.get("type") == "submit_answer":
                        index = battles[message["battle_id"]].check_for_answer(message["username"],message["answer"])
                        battle = battles[message["battle_id"]]
                        
                        if index == 0:
                            await manager.send_message(json.dumps({
                            "type": "score_updated",
                            "data": {
                                "first_opponent": battle.first_opponent_score,
                                "second_opponent": battle.second_opponent_score,
                                "first_opponent_name": battle.first_opponent,
                            }
                        }), battle.second_opponent)
                            await manager.send_message(json.dumps({
                                "type": "next_question",
                                "data": {
                                    "question": battles[message["battle_id"]].get_question(0),
                                    "first_opponent": battle.first_opponent_score,
                                    "second_opponent": battle.second_opponent_score,
                                    "first_opponent_name": battle.first_opponent,
                                }
                            }), battle.first_opponent)
                        elif index == 1:
                            await manager.send_message(json.dumps({
                            "type": "score_updated",
                            "data": {
                                    "first_opponent": battle.first_opponent_score,
                                "second_opponent": battle.second_opponent_score,
                                "first_opponent_name": battle.first_opponent,
                            }
                        }), battle.first_opponent)
                            await manager.send_message(json.dumps({
                                "type": "next_question",
                                "data": {
                                    "question": battles[message["battle_id"]].get_question(1),
                                    "first_opponent": battle.first_opponent_score,
                                    "second_opponent": battle.second_opponent_score,
                                    "first_opponent_name": battle.first_opponent,
                                }
                            }), battle.second_opponent)

                    elif message.get("type") == "check_for_winner":
                        battle = battles[message["battle_id"]]
                        result = battle.check_for_winner()
     
                        if result == "draw":
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
                            continue
                        elif result == battle.first_opponent:
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
                            continue
                        elif result == battle.second_opponent:
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
               
                    elif message.get("type") == "notify_battle_created":
                        battle = await create_battle(message["first_opponent"], message["sport"], message["level"])
                        await manager.send_message(json.dumps({
                            "type": "battle_created_response",
                            "data": {
                                "id": battle.id,
                                "first_opponent": battle.first_opponent,
                                "sport": battle.sport,
                                "level": battle.level,
                            }
                        }), message["first_opponent"])

                        for connected_user in manager.active_connections.keys():
                                await manager.send_message(json.dumps({
                                    "type": "battle_created",
                                    "data": {
                                        "id": battle.id,
                                        "first_opponent": battle.first_opponent,
                                        "sport": battle.sport,
                                        "level": battle.level,
                                    }
                                }), connected_user)
                        
                    elif message.get("type") == "notify_battle_started":
                        await manager.send_message(json.dumps({
                            "type": "battle_started",
                            "data": message["battle_id"]
                        }), message["first_opponent"])
                        await manager.send_message(json.dumps({
                            "type": "battle_started",
                            "data": message["battle_id"]
                        }), message["second_opponent"])
                except Exception as e:
                    logger.error(f"Error in battle_draw_result: {str(e)}")


            except WebSocketDisconnect:
                await manager.disconnect(username)
                logger.info(f"Client {username} disconnected")
                break
            except Exception as e:
                logger.error(f"Error processing message from client {username}: {str(e)}")
                try:
                    await manager.send_message(json.dumps({
                        "type": "error",
                        "message": "Internal server error"
                    }), username)
                except:
                    break
    except Exception as e:
        logger.error(f"Error in websocket connection: {str(e)}")
    finally:
        await manager.disconnect(username)
        logger.info(f"Cleaned up connection for client {username}")

@app.on_event("startup")
async def startup_event():
    await init_models()

    asyncio.create_task(monitor_inactive_players())
