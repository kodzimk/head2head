from fastapi import WebSocket, FastAPI, WebSocketDisconnect
import json
import logging
from typing import Dict
from db.router import delete_user_data, get_user_data, update_user_data, get_user_by_username
from friends.router import add_friend, cancel_friend_request, send_friend_request
from battle.router import invite_friend, cancel_invitation, accept_invitation
from battle.init import redis_battle
from models import UserDataCreate
from init import init_models
from friends.router import remove_friend
import asyncio
# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

sampleQuestions = [
  {
    "id": 1,
    "question": "What is the capital of France?",
    "answers": [
      { "label": 'A', "text": 'Berlin' },
      { "label": 'B', "text": 'Madrid' },
      { "label": 'C', "text": 'Paris' },
      { "label": 'D', "text": 'Rome' },
    ],
    "correctAnswer": 'C',
  },
  {
    "id": 2,
    "question": 'Which planet is known as the Red Planet?',
    "answers": [
      { "label": 'A', "text": 'Venus' },
      { "label": 'B', "text": 'Mars' },
      { "label": 'C', "text": 'Jupiter' },
      { "label": 'D', "text": 'Saturn' },
    ],
    "correctAnswer": 'B',
  },
  {
    "id": 3,
    "question": 'What is the largest ocean on Earth?',
    "answers": [
      { "label": 'A', "text": 'Atlantic Ocean' },
      { "label": 'B', "text": 'Indian Ocean' },
      { "label": 'C', "text": 'Arctic Ocean' },
      { "label": 'D', "text": 'Pacific Ocean' },
    ],
    "correctAnswer": 'D',
  },
];


class Battle:
    def __init__(self, id: str,questions: list):
        self.id = id
        self.questions = questions
        self.current_question = 0
        self.first_opponent_answers = 0
        self.second_opponent_answers = 0

    def get_question(self,index: int):
        if index == 0:
            if len(self.questions) == self.first_opponent_answers:
                return {"question": "No more questions", "answers": []}
            question = self.questions[self.first_opponent_answers]
            self.first_opponent_answers += 1
        else:
            if len(self.questions) == self.second_opponent_answers:
                return {"question": "No more questions", "answers": []}
            question = self.questions[self.second_opponent_answers]
            self.second_opponent_answers += 1
        return question
    
    def check_for_answer(self,username: str,answer: str):
        if username == json.loads(redis_battle.get(self.id))["first_opponent"]:
            if answer == self.questions[self.first_opponent_answers - 1]["correctAnswer"]:
                print("first_opponent_answers",self.first_opponent_answers)
                redis_battle.set(self.id,json.dumps({
                    "id": self.id,
                    "sport": json.loads(redis_battle.get(self.id))["sport"],
                    "duration": json.loads(redis_battle.get(self.id))["duration"],
                    "first_opponent": json.loads(redis_battle.get(self.id))["first_opponent"],
                    "second_opponent": json.loads(redis_battle.get(self.id))["second_opponent"],
                    "first_opponent_score": json.loads(redis_battle.get(self.id))["first_opponent_score"] + 1,
                    "second_opponent_score": json.loads(redis_battle.get(self.id))["second_opponent_score"]
                }))
            return 0
        else:
            if answer == self.questions[self.second_opponent_answers - 1]["correctAnswer"]:
                
                redis_battle.set(self.id,json.dumps({
                    "id": self.id,
                    "sport": json.loads(redis_battle.get(self.id))["sport"],
                    "duration": json.loads(redis_battle.get(self.id))["duration"],
                    "first_opponent": json.loads(redis_battle.get(self.id))["first_opponent"],
                    "second_opponent": json.loads(redis_battle.get(self.id))["second_opponent"],
                    "first_opponent_score": json.loads(redis_battle.get(self.id))["first_opponent_score"],
                    "second_opponent_score": json.loads(redis_battle.get(self.id))["second_opponent_score"] + 1
                }))
            return 1

battles = dict()

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
        if username in self.active_connections:
            await self.active_connections[username].send_text(message)
            logger.info(f"Message sent to client {username}")

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
                        user_data = await get_user_data(message["email"])
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
                                battle = redis_battle.get(message["battle_id"])
                                battle = json.loads(battle)
                                battle_started_message = json.dumps({
                                    "type": "battle_started",
                                    "data": battle['id']
                                })
                                await manager.send_message(battle_started_message, battle["first_opponent"])
                                await manager.send_message(battle_started_message, battle["second_opponent"])
                        except Exception as e:
                            logger.error(f"Error in accept_invitation: {str(e)}")
                            await manager.send_message(json.dumps({
                                "type": "error",
                                "message": "Failed to accept invitation"
                            }), username)                              
                    elif message.get("type") == "delete_user":
                       friends =  await delete_user_data(message["email"])
                       for friend in friends:
                           await manager.send_message(json.dumps({
                               "type": "user_updated",
                               "data": await get_user_by_username(friend)
                           }), friend)
        

                    elif message.get("type") == "start_battle":
                        battles[message["battle_id"]] = Battle(message["battle_id"], sampleQuestions)
                       
                        await manager.send_message(json.dumps({
                            "type": "battle_start",
                            "data": battles[message["battle_id"]].get_question(0)
                        }), json.loads(redis_battle.get(message["battle_id"]))["first_opponent"])
                        
                        await manager.send_message(json.dumps({
                            "type": "battle_start",
                            "data": battles[message["battle_id"]].get_question(1)
                        }), json.loads(redis_battle.get(message["battle_id"]))["second_opponent"])

                    elif message.get("type") == "submit_answer":
                        index = battles[message["battle_id"]].check_for_answer(message["username"],message["answer"])
                        
                        battle = json.loads(redis_battle.get(message["battle_id"]))
                        if index == 0:
                            await manager.send_message(json.dumps({
                            "type": "score_updated",
                            "data": {
                                "first_opponent": battle["first_opponent_score"],
                                "second_opponent": battle["second_opponent_score"]
                            }
                        }), json.loads(redis_battle.get(message["battle_id"]))["second_opponent"])
                            await manager.send_message(json.dumps({
                                "type": "next_question",
                                "data": {
                                    "question": battles[message["battle_id"]].get_question(0),
                                    "first_opponent": battle["first_opponent_score"],
                                    "second_opponent": battle["second_opponent_score"]
                                }
                            }), json.loads(redis_battle.get(message["battle_id"]))["first_opponent"])
                        elif index == 1:
                            await manager.send_message(json.dumps({
                            "type": "score_updated",
                            "data": {
                                "first_opponent": battle["first_opponent_score"],
                                "second_opponent": battle["second_opponent_score"]
                            }
                        }), json.loads(redis_battle.get(message["battle_id"]))["first_opponent"])
                            await manager.send_message(json.dumps({
                                "type": "next_question",
                                "data": {
                                    "question": battles[message["battle_id"]].get_question(1),
                                    "first_opponent": battle["first_opponent_score"],
                                    "second_opponent": battle["second_opponent_score"]
                                }
                            }), json.loads(redis_battle.get(message["battle_id"]))["second_opponent"])

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
