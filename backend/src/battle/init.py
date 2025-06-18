from fastapi import APIRouter
from redis import Redis

battle_router = APIRouter()
redis_battle = Redis(host='localhost', port=6379, db=2)