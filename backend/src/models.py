from sqlalchemy import Column, Integer, String, ARRAY
from pydantic import BaseModel, EmailStr
from init import Base

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