from pydantic import EmailStr
from models import UserData, UserDataCreate
from init import SessionLocal, redis_email, redis_username
from .init import auth_router
import json
import bcrypt
from fastapi import APIRouter, HTTPException

auth_router = APIRouter()

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

async def user_exists(email: str) -> bool:
    user = redis_email.get(email)
    if user is None:
        return False
    return True

async def username_exists(username: str) -> bool:
    user = redis_username.get(username)
    if user is None:
        return False
    return True

@auth_router.post("/signup",name="signup")
async def create_user_data(user: UserDataCreate):
    async with SessionLocal() as db:
        if await username_exists(user.username):
            raise HTTPException(status_code=401, detail="Username already exists")
        
        if await user_exists(user.email):
            raise HTTPException(status_code=404, detail="Email already exists")
        
        hashed_password = hash_password(user.password)
        db_user = UserData(
                username=user.username,
                email=user.email,
                totalBattle=user.totalBattle,
                winRate=user.winRate,
                ranking=user.ranking,
                winBattle=user.winBattle,
                favourite=user.favourite,
                streak=user.streak,
                password=hashed_password,
                friends=[],
                friendRequests=[],
                avatar=user.avatar,
                battles=[],
                invitations=[]
            )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)

        user_dict = {
            'username': db_user.username,
            'email': db_user.email,
            'totalBattle': db_user.totalBattle,
            'winRate': db_user.winRate,
            'ranking': db_user.ranking,
            'winBattle': db_user.winBattle,
            'favourite': db_user.favourite,
            'streak': db_user.streak,
            'password': db_user.password,
            'friends': db_user.friends,
            'friendRequests': db_user.friendRequests,
            'avatar': db_user.avatar,
            'battles': db_user.battles,
            'invitations': db_user.invitations
        }
        redis_email.set(user.email, json.dumps(user_dict))
        redis_username.set(user.username, json.dumps(user_dict))
        return db_user
    
@auth_router.get("/signin",name="signin")
async def get_user_data(email: EmailStr,password: str):
        data = redis_email.get(email)
        if data is None:
            raise HTTPException(status_code=404, detail="User not found")
        
        data = json.loads(data)
        if not verify_password(password, data['password']):
            raise HTTPException(status_code=401, detail="Invalid password")
        
        redis_email.set(email, json.dumps(data))
        redis_username.set(data['username'], json.dumps(data))
        return data
    
@auth_router.get("/reset",name="reset-redis")
async def reset_data():
    for key in redis_email.scan_iter("*"):
        redis_email.delete(key)
    for key in redis_username.scan_iter("*"):
        redis_username.delete(key)
    return True





