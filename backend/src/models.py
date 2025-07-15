import uuid
from sqlalchemy import Column, Integer, String, ARRAY, DateTime, Boolean, Text, ForeignKey, JSON, UUID, or_
from sqlalchemy.orm import relationship
from pydantic import BaseModel, EmailStr, UUID4, Field
from init import Base
from datetime import datetime
from typing import List, Optional, ForwardRef
from sqlalchemy.sql import func

class UserData(Base):
    __tablename__ = "user_data"
    username = Column(String,  index=True,nullable=False)
    email = Column(String,primary_key=True,index=True,nullable=False)
    winRate = Column(Integer, index=True,nullable=False)
    totalBattle = Column(Integer, index=True,nullable=False)
    winBattle = Column(Integer, index=True,nullable=False)
    ranking = Column(Integer, index=True,nullable=False)
    favourite = Column(String, index=True,nullable=False)
    streak = Column(Integer, index=True,nullable=False)
    password = Column(String, index=True,nullable=False)
    friends = Column(ARRAY(String), index=True,nullable=True)
    friendRequests = Column(ARRAY(String), index=True,nullable=True)
    avatar = Column(String, nullable=True)  
    battles = Column(ARRAY(String), index=True,nullable=True)
    invitations = Column(ARRAY(String), index=True,nullable=True)

class UserDataCreate(BaseModel):
    username: str
    email: EmailStr
    totalBattle: int
    winRate: int
    ranking: int
    favourite:str
    winBattle: int
    streak: int
    password: str
    friends: list[str]
    friendRequests: list[str]
    avatar: str | None = None  
    battles: list[str]
    invitations: list[str]

class BattleModel(Base):
    __tablename__ = "battles"
    id = Column(String, primary_key=True, index=True)
    sport = Column(String, index=True)
    level = Column(String, index=True)
    first_opponent = Column(String, index=True)
    second_opponent = Column(String, index=True)
    first_opponent_score = Column(Integer, index=True)
    second_opponent_score = Column(Integer, index=True)

    def to_json(self):
        return {
            "id": self.id,
            "sport": self.sport,
            "level": self.level,
            "first_opponent": self.first_opponent,
            "second_opponent": self.second_opponent,
            "first_opponent_score": self.first_opponent_score,
            "second_opponent_score": self.second_opponent_score
        }

class UserAnswer(Base):
    __tablename__ = "user_answers"
    id = Column(String, primary_key=True, index=True)
    username = Column(String, index=True, nullable=False)
    battle_id = Column(String, index=True, nullable=False)
    question_text = Column(Text, nullable=False)
    user_answer = Column(String, nullable=False)
    correct_answer = Column(String, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    sport = Column(String, index=True, nullable=False)
    level = Column(String, index=True, nullable=False)
    question_index = Column(Integer, nullable=False)
    answered_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class TrainingSession(Base):
    __tablename__ = "training_sessions"
    id = Column(String, primary_key=True, index=True)
    username = Column(String, index=True, nullable=False)
    session_type = Column(String, nullable=False)  # "incorrect_answers", "mixed", etc.
    sport = Column(String, index=True, nullable=True)
    level = Column(String, index=True, nullable=True)
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

class TrainingAnswer(Base):
    __tablename__ = "training_answers"
    id = Column(String, primary_key=True, index=True)
    training_session_id = Column(String, index=True, nullable=False)
    username = Column(String, index=True, nullable=False)
    question_text = Column(Text, nullable=False)
    user_answer = Column(String, nullable=False)
    correct_answer = Column(String, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    sport = Column(String, index=True, nullable=False)
    level = Column(String, index=True, nullable=False)
    answered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    original_answer_id = Column(String, index=True, nullable=True)  # Reference to original incorrect answer

class DebatePick(Base):
    __tablename__ = "debate_picks"
    
    id = Column(String, primary_key=True, index=True)
    category = Column(String, index=True, nullable=False)
    option1_name = Column(String, nullable=False, index=True)
    option1_image = Column(String, nullable=True)
    option1_description = Column(Text, nullable=True)
    option1_votes = Column(Integer, default=0)
    option2_name = Column(String, nullable=False, index=True)
    option2_image = Column(String, nullable=True)
    option2_description = Column(Text, nullable=True)
    option2_votes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    comments = relationship("DebateComment", back_populates="pick", cascade="all, delete-orphan")

class DebateComment(Base):
    __tablename__ = "debate_comments"
    
    id = Column(String, primary_key=True, index=True)
    pick_id = Column(String, ForeignKey("debate_picks.id"), nullable=False)
    parent_id = Column(String, ForeignKey("debate_comments.id"), nullable=True)  # For replies
    author_id = Column(String, nullable=False)  # username
    author_name = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    pick = relationship("DebatePick", back_populates="comments")
    likes = relationship("CommentLike", back_populates="comment", cascade="all, delete-orphan")
    replies = relationship("DebateComment", back_populates="parent", remote_side=[id])
    parent = relationship("DebateComment", back_populates="replies")

class DebateVote(Base):
    __tablename__ = "debate_votes"
    
    id = Column(String, primary_key=True, index=True)
    pick_id = Column(String, ForeignKey("debate_picks.id"), nullable=False)
    user_id = Column(String, nullable=False)  # username
    vote_option = Column(String, nullable=False)  # "option1" or "option2"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    pick = relationship("DebatePick")

class CommentLike(Base):
    __tablename__ = "comment_likes"
    
    id = Column(String, primary_key=True, index=True)
    comment_id = Column(String, ForeignKey("debate_comments.id"), nullable=False)
    user_id = Column(String, nullable=False)  # username
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    comment = relationship("DebateComment", back_populates="likes")



# Pydantic models for API
class DebatePickCreate(BaseModel):
    option1_name: str
    option1_description: Optional[str] = None
    option2_name: str
    option2_description: Optional[str] = None
    category: str

class DebatePickResponse(BaseModel):
    id: str
    category: str
    option1_name: str
    option1_image: Optional[str]
    option1_description: Optional[str]
    option1_votes: int
    option2_name: str
    option2_image: Optional[str]
    option2_description: Optional[str]
    option2_votes: int
    created_at: datetime
    is_active: bool

class DebateCommentCreate(BaseModel):
    content: str
    parent_id: Optional[str] = None  # For replies

class DebateCommentResponse(BaseModel):
    id: str
    pick_id: str
    parent_id: Optional[str] = None
    author_id: str
    author_name: str
    content: str
    created_at: datetime
    likes_count: int
    user_liked: bool = False
    replies_count: int = 0
    replies: List['DebateCommentResponse'] = []

class CommentLikeCreate(BaseModel):
    comment_id: str

class CommentLikeResponse(BaseModel):
    id: str
    comment_id: str
    user_id: str
    created_at: datetime

class DebateVoteCreate(BaseModel):
    vote_option: str  # "option1" or "option2"

class DebateVoteResponse(BaseModel):
    id: str
    pick_id: str
    user_id: str
    vote_option: str
    created_at: datetime

class DebatePickWithVoteResponse(BaseModel):
    id: str
    category: str
    option1_name: str
    option1_image: Optional[str]
    option1_description: Optional[str]
    option1_votes: int
    option2_name: str
    option2_image: Optional[str]
    option2_description: Optional[str]
    option2_votes: int
    created_at: datetime
    is_active: bool
    user_vote: Optional[str] = None  # "option1", "option2", or None



# Update forward references
DebateCommentResponse.model_rebuild()

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    avatar = Column(String(255), nullable=True)
    online_status = Column(Boolean, default=False)
    last_seen = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    sent_messages = relationship("ChatMessage", foreign_keys="[ChatMessage.sender_id]", back_populates="sender")
    received_messages = relationship("ChatMessage", foreign_keys="[ChatMessage.receiver_id]", back_populates="receiver")
    friendships = relationship("Friendship", 
        primaryjoin="or_(User.id == Friendship.user_id, User.id == Friendship.friend_id)", 
        foreign_keys="[Friendship.user_id, Friendship.friend_id]", 
        back_populates="user")

class Friendship(Base):
    __tablename__ = "friendships"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    friend_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    status = Column(String(20), default='pending')  # pending, accepted, blocked
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="friendships")
    friend = relationship("User", foreign_keys=[friend_id])

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    receiver_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    is_read = Column(Boolean, default=False)
    message_type = Column(String(20), default='text')  # text, emoji, reaction
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")

class UserBase(BaseModel):
    id: UUID4
    username: str
    email: EmailStr
    avatar: Optional[str] = None
    online_status: bool = False
    last_seen: Optional[datetime] = None

class FriendshipCreate(BaseModel):
    friend_id: UUID4

class FriendshipResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    friend_id: UUID4
    status: str
    created_at: datetime

class ChatMessageCreate(BaseModel):
    receiver_id: UUID4
    content: str
    message_type: str = 'text'

class ChatMessageResponse(BaseModel):
    id: UUID4
    sender_id: UUID4
    receiver_id: UUID4
    content: str
    timestamp: datetime
    is_read: bool
    message_type: str

class FriendResponse(UserBase):
    friendship_status: Optional[str] = None
    last_message: Optional[ChatMessageResponse] = None