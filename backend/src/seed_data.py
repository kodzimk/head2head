import asyncio
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from init import SessionLocal
from models import DebatePick

async def seed_debate_picks():
    """Seed the database with debate picks for every sport available in the website"""
    async with SessionLocal() as db:
        # Comprehensive debate picks for all available sports
        sample_picks = [
            # Football (Soccer)
            {
                "id": str(uuid.uuid4()),
                "category": "football",
                "option1_name": "Lionel Messi",
                "option1_image": "https://placehold.co/400x400/000000/FFFFFF?text=Messi",
                "option1_description": "Argentine professional footballer, widely regarded as one of the greatest players of all time. Winner of 8 Ballon d'Or awards.",
                "option1_votes": 1247,
                "option2_name": "Cristiano Ronaldo",
                "option2_image": "https://placehold.co/400x400/333333/FFFFFF?text=Ronaldo",
                "option2_description": "Portuguese professional footballer, known for his incredible athleticism and goal-scoring ability. 5-time Ballon d'Or winner.",
                "option2_votes": 1156,
                "created_at": datetime.utcnow(),
                "is_active": True
            },
            
            # Basketball
            {
                "id": str(uuid.uuid4()),
                "category": "basketball",
                "option1_name": "Michael Jordan",
                "option1_image": "https://placehold.co/400x400/777777/FFFFFF?text=Jordan",
                "option1_description": "Former American professional basketball player, six-time NBA champion and cultural icon. Widely considered the GOAT.",
                "option1_votes": 892,
                "option2_name": "LeBron James",
                "option2_image": "https://placehold.co/400x400/555555/FFFFFF?text=LeBron",
                "option2_description": "American professional basketball player, four-time NBA champion. Known for his longevity and all-around excellence.",
                "option2_votes": 1034,
                "created_at": datetime.utcnow(),
                "is_active": True
            },
            
            # Tennis
            {
                "id": str(uuid.uuid4()),
                "category": "tennis",
                "option1_name": "Serena Williams",
                "option1_image": "https://placehold.co/400x400/F59E0B/FFFFFF?text=Serena",
                "option1_description": "American professional tennis player, 23-time Grand Slam singles champion. Dominated women's tennis for over a decade.",
                "option1_votes": 567,
                "option2_name": "Steffi Graf",
                "option2_image": "https://placehold.co/400x400/EF4444/FFFFFF?text=Graf",
                "option2_description": "German former professional tennis player, 22-time Grand Slam champion. Only player to achieve the Golden Slam.",
                "option2_votes": 423,
                "created_at": datetime.utcnow(),
                "is_active": True
            },
            
            # Baseball
            {
                "id": str(uuid.uuid4()),
                "category": "baseball",
                "option1_name": "Babe Ruth",
                "option1_image": "https://placehold.co/400x400/3B82F6/FFFFFF?text=Ruth",
                "option1_description": "American professional baseball player, legendary home run hitter. Transformed baseball from dead-ball era to live-ball era.",
                "option1_votes": 789,
                "option2_name": "Barry Bonds",
                "option2_image": "https://placehold.co/400x400/DC2626/FFFFFF?text=Bonds",
                "option2_description": "American former professional baseball player, all-time home run leader with 762 career home runs.",
                "option2_votes": 654,
                "created_at": datetime.utcnow(),
                "is_active": True
            },
            
            # Hockey
            {
                "id": str(uuid.uuid4()),
                "category": "hockey",
                "option1_name": "Wayne Gretzky",
                "option1_image": "https://placehold.co/400x400/059669/FFFFFF?text=Gretzky",
                "option1_description": "Canadian former professional ice hockey player, known as 'The Great One'. Holds numerous NHL records.",
                "option1_votes": 1123,
                "option2_name": "Gordie Howe",
                "option2_image": "https://placehold.co/400x400/7C3AED/FFFFFF?text=Howe",
                "option2_description": "Canadian professional ice hockey player, known as 'Mr. Hockey'. Played professionally for 32 years.",
                "option2_votes": 987,
                "created_at": datetime.utcnow(),
                "is_active": True
            },
            
            # Golf
            {
                "id": str(uuid.uuid4()),
                "category": "golf",
                "option1_name": "Tiger Woods",
                "option1_image": "https://placehold.co/400x400/10B981/FFFFFF?text=Tiger",
                "option1_description": "American professional golfer, 15-time major champion. Dominated golf in the 2000s and one of the greatest athletes ever.",
                "option1_votes": 945,
                "option2_name": "Jack Nicklaus",
                "option2_image": "https://placehold.co/400x400/8B5CF6/FFFFFF?text=Jack",
                "option2_description": "American retired professional golfer, 18-time major champion. Known as 'The Golden Bear' and considered the greatest golfer.",
                "option2_votes": 876,
                "created_at": datetime.utcnow(),
                "is_active": True
            },
            
            # Cricket
            {
                "id": str(uuid.uuid4()),
                "category": "cricket",
                "option1_name": "Sachin Tendulkar",
                "option1_image": "https://placehold.co/400x400/F59E0B/FFFFFF?text=Sachin",
                "option1_description": "Indian former international cricketer, widely regarded as one of the greatest batsmen. Scored 100 international centuries.",
                "option1_votes": 1456,
                "option2_name": "Don Bradman",
                "option2_image": "https://placehold.co/400x400/EF4444/FFFFFF?text=Bradman",
                "option2_description": "Australian international cricketer, widely acknowledged as the greatest batsman of all time. Career average of 99.94.",
                "option2_votes": 1234,
                "created_at": datetime.utcnow(),
                "is_active": True
            },
            
            # Volleyball
            {
                "id": str(uuid.uuid4()),
                "category": "volleyball",
                "option1_name": "Karch Kiraly",
                "option1_image": "https://placehold.co/400x400/3B82F6/FFFFFF?text=Karch",
                "option1_description": "American volleyball player and coach, only player to win Olympic gold in both indoor and beach volleyball.",
                "option1_votes": 567,
                "option2_name": "Giba",
                "option2_image": "https://placehold.co/400x400/DC2626/FFFFFF?text=Giba",
                "option2_description": "Brazilian former volleyball player, three-time Olympic medalist and World Championship winner.",
                "option2_votes": 489,
                "created_at": datetime.utcnow(),
                "is_active": True
            },
            
            # Rugby
            {
                "id": str(uuid.uuid4()),
                "category": "rugby",
                "option1_name": "Jonah Lomu",
                "option1_image": "https://placehold.co/400x400/059669/FFFFFF?text=Lomu",
                "option1_description": "New Zealand rugby union player, widely regarded as the first global superstar of rugby. Dominated the 1995 World Cup.",
                "option1_votes": 678,
                "option2_name": "Richie McCaw",
                "option2_image": "https://placehold.co/400x400/7C3AED/FFFFFF?text=McCaw",
                "option2_description": "New Zealand former rugby union player, two-time World Cup winning captain. Most capped All Black of all time.",
                "option2_votes": 612,
                "created_at": datetime.utcnow(),
                "is_active": True
            },
            
            # Boxing (mentioned in training sports)
            {
                "id": str(uuid.uuid4()),
                "category": "boxing",
                "option1_name": "Muhammad Ali",
                "option1_image": "https://placehold.co/400x400/000000/FFFFFF?text=Ali",
                "option1_description": "American professional boxer, three-time heavyweight champion. Known as 'The Greatest' and cultural icon.",
                "option1_votes": 1345,
                "option2_name": "Mike Tyson",
                "option2_image": "https://placehold.co/400x400/333333/FFFFFF?text=Tyson",
                "option2_description": "American former professional boxer, youngest heavyweight champion in history. Known for his ferocious power.",
                "option2_votes": 1098,
                "created_at": datetime.utcnow(),
                "is_active": True
            }
        ]

        # Check if any picks already exist to avoid duplicates
        from sqlalchemy import select
        existing_picks = await db.execute(select(DebatePick))
        existing_count = len(existing_picks.scalars().all())
        
        if existing_count > 0:
            print(f"Database already contains {existing_count} debate picks. Skipping seed to avoid duplicates.")
            return

        # Add picks to database
        for pick_data in sample_picks:
            db_pick = DebatePick(**pick_data)
            db.add(db_pick)

        await db.commit()
        print(f"Successfully seeded {len(sample_picks)} debate picks for all available sports!")
        
        # Print summary by category
        categories = {}
        for pick in sample_picks:
            category = pick["category"]
            if category not in categories:
                categories[category] = 0
            categories[category] += 1
        
        print("\nDebates created by sport:")
        for category, count in categories.items():
            print(f"  {category.capitalize()}: {count} debate(s)")

if __name__ == "__main__":
    asyncio.run(seed_debate_picks()) 