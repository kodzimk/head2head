"""
Migration script to add new fields to debate_picks table
"""
import asyncio
from sqlalchemy import text
from init import get_db

async def migrate():
    """Add new fields to debate_picks table"""
    async for db in get_db():
        try:
            # Add new columns to debate_picks table
            await db.execute(text("""
                ALTER TABLE debate_picks 
                ADD COLUMN IF NOT EXISTS title VARCHAR NOT NULL DEFAULT 'Untitled Debate'
            """))
            
            await db.execute(text("""
                ALTER TABLE debate_picks 
                ADD COLUMN IF NOT EXISTS description TEXT
            """))
            
            await db.execute(text("""
                ALTER TABLE debate_picks 
                ADD COLUMN IF NOT EXISTS author_username VARCHAR NOT NULL DEFAULT 'anonymous'
            """))
            
            await db.execute(text("""
                ALTER TABLE debate_picks 
                ADD COLUMN IF NOT EXISTS author_display_name VARCHAR NOT NULL DEFAULT 'Anonymous User'
            """))
            
            await db.execute(text("""
                ALTER TABLE debate_picks 
                ADD COLUMN IF NOT EXISTS sport VARCHAR NOT NULL DEFAULT 'General'
            """))
            
            await db.execute(text("""
                ALTER TABLE debate_picks 
                ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'
            """))
            
            await db.execute(text("""
                ALTER TABLE debate_picks 
                ADD COLUMN IF NOT EXISTS total_votes INTEGER DEFAULT 0
            """))
            
            await db.execute(text("""
                ALTER TABLE debate_picks 
                ADD COLUMN IF NOT EXISTS total_comments INTEGER DEFAULT 0
            """))
            
            # Update total_votes and total_comments for existing records
            await db.execute(text("""
                UPDATE debate_picks 
                SET total_votes = option1_votes + option2_votes
                WHERE total_votes = 0
            """))
            
            await db.execute(text("""
                UPDATE debate_picks 
                SET total_comments = (
                    SELECT COUNT(*) 
                    FROM debate_comments 
                    WHERE debate_comments.pick_id = debate_picks.id
                )
                WHERE total_comments = 0
            """))
            
            await db.commit()
            print("Migration completed successfully!")
            
        except Exception as e:
            await db.rollback()
            print(f"Migration failed: {e}")
            raise
        finally:
            await db.close()

if __name__ == "__main__":
    asyncio.run(migrate()) 