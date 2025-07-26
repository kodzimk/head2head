from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from db.init import get_async_db
from models import SimpleChatMessage, SimpleChatCreate, SimpleChatResponse
from typing import List, Dict, Any
import uuid
from datetime import datetime

simple_chat_router = APIRouter()

@simple_chat_router.post("/simple-chat/send", response_model=SimpleChatResponse)
async def send_message(
    message_data: SimpleChatCreate,
    db: AsyncSession = Depends(get_async_db)
):
    """Send a new chat message"""
    try:
        # Create new message
        new_message = SimpleChatMessage(
            id=str(uuid.uuid4()),
            sender_username=message_data.sender_username,
            receiver_username=message_data.receiver_username,
            message_content=message_data.message_content,
            message_type=message_data.message_type,
            sent_at=datetime.utcnow(),
            is_read=False
        )
        
        db.add(new_message)
        await db.commit()
        await db.refresh(new_message)
        
        return SimpleChatResponse(
            id=new_message.id,
            sender=new_message.sender_username,
            receiver=new_message.receiver_username,
            message=new_message.message_content,
            message_type=new_message.message_type,
            timestamp=int(new_message.sent_at.timestamp() * 1000),
            is_read=new_message.is_read
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

@simple_chat_router.get("/simple-chat/history", response_model=List[SimpleChatResponse])
async def get_chat_history(
    sender: str,
    receiver: str,
    db: AsyncSession = Depends(get_async_db)
):
    """Get chat history between two users"""
    try:
        # Create query
        query = select(SimpleChatMessage).where(
            (
                (SimpleChatMessage.sender_username == sender) & 
                (SimpleChatMessage.receiver_username == receiver)
            ) | (
                (SimpleChatMessage.sender_username == receiver) & 
                (SimpleChatMessage.receiver_username == sender)
            )
        ).order_by(SimpleChatMessage.sent_at)
        
        # Execute query
        result = await db.execute(query)
        messages = result.scalars().all()
        
        return [
            SimpleChatResponse(
                id=msg.id,
                sender=msg.sender_username,
                receiver=msg.receiver_username,
                message=msg.message_content,
                message_type=msg.message_type,
                timestamp=int(msg.sent_at.timestamp() * 1000),
                is_read=msg.is_read
            )
            for msg in messages
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chat history: {str(e)}")

@simple_chat_router.get("/chat-preview")
async def get_chat_preview(
    username: str,
    friendUsername: str,
    db: AsyncSession = Depends(get_async_db)
):
    """Get chat preview (last message and unread count) between two users"""
    try:
        # Get last message between users
        last_message_query = select(SimpleChatMessage).where(
            (
                (SimpleChatMessage.sender_username == username) & 
                (SimpleChatMessage.receiver_username == friendUsername)
            ) | (
                (SimpleChatMessage.sender_username == friendUsername) & 
                (SimpleChatMessage.receiver_username == username)
            )
        ).order_by(SimpleChatMessage.sent_at.desc()).limit(1)
        
        result = await db.execute(last_message_query)
        last_message = result.scalar_one_or_none()
        
        # Get unread count (messages sent to this user that are unread)
        unread_count_query = select(func.count(SimpleChatMessage.id)).where(
            (SimpleChatMessage.sender_username == friendUsername) &
            (SimpleChatMessage.receiver_username == username) &
            (SimpleChatMessage.is_read == False)
        )
        
        result = await db.execute(unread_count_query)
        unread_count = result.scalar() or 0
        
        last_message_data = None
        if last_message:
            last_message_data = {
                "id": last_message.id,
                "sender": last_message.sender_username,
                "receiver": last_message.receiver_username,
                "message": last_message.message_content,
                "timestamp": last_message.sent_at.isoformat(),
                "is_read": last_message.is_read,
                "message_type": last_message.message_type
            }
        
        return {
            "lastMessage": last_message_data,
            "unreadCount": unread_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chat preview: {str(e)}")

@simple_chat_router.post("/simple-chat/mark-read")
async def mark_messages_read(
    sender: str,
    receiver: str,
    db: AsyncSession = Depends(get_async_db)
):
    """Mark messages as read"""
    try:
        query = update(SimpleChatMessage).where(
            (SimpleChatMessage.sender_username == sender) &
            (SimpleChatMessage.receiver_username == receiver) &
            (SimpleChatMessage.is_read == False)
        ).values(is_read=True)
        
        await db.execute(query)
        await db.commit()
        return {"status": "success", "message": "Messages marked as read"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to mark messages as read: {str(e)}")

@simple_chat_router.get("/simple-chat/unread-count")
async def get_unread_count(
    receiver: str,
    db: AsyncSession = Depends(get_async_db)
):
    """Get unread message count for a user"""
    try:
        query = select(func.count(SimpleChatMessage.id)).where(
            (SimpleChatMessage.receiver_username == receiver) &
            (SimpleChatMessage.is_read == False)
        )
        
        result = await db.execute(query)
        count = result.scalar() or 0
        
        return {"unread_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get unread count: {str(e)}") 