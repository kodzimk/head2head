from redis import Redis
from fastapi import APIRouter
from urllib.parse import urlparse
from config import REDIS_URL

battle_router = APIRouter()

# Parse Redis URL
redis_url = urlparse(REDIS_URL)
redis_host = redis_url.hostname or 'localhost'
redis_port = redis_url.port or 6379

# Create Redis connection for battles
redis_battle = Redis(host=redis_host, port=redis_port, db=2)