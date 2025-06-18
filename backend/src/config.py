import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres123@localhost/user_db")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")