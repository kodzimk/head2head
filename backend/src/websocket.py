from fastapi import WebSocket, FastAPI, WebSocketDisconnect
import json
import logging
from typing import Dict
from db.router import delete_user_data, get_user_data, update_user_data, get_user_by_username
from friends.router import add_friend, cancel_friend_request, send_friend_request
from battle.router import invite_friend, cancel_invitation, accept_invitation, battle_result, battle_draw_result
from battle.init import battles
from models import UserDataCreate
from init import init_models
from friends.router import remove_friend
from aiquiz.router import ai_quiz
import re
from fastapi import HTTPException

# Set up logging
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

    def disconnect(self, username: str):
        if username in self.active_connections:
            del self.active_connections[username]
            logger.info(f"Client {username} disconnected. Total connections: {len(self.active_connections)}")

    async def send_message(self, message: str, username: str):
        print(f"Attempting to send message to {username}. Active connections: {list(self.active_connections.keys())}")
        if username in self.active_connections:
            await self.active_connections[username].send_text(message)
            logger.info(f"Message sent to client {username}")
        else:
            print(f"User {username} not found in active connections!")
            logger.warning(f"User {username} not found in active connections")

manager = ConnectionManager()



@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, username: str):
    try:
        await manager.connect(websocket, username)

        while True:
            try:
                data = await websocket.receive_text()
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
                                battle.questions = await ai_quiz(f"make a quiz for {battle.sport} for level {battle.level}")
                        except Exception as e:
                            logger.error(f"Error in accept_invitation: {str(e)}")
                            await manager.send_message(json.dumps({
                                "type": "error",
                                "message": "Failed to accept invitation"
                            }), username)
                    elif message.get("type") == "join_battle":
                        try:
                            battle = battles.get(message["battle_id"])
                            if battle and not battle.second_opponent:
                                battle.second_opponent = message["username"]
                                battle_started_message = json.dumps({
                                    "type": "battle_started",
                                    "data": battle.id
                                })
                                print(f"Sending battle_started to first_opponent: {battle.first_opponent}")
                                await manager.send_message(battle_started_message, battle.first_opponent)
                                print(f"Sending battle_started to second_opponent: {battle.second_opponent}")
                                await manager.send_message(battle_started_message, battle.second_opponent)
                                
                                # Send battle_started to all users to remove from waiting list
                                print(f"Broadcasting battle_started to all users for battle {battle.id}")
                                for connected_user in manager.active_connections.keys():
                                    if connected_user not in [battle.first_opponent, battle.second_opponent]:
                                        await manager.send_message(battle_started_message, connected_user)
                                        print(f"Sent battle_started to {connected_user}")
                                
                                battle.questions = await ai_quiz(f"make a quiz for {battle.sport} for level {battle.level}")
                            else:
                                await manager.send_message(json.dumps({
                                    "type": "error",
                                    "message": "Battle not found or already full"
                                }), username)
                        except Exception as e:
                            logger.error(f"Error in join_battle: {str(e)}")
                            await manager.send_message(json.dumps({
                                "type": "error",
                                "message": "Failed to join battle"
                            }), username)
                    elif message.get("type") == "battle_created":
                        try:
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
                                # Send to all users except the creator
                                for connected_user in manager.active_connections.keys():
                                    if connected_user != battle.first_opponent:
                                        await manager.send_message(battle_created_message, connected_user)
                        except Exception as e:
                            logger.error(f"Error in battle_created: {str(e)}")
                    elif message.get("type") == "notify_battle_created":
                        try:
                            battle_id = message["battle_id"]
                            first_opponent = message["first_opponent"]
                            sport = message["sport"]
                            level = message["level"]
                            
                            print(f"Received notify_battle_created for battle {battle_id}")
                            
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
                            # Send to all users except the creator
                            sent_count = 0
                            for connected_user in manager.active_connections.keys():
                                if connected_user != first_opponent:
                                    await manager.send_message(battle_created_message, connected_user)
                                    sent_count += 1
                                    print(f"Sent battle_created to {connected_user}")
                            print(f"Sent battle_created to {sent_count} users")
                        except Exception as e:
                            logger.error(f"Error in notify_battle_created: {str(e)}")
                    elif message.get("type") == "notify_battle_deleted":
                        try:
                            battle_id = message["battle_id"]
                            print(f"Received notify_battle_deleted for battle {battle_id}")
                            
                            battle_removed_message = json.dumps({
                                "type": "battle_removed",
                                "data": battle_id
                            })
                            # Send to all connected users
                            sent_count = 0
                            for connected_user in manager.active_connections.keys():
                                await manager.send_message(battle_removed_message, connected_user)
                                sent_count += 1
                                print(f"Sent battle_removed to {connected_user}")
                            print(f"Sent battle_removed to {sent_count} users")
                        except Exception as e:
                            logger.error(f"Error in notify_battle_deleted: {str(e)}")
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
                        # Update both users for draw
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

                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON received from client {username}")
                    await manager.send_message(json.dumps({
                        "type": "error",
                        "message": "Invalid JSON format"
                    }), username)

            except WebSocketDisconnect:
                manager.disconnect(username)
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
        manager.disconnect(username)
        logger.info(f"Cleaned up connection for client {username}")

@app.on_event("startup")
async def startup_event():
    await init_models()
