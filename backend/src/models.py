from sqlalchemy import Column, Integer, String, ARRAY, DateTime, Boolean, Text
from pydantic import BaseModel, EmailStr
from init import Base
from datetime import datetime

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