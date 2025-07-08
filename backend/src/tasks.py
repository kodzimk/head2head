import os
import json
import time
import random
from celery import current_task
from celery_app import celery_app
from init import SessionLocal
from models import BattleModel
from sqlalchemy import select
import logging
from ai_quiz_generator import ai_quiz_generator
from celery import Celery
from celery.schedules import crontab
import asyncio
import uuid
from datetime import datetime
from sqlalchemy import select, func, and_, update, delete
from models import DebatePick, DebateComment

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Question generation configuration
QUESTION_COUNT = int(os.getenv("QUESTION_COUNT", 7))
QUESTION_TIME_LIMIT = 30

@celery_app.task(bind=True)
def generate_ai_quiz(self, battle_id: str, sport: str, level: str, question_count: int = QUESTION_COUNT):
    """
    Generate AI-powered quiz questions for a battle as a background task
    """
    try:
        # Update task status
        self.update_state(
            state='PROGRESS',
            meta={'current': 0, 'total': 100, 'status': 'Initializing AI question generation...'}
        )
        
        # Generate questions using AI
        questions = ai_quiz_generator.generate_questions(sport, level, question_count, battle_id)
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'current': 50, 'total': 100, 'status': 'Saving questions to cache...'}
        )
        
        # Save questions to cache
        save_questions_to_battle(battle_id, questions)
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'current': 100, 'total': 100, 'status': 'AI quiz generation completed'}
        )
        
        return {
            'status': 'success',
            'battle_id': battle_id,
            'questions_count': len(questions),
            'sport': sport,
            'level': level,
            'generation_method': 'ai'
        }
        
    except Exception as e:
        logger.error(f"Error generating AI quiz for battle {battle_id}: {str(e)}")
        self.update_state(
            state='FAILURE',
            meta={'error': str(e)}
        )
        raise

def save_questions_to_battle(battle_id: str, questions: list):
    """
    Save questions to Redis cache for a battle
    """
    try:
        import redis
        redis_client = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))
        questions_key = f"battle_questions:{battle_id}"
        
        # Save questions to Redis with expiration (1 hour)
        redis_client.setex(questions_key, 3600, json.dumps(questions))
        
        logger.info(f"Successfully saved {len(questions)} questions to cache for battle {battle_id}")
        
    except Exception as e:
        logger.error(f"Error saving questions to cache for battle {battle_id}: {str(e)}")
        raise

def queue_quiz_generation_task(battle_id, sport, level, question_count):
    """
    Queue AI quiz generation task
    """
    task = generate_ai_quiz.delay(battle_id, sport, level, question_count)
    logger.info(f"Queued AI quiz generation task for battle {battle_id}")
    return task 

@celery_app.task
def create_daily_debates():
    """Create new debates every day at midnight UTC"""
    asyncio.run(create_daily_debates_async())

async def create_daily_debates_async():
    """Async function to create daily debates"""
    async with SessionLocal() as db:
        # Check if any picks already exist for today
        today = datetime.utcnow().date()
        
        existing_picks = await db.execute(
            select(DebatePick).where(
                and_(
                    func.date(DebatePick.created_at) == today,
                    DebatePick.is_active == True
                )
            )
        )
        existing_count = len(existing_picks.scalars().all())
        
        if existing_count > 0:
            print(f"Daily debates already exist for {today}. Found {existing_count} active debates.")
            return
        
        # Reset all engagement data for fresh start
        from sqlalchemy import delete
        
        # Delete all comments
        await db.execute(delete(DebateComment))
        
        # Deactivate all previous debates and reset their vote counts
        await db.execute(
            update(DebatePick).values(
                is_active=False,
                total_votes=0,
                total_comments=0
            )
        )
        
        # Daily debate pools for each sport
        debate_pools = {
            "football": [
                {
                    "option1_name": "Lionel Messi",
                    "option1_description": "Argentine professional footballer, widely regarded as one of the greatest players of all time. Winner of 8 Ballon d'Or awards.",
                    "option2_name": "Cristiano Ronaldo",
                    "option2_description": "Portuguese professional footballer, known for his incredible athleticism and goal-scoring ability. 5-time Ballon d'Or winner.",
                },
                {
                    "option1_name": "Pelé",
                    "option1_description": "Brazilian football legend, three-time World Cup winner and cultural icon. Scored over 1000 career goals.",
                    "option2_name": "Diego Maradona",
                    "option2_description": "Argentine football legend, known for his incredible skill and the famous 'Hand of God' goal in 1986 World Cup.",
                },
                {
                    "option1_name": "Kylian Mbappé",
                    "option1_description": "French professional footballer, World Cup winner and one of the fastest players in the world.",
                    "option2_name": "Erling Haaland",
                    "option2_description": "Norwegian professional footballer, known for his incredible goal-scoring record and physical presence.",
                }
            ],
            "basketball": [
                {
                    "option1_name": "Michael Jordan",
                    "option1_description": "Former American professional basketball player, six-time NBA champion and cultural icon. Widely considered the GOAT.",
                    "option2_name": "LeBron James",
                    "option2_description": "American professional basketball player, four-time NBA champion. Known for his longevity and all-around excellence.",
                },
                {
                    "option1_name": "Kobe Bryant",
                    "option1_description": "Late American professional basketball player, five-time NBA champion known for his incredible work ethic and 'Mamba Mentality'.",
                    "option2_name": "Stephen Curry",
                    "option2_description": "American professional basketball player, four-time NBA champion and revolutionary three-point shooter.",
                },
                {
                    "option1_name": "Magic Johnson",
                    "option1_description": "Former American professional basketball player, five-time NBA champion and legendary point guard.",
                    "option2_name": "Larry Bird",
                    "option2_description": "Former American professional basketball player, three-time NBA champion and one of the greatest shooters ever.",
                }
            ],
            "tennis": [
                {
                    "option1_name": "Serena Williams",
                    "option1_description": "American professional tennis player, 23-time Grand Slam singles champion. Dominated women's tennis for over a decade.",
                    "option2_name": "Steffi Graf",
                    "option2_description": "German former professional tennis player, 22-time Grand Slam champion. Only player to achieve the Golden Slam.",
                },
                {
                    "option1_name": "Roger Federer",
                    "option1_description": "Swiss former professional tennis player, 20-time Grand Slam champion known for his elegant playing style.",
                    "option2_name": "Rafael Nadal",
                    "option2_description": "Spanish professional tennis player, 22-time Grand Slam champion and 'King of Clay' at Roland Garros.",
                },
                {
                    "option1_name": "Novak Djokovic",
                    "option1_description": "Serbian professional tennis player, 24-time Grand Slam champion and former world No. 1.",
                    "option2_name": "Andy Murray",
                    "option2_description": "British former professional tennis player, three-time Grand Slam champion and Olympic gold medalist.",
                }
            ],
            "baseball": [
                {
                    "option1_name": "Babe Ruth",
                    "option1_description": "American professional baseball player, legendary home run hitter. Transformed baseball from dead-ball era to live-ball era.",
                    "option2_name": "Barry Bonds",
                    "option2_description": "American former professional baseball player, all-time home run leader with 762 career home runs.",
                },
                {
                    "option1_name": "Mickey Mantle",
                    "option1_description": "American professional baseball player, seven-time World Series champion known for his incredible power from both sides of the plate.",
                    "option2_name": "Willie Mays",
                    "option2_description": "American former professional baseball player, known as the 'Say Hey Kid' and considered one of the greatest all-around players.",
                },
                {
                    "option1_name": "Derek Jeter",
                    "option1_description": "American former professional baseball player, five-time World Series champion and Yankees legend.",
                    "option2_name": "Ken Griffey Jr.",
                    "option2_description": "American former professional baseball player, known for his smooth swing and incredible defensive skills.",
                }
            ],
            "hockey": [
                {
                    "option1_name": "Wayne Gretzky",
                    "option1_description": "Canadian former professional ice hockey player, known as 'The Great One'. Holds numerous NHL records.",
                    "option2_name": "Gordie Howe",
                    "option2_description": "Canadian professional ice hockey player, known as 'Mr. Hockey'. Played professionally for 32 years.",
                },
                {
                    "option1_name": "Mario Lemieux",
                    "option1_description": "Canadian former professional ice hockey player, two-time Stanley Cup champion and Pittsburgh Penguins legend.",
                    "option2_name": "Maurice Richard",
                    "option2_description": "Canadian professional ice hockey player, known as 'Rocket Richard' and first player to score 50 goals in 50 games.",
                },
                {
                    "option1_name": "Connor McDavid",
                    "option1_description": "Canadian professional ice hockey player, current NHL superstar and multiple Hart Trophy winner.",
                    "option2_name": "Sidney Crosby",
                    "option2_description": "Canadian professional ice hockey player, three-time Stanley Cup champion and Pittsburgh Penguins captain.",
                }
            ],
            "golf": [
                {
                    "option1_name": "Tiger Woods",
                    "option1_description": "American professional golfer, 15-time major champion. Dominated golf in the 2000s and one of the greatest athletes ever.",
                    "option2_name": "Jack Nicklaus",
                    "option2_description": "American retired professional golfer, 18-time major champion. Known as 'The Golden Bear' and considered the greatest golfer.",
                },
                {
                    "option1_name": "Arnold Palmer",
                    "option1_description": "American professional golfer, seven-time major champion and charismatic 'The King' of golf.",
                    "option2_name": "Gary Player",
                    "option2_description": "South African former professional golfer, nine-time major champion and member of the 'Big Three'.",
                },
                {
                    "option1_name": "Rory McIlroy",
                    "option1_description": "Northern Irish professional golfer, four-time major champion and former world No. 1.",
                    "option2_name": "Jordan Spieth",
                    "option2_description": "American professional golfer, three-time major champion and youngest player to win multiple majors since Tiger Woods.",
                }
            ],
            "cricket": [
                {
                    "option1_name": "Sachin Tendulkar",
                    "option1_description": "Indian former international cricketer, widely regarded as one of the greatest batsmen. Scored 100 international centuries.",
                    "option2_name": "Don Bradman",
                    "option2_description": "Australian international cricketer, widely acknowledged as the greatest batsman of all time. Career average of 99.94.",
                },
                {
                    "option1_name": "Virat Kohli",
                    "option1_description": "Indian international cricketer, former captain and one of the greatest batsmen in modern cricket.",
                    "option2_name": "AB de Villiers",
                    "option2_description": "South African former international cricketer, known as 'Mr. 360' for his innovative batting style.",
                },
                {
                    "option1_name": "MS Dhoni",
                    "option1_description": "Indian former international cricketer, legendary captain who led India to World Cup victory in 2011.",
                    "option2_name": "Ricky Ponting",
                    "option2_description": "Australian former international cricketer, two-time World Cup winning captain and aggressive batsman.",
                }
            ],
            "volleyball": [
                {
                    "option1_name": "Karch Kiraly",
                    "option1_description": "American volleyball player and coach, only player to win Olympic gold in both indoor and beach volleyball.",
                    "option2_name": "Giba",
                    "option2_description": "Brazilian former volleyball player, three-time Olympic medalist and World Championship winner.",
                },
                {
                    "option1_name": "Misty May-Treanor",
                    "option1_description": "American former beach volleyball player, three-time Olympic gold medalist and most successful beach volleyball player.",
                    "option2_name": "Kerri Walsh Jennings",
                    "option2_description": "American beach volleyball player, three-time Olympic gold medalist and longtime partner of Misty May-Treanor.",
                },
                {
                    "option1_name": "Ivan Zaytsev",
                    "option1_description": "Italian volleyball player, known as 'The Tsar' and one of the most powerful spikers in the world.",
                    "option2_name": "Wilfredo León",
                    "option2_description": "Polish volleyball player of Cuban origin, known for his incredible jumping ability and powerful attacks.",
                }
            ],
            "rugby": [
                {
                    "option1_name": "Jonah Lomu",
                    "option1_description": "New Zealand rugby union player, widely regarded as the first global superstar of rugby. Dominated the 1995 World Cup.",
                    "option2_name": "Richie McCaw",
                    "option2_description": "New Zealand former rugby union player, two-time World Cup winning captain. Most capped All Black of all time.",
                },
                {
                    "option1_name": "Dan Carter",
                    "option1_description": "New Zealand former rugby union player, widely regarded as the greatest fly-half of all time.",
                    "option2_name": "Johnny Wilkinson",
                    "option2_description": "English former rugby union player, 2003 World Cup winner famous for his drop goal in the final.",
                },
                {
                    "option1_name": "Brian O'Driscoll",
                    "option1_description": "Irish former rugby union player, legendary center and former captain of Ireland and the British & Irish Lions.",
                    "option2_name": "Sergio Parisse",
                    "option2_description": "Italian former rugby union player, most capped player in rugby history and legendary number 8.",
                }
            ],
            "boxing": [
                {
                    "option1_name": "Muhammad Ali",
                    "option1_description": "American professional boxer, three-time heavyweight champion. Known as 'The Greatest' and cultural icon.",
                    "option2_name": "Mike Tyson",
                    "option2_description": "American former professional boxer, youngest heavyweight champion in history. Known for his ferocious power.",
                },
                {
                    "option1_name": "Floyd Mayweather Jr.",
                    "option1_description": "American former professional boxer, undefeated in 50 professional fights and multiple division champion.",
                    "option2_name": "Manny Pacquiao",
                    "option2_description": "Filipino former professional boxer, only eight-division world champion and boxing legend.",
                },
                {
                    "option1_name": "Sugar Ray Robinson",
                    "option1_description": "American professional boxer, widely regarded as the greatest pound-for-pound boxer of all time.",
                    "option2_name": "Rocky Marciano",
                    "option2_description": "American professional boxer, only heavyweight champion to retire undefeated with 49-0 record.",
                }
            ]
        }
        
        # Calculate which debate to show based on day of year
        day_of_year = datetime.utcnow().timetuple().tm_yday
        
        # Create today's debates
        for sport, debates in debate_pools.items():
            # Rotate through debates based on day of year
            debate_index = (day_of_year - 1) % len(debates)
            selected_debate = debates[debate_index]
            
            pick_data = {
                "id": str(uuid.uuid4()),
                "title": f"{selected_debate['option1_name']} vs {selected_debate['option2_name']}",
                "description": f"Who is the greater athlete? {selected_debate['option1_name']}: {selected_debate['option1_description']} OR {selected_debate['option2_name']}: {selected_debate['option2_description']}",
                "category": "Player Comparison",
                "sport": sport,
                "author_username": "system",
                "author_display_name": "Head2Head System",
                "total_votes": 0,
                "total_comments": 0,
                "created_at": datetime.utcnow(),
                "is_active": True
            }
            
            db_pick = DebatePick(**pick_data)
            db.add(db_pick)
        
        await db.commit()
        print(f"Successfully created 10 fresh debates for {today}! (Day {day_of_year} of the year)")

# Configure Celery Beat schedule
celery_app.conf.beat_schedule = {
    'create-daily-debates': {
        'task': 'tasks.create_daily_debates',
        'schedule': crontab(hour=0, minute=0),  # Run at midnight UTC every day
    },
}

celery_app.conf.timezone = 'UTC' 