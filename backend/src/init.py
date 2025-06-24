import os
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Create async engine
engine = create_async_engine(DATABASE_URL, echo=True)

# Test connection
async def test_connection():
    async with engine.connect() as conn:
        result = await conn.execute("SELECT version();")
        row = result.fetchone()
        print("✅ Connected to:", row[0])

# Run test
import asyncio
asyncio.run(test_connection())
