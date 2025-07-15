from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import joinedload
from models import User, Friendship, ChatMessage
from typing import List, Optional, Union
import uuid
import logging

logger = logging.getLogger(__name__)

class FriendService:
    @staticmethod
    async def add_friend(db: AsyncSession, current_user_id: uuid.UUID, friend_username: str) -> Optional[Friendship]:
        """
        Add a friend request
        """
        # Find the friend by username
        friend_query = await db.execute(select(User).filter(User.username == friend_username))
        friend = friend_query.scalar_one_or_none()
        
        if not friend or friend.id == current_user_id:
            return None
        
        # Check if friendship already exists
        existing_friendship_query = await db.execute(
            select(Friendship).filter(
                or_(
                    and_(Friendship.user_id == current_user_id, Friendship.friend_id == friend.id),
                    and_(Friendship.user_id == friend.id, Friendship.friend_id == current_user_id)
                )
            )
        )
        existing_friendship = existing_friendship_query.scalar_one_or_none()
        
        if existing_friendship:
            return existing_friendship
        
        # Create new friendship
        new_friendship = Friendship(
            user_id=current_user_id, 
            friend_id=friend.id, 
            status='pending'
        )
        db.add(new_friendship)
        await db.commit()
        await db.refresh(new_friendship)
        
        return new_friendship
    
    @staticmethod
    async def get_friends(db: AsyncSession, current_user_id: uuid.UUID) -> List[User]:
        """
        Get all accepted friends for a user
        """
        query = await db.execute(
            select(User)
            .join(Friendship, 
                  or_(
                      and_(Friendship.user_id == current_user_id, Friendship.friend_id == User.id),
                      and_(Friendship.friend_id == current_user_id, Friendship.user_id == User.id)
                  )
            )
            .filter(Friendship.status == 'accepted')
            .options(joinedload(User.friendships))
        )
        return query.scalars().unique().all()
    
    @staticmethod
    async def accept_friend_request(db: AsyncSession, current_user_id: uuid.UUID, requester_id: uuid.UUID) -> Optional[Friendship]:
        """
        Accept a friend request
        """
        friendship_query = await db.execute(
            select(Friendship).filter(
                and_(
                    Friendship.user_id == requester_id, 
                    Friendship.friend_id == current_user_id,
                    Friendship.status == 'pending'
                )
            )
        )
        friendship = friendship_query.scalar_one_or_none()
        
        if not friendship:
            return None
        
        friendship.status = 'accepted'
        await db.commit()
        await db.refresh(friendship)
        
        return friendship

class ChatService:
    @staticmethod
    async def send_message(
        db: AsyncSession, 
        sender_id: uuid.UUID, 
        receiver_id: Union[uuid.UUID, str], 
        content: str
    ) -> ChatMessage:
        """
        Send a chat message and store in database
        Supports both UUID and username for receiver
        """
        # Validate input
        if not content or len(content) > 1000:
            raise ValueError("Invalid message content")

        # Resolve receiver ID if it's a username
        if isinstance(receiver_id, str):
            # Validate username
            if not receiver_id or len(receiver_id) < 3:
                raise ValueError("Invalid receiver username")
            
            # Query user by username
            receiver_query = await db.execute(select(User).filter(User.username == receiver_id))
            receiver = receiver_query.scalar_one_or_none()
            
            if not receiver:
                raise ValueError(f"Receiver not found: {receiver_id}")
            
            # Use the user's UUID
            receiver_id = receiver.id

        # Validate sender and receiver UUIDs
        if not isinstance(sender_id, uuid.UUID) or not isinstance(receiver_id, uuid.UUID):
            raise ValueError("Invalid sender or receiver ID")

        # Create and store message
        chat_message = ChatMessage(
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=content,
            is_read=False,
            message_type='text'
        )
        
        db.add(chat_message)
        await db.commit()
        await db.refresh(chat_message)
        
        return chat_message
    
    @staticmethod
    async def get_chat_history(
        db: AsyncSession, 
        user_id: uuid.UUID, 
        friend_id: uuid.UUID, 
        limit: int = 50
    ) -> List[ChatMessage]:
        """
        Get chat history between two users
        Supports both UUID inputs
        """
        try:
            # Fetch messages between two users, ordered by most recent first
            query = await db.execute(
                select(ChatMessage)
                .filter(
                    or_(
                        and_(ChatMessage.sender_id == user_id, ChatMessage.receiver_id == friend_id),
                        and_(ChatMessage.sender_id == friend_id, ChatMessage.receiver_id == user_id)
                    )
                )
                .order_by(ChatMessage.timestamp.desc())
                .limit(limit)
            )
            
            messages = query.scalars().all()
            
            # Log retrieval details
            logger.info(f"Retrieved {len(messages)} messages for user {user_id} and friend {friend_id}")
            
            return messages
        
        except Exception as e:
            logger.error(f"Error retrieving chat history: {e}", exc_info=True)
            raise 