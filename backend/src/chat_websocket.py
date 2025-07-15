from fastapi import WebSocket, FastAPI, WebSocketDisconnect
import json
import logging
import asyncio
import uuid
from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy import select
from db.router import delete_user_data, get_user_data, update_user_data, get_user_by_username
from friends.router import add_friend, cancel_friend_request, send_friend_request
from battle.router import invite_friend, cancel_invitation, accept_invitation, get_waiting_battles
from models import UserDataCreate
from init import init_models, SessionLocal
from models import User, ChatMessage
from app_config import app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Store active chat WebSocket connections
chat_active_connections: Dict[str, WebSocket] = {}
chat_user_last_activity: Dict[str, float] = {}
chat_user_warnings_sent: Dict[str, bool] = {}

class ChatConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.active_connections[username] = websocket

    async def disconnect(self, username: str):
        if username in self.active_connections:
            del self.active_connections[username]
            chat_user_warnings_sent.pop(username, None)

    async def send_message(self, message: str, username: str):
        if username in self.active_connections:
            await self.active_connections[username].send_text(message)

    async def _notify_friend_update(self, friend: str):
        # Similar to main WebSocket's friend update logic
        pass

    async def _notify_friend_request_update(self, connected_user: str, old_username: str):
        # Similar to main WebSocket's friend request update logic
        pass

    async def _notify_invitation_update(self, connected_user: str, old_username: str):
        # Similar to main WebSocket's invitation update logic
        pass

chat_manager = ChatConnectionManager()

async def get_user_by_username(username: str) -> Optional[User]:
    """
    Retrieve user by username
    """
    async with SessionLocal() as db:
        result = await db.execute(select(User).filter(User.username == username))
        return result.scalar_one_or_none()

async def validate_and_fix_username(connecting_username: str) -> str:
    """
    Validate and potentially correct username
    """
    # Trim and sanitize username
    connecting_username = connecting_username.strip()
    
    # Basic username validation
    if not connecting_username or len(connecting_username) < 3 or len(connecting_username) > 50:
        logger.warning(f"Invalid username format: {connecting_username}")
        return None
    
    try:
        # First, try to find the user directly
        user_data = await get_user_by_username(connecting_username)
        if user_data:
            return connecting_username
    except Exception as e:
        logger.error(f"Error finding user {connecting_username}: {e}")
    
    # If user not found, log a warning but allow connection for new users
    logger.warning(f"User {connecting_username} not found in database. Allowing connection for potential new user.")
    return connecting_username

@app.websocket("/chat")
async def handle_chat_websocket(websocket: WebSocket, username: str):
    """
    Handle WebSocket connection with functionality similar to main WebSocket
    """
    actual_username = None
    try:
        valid_username = await validate_and_fix_username(username)
        if valid_username is None:
            logger.warning(f"Rejecting WebSocket connection for invalid/old username: {username}")
            await websocket.close(code=4000, reason="Invalid username")
            return
        
        actual_username = valid_username
        if actual_username != username:
            logger.info(f"Username corrected from {username} to {actual_username}")
        
        await chat_manager.connect(websocket, actual_username)
        
        chat_user_last_activity[actual_username] = asyncio.get_event_loop().time()

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

                    await chat_manager.send_message(json.dumps({
                        "type": "user_updated",
                        "data": user_data
                    }), actual_username)
        except Exception as e:
            logger.error(f"Error checking friend list for {actual_username}: {e}")

        while True:
            try:
                data = await websocket.receive_text()
                
                chat_user_last_activity[actual_username] = asyncio.get_event_loop().time()
                
                chat_user_warnings_sent.pop(actual_username, None)
                
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
                            
                            if old_username in chat_manager.active_connections:
                                chat_manager.active_connections[message["username"]] = chat_manager.active_connections.pop(old_username)
                            
                            if old_username in chat_user_last_activity:
                                chat_user_last_activity[message["username"]] = chat_user_last_activity.pop(old_username)
                            
                            if old_username in chat_user_warnings_sent:
                                chat_user_warnings_sent[message["username"]] = chat_user_warnings_sent.pop(old_username)

                        # Notify all friends in parallel
                        friend_notifications = []
                        for friend in updated_user['friends']:
                            friend_notifications.append(
                                chat_manager._notify_friend_update(friend)
                            )
                        
                        # Run all friend notifications in parallel
                        if friend_notifications:
                            await asyncio.gather(*friend_notifications, return_exceptions=True)

                        await chat_manager.send_message(json.dumps({
                            "type": "user_updated",
                            "data": user_dict
                        }), message["username"])
                    
                    elif message.get("type") == "get_email":
                        user_data = await get_user_data(message["token"])
                        if user_data:
                            await chat_manager.send_message(json.dumps({
                                "type": "user_updated",
                                "data": user_data
                            }), user_data['username'])            
                    
                    elif message.get("type") == "accept_friend_request":
                       user_data = await add_friend(message["username"], message["friend_username"])
                       if user_data:
                            # Send user_updated to the user who accepted the request
                            await chat_manager.send_message(json.dumps({
                                "type": "user_updated",
                                "data": user_data,
                                "response_value": "accepted"
                            }), message["username"])
                            
                            # Get the updated data for the friend who sent the request
                            friend_data = await get_user_by_username(message["friend_username"])
                            if friend_data:
                                # Send user_updated to the friend who sent the request
                                await chat_manager.send_message(json.dumps({
                                    "type": "user_updated",
                                    "data": friend_data,
                                    "response_value": "accepted"
                                }), message["friend_username"])
                    
                    elif message.get("type") == "reject_friend_request":
                        user_data = await cancel_friend_request(message["username"], message["friend_username"])
                        if user_data:
                            # Send user_updated to the user who rejected the request
                            await chat_manager.send_message(json.dumps({
                                "type": "user_updated",
                                "data": user_data,
                                "response_value": "rejected"
                            }), message["username"])
                    
                    # Add other message types as needed
                    elif message.get("type") == "chat":
                        # Handle chat-specific messages
                        await handle_chat_message(actual_username, message)
                    
                    elif message.get("type") == "typing":
                        # Handle typing indicators
                        await handle_typing_indicator(actual_username, message)
                    
                    elif message.get("type") == "read_receipt":
                        # Handle read receipts
                        await handle_read_receipt(actual_username, message)

                except Exception as e:
                    logger.error(f"Error processing message: {e}", exc_info=True)
            
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error: {e}", exc_info=True)
                break
    
    except Exception as e:
        logger.error(f"Initialization error: {e}", exc_info=True)
    
    finally:
        if actual_username:
            await chat_manager.disconnect(actual_username)

async def handle_chat_message(sender_username: str, message: dict):
    """
    Process and forward chat messages
    """
    # Validate message
    if not message.get('content'):
        logger.warning(f"Empty message from {sender_username}")
        return

    if len(message.get('content', '')) > 1000:
        logger.warning(f"Message too long from {sender_username}")
        return

    async with SessionLocal() as db:
        try:
            # Validate receiver (can be username)
            receiver_username = message.get('receiver_id')
            
            if not receiver_username:
                logger.warning(f"No receiver specified for message from {sender_username}")
                return

            # Create chat message
            chat_message = ChatMessage(
                sender_id=sender_username,
                receiver_id=receiver_username,
                content=message['content']
            )
            db.add(chat_message)
            await db.commit()
            await db.refresh(chat_message)

            # Send message to receiver if connected
            if receiver_username in chat_manager.active_connections:
                await chat_manager.send_message(json.dumps({
                    'type': 'chat',
                    'sender_id': sender_username,
                    'receiver_id': receiver_username,
                    'content': message['content'],
                    'timestamp': datetime.utcnow().isoformat()
                }), receiver_username)

        except Exception as e:
            logger.error(f"Error handling chat message: {e}", exc_info=True)

async def handle_typing_indicator(sender_username: str, message: dict):
    """
    Forward typing indicators
    """
    try:
        receiver_username = message['receiver_id']
        
        # Send typing indicator to receiver if connected
        if receiver_username in chat_manager.active_connections:
            await chat_manager.send_message(json.dumps({
                'type': 'typing',
                'sender_id': sender_username
            }), receiver_username)
    except Exception as e:
        logger.error(f"Error handling typing indicator: {e}", exc_info=True)

async def handle_read_receipt(sender_username: str, message: dict):
    """
    Process and forward read receipts
    """
    try:
        receiver_username = message['receiver_id']
        message_id = message.get('message_id', '')
        
        # Send read receipt to receiver if connected
        if receiver_username in chat_manager.active_connections:
            await chat_manager.send_message(json.dumps({
                'type': 'read_receipt',
                'message_id': message_id,
                'sender_id': sender_username
            }), receiver_username)
    except Exception as e:
        logger.error(f"Error handling read receipt: {e}", exc_info=True) 