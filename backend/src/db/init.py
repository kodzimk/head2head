from fastapi import APIRouter
from redis import Redis

db_router = APIRouter()
redis = Redis(host='localhost', port=6379, db=0)

