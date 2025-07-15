from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Dict, Any
import json
from sqlalchemy import or_, and_, func
from sqlalchemy.future import select
from fastapi import HTTPException, Depends
from typing import Optional, Dict, Any
from pydantic import BaseModel
import uuid
import logging
from fastapi import Response
from fastapi.responses import JSONResponse

from init import get_async_session, SessionLocal, redis_email, redis_username
from auth.router import get_current_user
from models import User, UserData, FriendshipCreate, FriendResponse, ChatMessageCreate, ChatMessageResponse, ChatMessage
from friends.service import FriendService, ChatService
from models import Friendship

friends_router = APIRouter(prefix="/friends", tags=["friends"])
chat_router = APIRouter(prefix="/chat", tags=["chat"])

# Export friends_router as router_friend to match main.py import
router_friend = friends_router

# Explicitly define __all__ to control exports
__all__ = ['friends_router', 'chat_router', 'router_friend']

@friends_router.post("/add", response_model=FriendshipCreate)
async def add_friend(
    friend_username: str, 
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Send a friend request to another user
    """
    try:
        friendship = await FriendService.add_friend(db, current_user.id, friend_username)
        if not friendship:
            raise HTTPException(status_code=400, detail="Cannot add friend")
        return friendship
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@friends_router.get("/list", response_model=List[FriendResponse])
async def get_friends(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get list of accepted friends
    """
    try:
        friends = await FriendService.get_friends(db, current_user.id)
        return [
            FriendResponse(
                id=friend.id, 
                username=friend.username, 
                email=friend.email,
                avatar=friend.avatar,
                online_status=friend.online_status,
                last_seen=friend.last_seen
            ) for friend in friends
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@friends_router.post("/accept/{requester_id}")
async def accept_friend_request(
    requester_id: str, 
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Accept a friend request
    """
    try:
        friendship = await FriendService.accept_friend_request(db, current_user.id, requester_id)
        if not friendship:
            raise HTTPException(status_code=404, detail="Friend request not found")
        return {"status": "accepted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@chat_router.post("/send", response_model=ChatMessageResponse)
async def send_message(
    message: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Send a chat message to a friend
    """
    try:
        chat_message = await ChatService.send_message(
            db, 
            current_user.id, 
            message.receiver_id, 
            message.content
        )
        return ChatMessageResponse(
            id=chat_message.id,
            sender_id=chat_message.sender_id,
            receiver_id=chat_message.receiver_id,
            content=chat_message.content,
            timestamp=chat_message.timestamp,
            is_read=chat_message.is_read,
            message_type=chat_message.message_type
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@chat_router.get("/history/{friend_id}", response_model=List[ChatMessageResponse])
async def get_chat_history(
    friend_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
    limit: int = 50
):
    """
    Get chat history with a specific friend
    Supports both UUID and username
    """
    # Log the full request details for debugging
    logger.info(f"Received chat history request:")
    logger.info(f"Headers: {dict(request.headers)}")
    logger.info(f"Origin: {request.headers.get('origin', 'No origin header')}")
    logger.info(f"Referer: {request.headers.get('referer', 'No referer header')}")
    logger.info(f"User-Agent: {request.headers.get('user-agent', 'No user-agent')}")

    # Log the request for debugging
    logger.info(f"Chat history request: user={current_user.username}, friend_id={friend_id}, limit={limit}")

    # Validate input
    if not friend_id or len(friend_id) < 3 or len(friend_id) > 50:
        logger.warning(f"Invalid friend identifier: {friend_id}")
        raise HTTPException(status_code=400, detail="Invalid friend identifier")

    try:
        # Try to parse as UUID first
        try:
            friend_uuid = uuid.UUID(friend_id)
            friend_query = await db.execute(select(User).filter(User.id == friend_uuid))
        except ValueError:
            # If not a valid UUID, try username
            friend_query = await db.execute(select(User).filter(User.username == friend_id))
        
        friend = friend_query.scalar_one_or_none()
        
        if not friend:
            logger.warning(f"Friend not found: {friend_id}")
            raise HTTPException(status_code=404, detail="Friend not found")
        
        # Verify friendship (optional, can be commented out if not needed)
        friendship_query = await db.execute(
            select(Friendship).filter(
                or_(
                    and_(Friendship.user_id == current_user.id, Friendship.friend_id == friend.id),
                    and_(Friendship.user_id == friend.id, Friendship.friend_id == current_user.id)
                ),
                Friendship.status == 'accepted'
            )
        )
        friendship = friendship_query.scalar_one_or_none()
        
        if not friendship:
            logger.warning(f"No friendship found between {current_user.username} and {friend.username}")
            raise HTTPException(status_code=403, detail="Not friends or friendship not accepted")
        
        # Fetch messages between current user and friend
        messages = await ChatService.get_chat_history(
            db, 
            current_user.id, 
            friend.id, 
            limit
        )
        
        # Convert messages to response model
        response = [
            ChatMessageResponse(
                id=str(msg.id),  # Convert UUID to string
                sender_id=str(msg.sender_id),  # Convert UUID to string
                receiver_id=str(msg.receiver_id),  # Convert UUID to string
                content=msg.content,
                timestamp=msg.timestamp.isoformat(),
                is_read=msg.is_read,
                message_type=msg.message_type
            ) for msg in messages
        ]
        
        logger.info(f"Returning {len(response)} messages for {current_user.username} and {friend.username}")
        
        # Return response with explicit CORS headers
        return JSONResponse(
            content=response,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
                "Access-Control-Max-Age": "86400",
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error fetching chat history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@chat_router.options("/history/{friend_id}")
async def chat_history_options(
    friend_id: str,
    request: Request
):
    """
    Handle CORS preflight requests for chat history endpoint
    """
    logger.info(f"CORS preflight request for chat history: {friend_id}")
    logger.info(f"Preflight headers: {dict(request.headers)}")
    
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
            "Access-Control-Max-Age": "86400",
        }
    )

class ChatPreviewResponse(BaseModel):
    lastMessage: Optional[Dict[str, Any]] = None
    unreadCount: int = 0

@chat_router.get("/chat-preview", response_model=ChatPreviewResponse)
async def get_chat_preview(
    username: str,
    friendUsername: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get chat preview for a specific friend
    """
    try:
        # Find sender and receiver user IDs
        sender_query = await db.execute(select(User).filter(User.username == username))
        sender = sender_query.scalar_one_or_none()
        
        receiver_query = await db.execute(select(User).filter(User.username == friendUsername))
        receiver = receiver_query.scalar_one_or_none()
        
        if not sender or not receiver:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get last message
        last_message_query = await db.execute(
            select(ChatMessage)
            .filter(
                or_(
                    and_(ChatMessage.sender_id == sender.id, ChatMessage.receiver_id == receiver.id),
                    and_(ChatMessage.sender_id == receiver.id, ChatMessage.receiver_id == sender.id)
                )
            )
            .order_by(ChatMessage.timestamp.desc())
            .limit(1)
        )
        last_message = last_message_query.scalar_one_or_none()
        
        # Count unread messages
        unread_count_query = await db.execute(
            select(func.count(ChatMessage.id))
            .filter(
                ChatMessage.receiver_id == sender.id,
                ChatMessage.sender_id == receiver.id,
                ChatMessage.is_read == False
            )
        )
        unread_count = unread_count_query.scalar_one()
        
        return ChatPreviewResponse(
            lastMessage={
                "id": str(last_message.id) if last_message else None,
                "senderId": str(last_message.sender_id) if last_message else None,
                "receiverId": str(last_message.receiver_id) if last_message else None,
                "content": last_message.content if last_message else None,
                "timestamp": last_message.timestamp.isoformat() if last_message else None
            } if last_message else None,
            unreadCount=unread_count
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def send_friend_request(username: str, friend_username: str):
    """
    Send a friend request from one user to another
    """
    try:
        async with SessionLocal() as db:
            # Fetch the current user
            user_stmt = select(UserData).filter(UserData.username == username)
            user_result = await db.execute(user_stmt)
            user = user_result.scalar_one_or_none()
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
        
            # Fetch the friend
            friend_stmt = select(UserData).filter(UserData.username == friend_username)
            friend_result = await db.execute(friend_stmt)
            friend = friend_result.scalar_one_or_none()
            
            if not friend:
                raise HTTPException(status_code=404, detail="Friend not found")
            
            # Check if already friends
            if friend_username in user.friends:
                raise HTTPException(status_code=400, detail="Already friends")
            
            # Check if friend request already sent
            if friend_username in user.friendRequests:
                raise HTTPException(status_code=400, detail="Friend request already sent")
            
            # Add friend request
            user.friendRequests.append(friend_username)
            await db.commit()
            await db.refresh(user)
            
            # Serialize and update Redis
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
            redis_email.set(user.email, json.dumps(user_dict))
            redis_username.set(user.username, json.dumps(user_dict))
            
            return user_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def cancel_friend_request(username: str, friend_username: str):
    """
    Cancel a friend request sent to another user
    """
    try:
        async with SessionLocal() as db:
            # Fetch the current user
            user_stmt = select(UserData).filter(UserData.username == username)
            user_result = await db.execute(user_stmt)
            user = user_result.scalar_one_or_none()
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Remove friend request if it exists
            if friend_username in user.friendRequests:
                user.friendRequests.remove(friend_username)
                await db.commit()
                await db.refresh(user)
                
                # Serialize and update Redis
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
                redis_email.set(user.email, json.dumps(user_dict))
                redis_username.set(user.username, json.dumps(user_dict))
                
                return user_dict
            else:
                raise HTTPException(status_code=404, detail="Friend request not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def remove_friend(username: str, friend_username: str):
    """
    Remove a friend from the user's friend list
    """
    try:
        async with SessionLocal() as db:
            # Fetch the current user
            user_stmt = select(UserData).filter(UserData.username == username)
            user_result = await db.execute(user_stmt)
            user = user_result.scalar_one_or_none()
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Remove friend if exists
            if friend_username in user.friends:
                user.friends.remove(friend_username)
                await db.commit()
                await db.refresh(user)
                
                # Fetch the friend to remove the current user from their friends list
                friend_stmt = select(UserData).filter(UserData.username == friend_username)
                friend_result = await db.execute(friend_stmt)
                friend = friend_result.scalar_one_or_none()
                
                if friend and username in friend.friends:
                    friend.friends.remove(username)
                    await db.commit()
                    await db.refresh(friend)
                
                # Serialize and update Redis for both users
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
                redis_email.set(user.email, json.dumps(user_dict))
                redis_username.set(user.username, json.dumps(user_dict))
                
                if friend:
                    friend_dict = {
                        'username': friend.username,
                        'email': friend.email,
                        'totalBattle': friend.totalBattle,
                        'winRate': friend.winRate,
                        'ranking': friend.ranking,
                        'winBattle': friend.winBattle,
                        'favourite': friend.favourite,
                        'streak': friend.streak,
                        'password': friend.password,
                        'friends': friend.friends,
                        'friendRequests': friend.friendRequests,
                        'avatar': friend.avatar,
                        'battles': friend.battles,
                        'invitations': friend.invitations
                    }
                    redis_email.set(friend.email, json.dumps(friend_dict))
                    redis_username.set(friend.username, json.dumps(friend_dict))
                
                return user_dict
            else:
                raise HTTPException(status_code=404, detail="Friend not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Update __all__ to include new functions
__all__ = ['friends_router', 'chat_router', 'router_friend', 'send_friend_request', 'cancel_friend_request', 'remove_friend']