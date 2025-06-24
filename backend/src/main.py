import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    conn = await asyncpg.connect(
        user="kaisar@head2head-server",
        password="yourpassword",
        database="postgres",
        host="head2head-server.postgres.database.azure.com",
        port=5432,
        ssl=True  # ✅ Use ssl=True here
    )
    row = await conn.fetchrow("SELECT version();")
    print("✅ Connected to:", row[0])
    await conn.close()

asyncio.run(main())