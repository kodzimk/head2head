import os
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:Kais123@db:5432/user_db")