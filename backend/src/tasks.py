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
from questions import get_questions

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Question generation configuration
QUESTION_COUNT = int(os.getenv("QUESTION_COUNT", 5))
QUESTION_TIME_LIMIT = 30

@celery_app.task(bind=True)
def generate_manual_quiz(self, battle_id: str, sport: str, level: str, question_count: int = QUESTION_COUNT):
    """
    Generate manual quiz questions for a battle as a background task
    """
    try:
        # Update task status
        self.update_state(
            state='PROGRESS',
            meta={'current': 0, 'total': 100, 'status': 'Getting questions...'}
        )
        
        # Get questions from manual questions
        questions = get_questions(sport, level, question_count)
        
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
            meta={'current': 100, 'total': 100, 'status': 'Quiz generation completed'}
        )
        
        return {
            'status': 'success',
            'battle_id': battle_id,
            'questions_count': len(questions),
            'sport': sport,
            'level': level
        }
        
    except Exception as e:
        logger.error(f"Error generating manual quiz for battle {battle_id}: {str(e)}")
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
        
    except Exception as e:
        logger.error(f"Error saving questions to cache for battle {battle_id}: {str(e)}")
        raise

def queue_quiz_generation_task(battle_id, sport, level, question_count):
    task = generate_manual_quiz.delay(battle_id, sport, level, question_count)
    return task 