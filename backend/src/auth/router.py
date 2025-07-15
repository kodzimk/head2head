from pydantic import EmailStr
from models import UserData, UserDataCreate
from init import SessionLocal, redis_email, redis_username
from .init import auth_router
import json
import bcrypt
from fastapi import APIRouter, HTTPException, Depends, status
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from datetime import timedelta, datetime
import jwt
from sqlalchemy import select, func

auth_router = APIRouter()

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def is_google_user(password: str) -> bool:
    """Check if the password looks like a Google credential (JWT token)"""
    # Google credentials are typically long JWT tokens
    return len(password) > 100 and '.' in password

def verify_google_password(google_credential: str, stored_credential: str) -> bool:
    """Verify Google credential by comparing the raw tokens"""
    # For Google users, we compare the raw credentials
    return google_credential == stored_credential

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

async def calculate_initial_ranking() -> int:
    """Calculate the initial ranking for a new user based on existing users"""
    try:
        async with SessionLocal() as db:
            # Get the total number of users
            stmt = select(func.count(UserData.username))
            result = await db.execute(stmt)
            total_users = result.scalar()
            
            # New users start at the bottom of the ranking
            # If no users exist, start at rank 1
            initial_rank = total_users + 1 if total_users > 0 else 1
            
            return initial_rank
    except Exception as e:
        # Fallback to rank 1 if there's an error
        return 1

SECRET_KEY = """MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEAqCWwNCUir+tatvRa
O0R3VOk9kTq5KY35NmKmlE3Dq280IdHtB87b+clPvs7/QyZHFE9DhQMAUWUOx+0T
zoKsywIDAQABAkAuWAzjomSYFgcvq9N+yFUXix2T/JpyMJZCfhgpgfFvO0mPSdJ8
mXrKwyo5LPf0Ha8ckRvwZyS2MSMmD8D8lNfRAiEA3IjBDjjICXgV7TfesU4MnIYW
X2t3L+SFnCDzU+qcUAMCIQDDMDKBUfQqYzrulxtfjwF/qmiPfwVbXm7es5OQdsJJ
mQIhAJRdRFQHCzyjl0zB+4WZFo7u/novWD3WJbUFze20tnh1AiEAnqjW5PfRGYN/
q+F4hryf4z6Jr9r4Z8TjKnOeR5fBZkECH2tlOpeGdcfA8qouEtD2njNo4P63Ibmu
mffGKz34haM="""
ALGORITHM = "HS256"

bcrypto_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

class Token(BaseModel):
    access_token: str
    token_type: str

class UserRequest(BaseModel):
    password: str
    email: EmailStr

class TokenRequest(BaseModel):
    token: str


def create_access_token(data: str, expires_delta: timedelta):
    to_encode = data.copy() if isinstance(data, dict) else {"sub": data}
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@auth_router.post("/decode-token")
async def decode_token(token_request: TokenRequest):
    payload = decode_access_token(token_request.token)
    return {
        "email": payload.get("sub"),
        "expires": payload.get("exp"),
        "issued_at": payload.get("iat"),
        "full_payload": payload
    }

@auth_router.get("/username-user",name="username-user")
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
        
        # Calculate initial ranking for the new user
        initial_ranking = await calculate_initial_ranking()
        
        # Check if this is a Google user and handle password accordingly
        if is_google_user(user.password):
            # For Google users, store the credential as-is (don't hash)
            stored_password = user.password
        else:
            # For regular users, hash the password
            stored_password = hash_password(user.password)
        
        db_user = UserData(
                username= user.username.strip(),
                email=user.email,
                totalBattle=user.totalBattle,
                winRate=user.winRate,
                ranking=initial_ranking,  # Use calculated initial ranking
                winBattle=user.winBattle,
                favourite=user.favourite,
                streak=user.streak,
                password=stored_password,
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
        
        token = create_access_token(db_user.email, timedelta(minutes=1440))
        return {"access_token": token, "token_type": "bearer","user":user_dict}
    
@auth_router.post("/signin",name="signin")
async def get_user_data(user: UserRequest):
        data = redis_email.get(user.email)
        if data is None:
            raise HTTPException(status_code=404, detail="User not found")
        
        data = json.loads(data)
        
        # If this is a Google user, just allow sign-in if email exists
        if is_google_user(user.password):
            pass  # allow sign-in if email exists
        else:
            if not verify_password(user.password, data['password']):
                raise HTTPException(status_code=401, detail="Invalid password")
        
        redis_email.set(user.email, json.dumps(data))
        redis_username.set(data['username'], json.dumps(data))
        
        token = create_access_token(user.email, timedelta(minutes=1440))
        return {"access_token": token, "token_type": "bearer", "user": data}
    
@auth_router.get("/reset",name="reset-redis")
async def reset_data():
    for key in redis_email.scan_iter("*"):
        redis_email.delete(key)
    for key in redis_username.scan_iter("*"):
        redis_username.delete(key)
    return True

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        # Decode the token
        payload = decode_access_token(token)
        
        # Extract email from the token
        email = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Retrieve user from Redis
        user_data = redis_email.get(email)
        if user_data is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Parse user data
        user_dict = json.loads(user_data)
        return UserData(**user_dict)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )





