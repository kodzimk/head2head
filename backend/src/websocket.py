from fastapi import WebSocket, FastAPI
import json
import logging
from typing import Dict
from db.router import get_user_data, update_user_data
from friends.router import add_friend, cancel_friend_request, send_friend_request
from battle.router import invite_friend, cancel_invitation
from models import UserDataCreate
from init import init_models

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Client {client_id} connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"Client {client_id} disconnected. Total connections: {len(self.active_connections)}")

    async def send_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)
            logger.info(f"Message sent to client {client_id}")

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_id = id(websocket)
    await manager.connect(websocket, client_id)
    
    try:        
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)          
                if message.get("type") == "user_update":
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
                 
                    updated_user = await update_user_data(user_data)

                    user_dict = {
                        "email": updated_user.email,
                        "username": updated_user.username,
                        "totalBattle": updated_user.totalBattle,
                        "winRate": updated_user.winRate,
                        "ranking": updated_user.ranking,
                        "winBattle": updated_user.winBattle,
                        "favourite": updated_user.favourite,
                        "streak": updated_user.streak,
                        "password": updated_user.password,
                        "friends": updated_user.friends,
                        "friendRequests": updated_user.friendRequests,
                        "avatar": updated_user.avatar,
                        "battles": updated_user.battles,
                        "invitations": updated_user.invitations
                    }
                    
                    await websocket.send_text(json.dumps({
                        "type": "user_updated",
                        "data": user_dict
                    }))
                elif message.get("type") == "get_email":
                    user_data = await get_user_data(message["email"])
                    if user_data:
                        await websocket.send_text(json.dumps({
                            "type": "user_updated",
                            "data": user_data
                        }))
                elif message.get("type") == "accept_friend_request":
                   user_data = await add_friend(message["username"], message["friend_username"])
                   if user_data:
                        await websocket.send_text(json.dumps({
                            "type": "user_updated",
                            "data": user_data
                        }))
                elif message.get("type") == "reject_friend_request":
                    user_data = await cancel_friend_request(message["username"], message["friend_username"])
                    if user_data:
                        await websocket.send_text(json.dumps({
                            "type": "user_updated",
                            "data": user_data
                        }))
                elif message.get("type") == "send_friend_request":
                    user_data = await send_friend_request(message["username"], message["friend_username"])
                    user_data = await get_user_data(message["friend_username"])
                    if user_data:
                        await websocket.send_text(json.dumps({
                            "type": "user_updated",
                            "data": user_data
                        }))
                elif message.get("type") == "cancel_friend_request":               
                    user_data = await cancel_friend_request(message["username"], message["friend_username"])
                    user_data = await get_user_data(message["friend_username"])
                    if user_data:
                        await websocket.send_text(json.dumps({
                            "type": "user_updated",
                            "data": user_data
                        }))
                elif message.get("type") == "invite_friend":
                    await invite_friend(message["battle_id"], message["friend_username"])
                elif message.get("type") == "cancel_invitation":
                    await cancel_invitation(message["friend_username"], message["battle_id"])

            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received from client {client_id}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
            except Exception as e:
                logger.error(f"Error processing message from client {client_id}: {str(e)}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": f"Error processing message: {str(e)}"
                }))
                
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {str(e)}")
    finally:
        manager.disconnect(client_id)

@app.on_event("startup")
async def startup_event():
    await init_models()
