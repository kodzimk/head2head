import os
import json
import asyncio
import time
import google.generativeai as genai
from celery import current_task
from celery_app import celery_app
from init import SessionLocal
from models import BattleModel
from sqlalchemy import select
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Google Generative AI
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    logger.info("Google API key configured successfully")
else:
    logger.warning("Google API key not configured - AI quiz generation will use fallback questions")

# Question generation configuration
QUESTION_COUNT = int(os.getenv("QUESTION_COUNT", 5))
QUESTION_TIME_LIMIT = 30

@celery_app.task(bind=True)
def generate_ai_quiz(self, battle_id: str, sport: str, level: str, question_count: int = QUESTION_COUNT):
    """
    Generate AI quiz questions for a battle as a background task
    """
    logger.info(f"[CELERY] Starting quiz generation task for battle {battle_id}, sport={sport}, level={level}, count={question_count}")
    try:
        # Update task status
        self.update_state(
            state='PROGRESS',
            meta={'current': 0, 'total': 100, 'status': 'Generating questions...'}
        )
        
        logger.info(f"Starting AI quiz generation for battle {battle_id}, sport: {sport}, level: {level}, question_count: {question_count}")
        
        # Generate questions using Google Generative AI
        questions = generate_questions_with_ai(sport, level, question_count)
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'current': 50, 'total': 100, 'status': 'Saving questions to database...'}
        )
        
        # Save questions to database or cache
        save_questions_to_battle(battle_id, questions)
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'current': 100, 'total': 100, 'status': 'Quiz generation completed'}
        )
        
        logger.info(f"AI quiz generation completed for battle {battle_id}")
        
        return {
            'status': 'success',
            'battle_id': battle_id,
            'questions_count': len(questions),
            'sport': sport,
            'level': level
        }
        
    except Exception as e:
        logger.error(f"Error generating AI quiz for battle {battle_id}: {str(e)}")
        self.update_state(
            state='FAILURE',
            meta={'error': str(e)}
        )
        raise

def generate_questions_with_ai(sport: str, level: str, question_count: int = QUESTION_COUNT):
    """
    Generate questions using Google Generative AI with retry logic for rate limits
    """
    if not GOOGLE_API_KEY:
        logger.error("Google API key not configured")
        return []
    
    logger.info(f"Starting AI quiz generation for {sport}/{level}, count={question_count}")
    
    max_retries = 3
    base_delay = 2  # Start with 2 seconds
    
    for attempt in range(max_retries):
        try:
            # Create a model instance
            model = genai.GenerativeModel('gemini-2.5-flash')
            # Enhanced prompt for better quiz generation
            prompt = f"""
Generate a quiz with {question_count} multiple-choice questions about {sport}, categorized by difficulty: easy, medium, and hard. Each question should be directly related to the sport — rules, players, history, events, or tactics. Format each question with 4 options and mark the correct answer.

IMPORTANT REQUIREMENTS:
- Each question must have exactly 4 answer options (A, B, C, D)
- Only one correct answer per question
- Focus on sports facts, rules, history, records, players, and tactics
- Avoid business, finance, sponsorship, or commercial topics
- Mix difficulty levels appropriately for {level} level
- Questions should be engaging and test real sports knowledge

DIFFICULTY GUIDELINES:
- EASY: Basic facts, well-known players, simple rules, common knowledge
- MEDIUM: Specific statistics, recent events, detailed rules, notable achievements
- HARD: Obscure facts, historical details, complex scenarios, advanced tactics

QUESTION CATEGORIES TO INCLUDE:
- Rules and regulations
- Player achievements and records
- Historical moments and events
- Team statistics and championships
- Tactics and strategies
- International competitions
- Famous matches and rivalries

Return only valid JSON in this format:
{{
  "questions": [
    {{
      "question": "Question text?",
      "answers": [
        {{"text": "Answer A", "correct": true}},
        {{"text": "Answer B", "correct": false}},
        {{"text": "Answer C", "correct": false}},
        {{"text": "Answer D", "correct": false}}
      ],
      "time_limit": 30,
      "difficulty": "easy/medium/hard"
    }}
  ]
}}
"""
            # Generate response
            logger.info(f"Generating AI response for {sport} {level} (attempt {attempt + 1})")
            response = model.generate_content(prompt)
            response_text = response.text.strip()
            logger.info(f"AI response received (length: {len(response_text)})")
            
            # Parse JSON response
            try:
                if response_text.startswith('```json'):
                    response_text = response_text[7:]
                if response_text.endswith('```'):
                    response_text = response_text[:-3]
                
                logger.info(f"Parsing JSON response: {response_text[:200]}...")
                data = json.loads(response_text.strip())
                questions = data.get('questions', [])
                logger.info(f"Found {len(questions)} questions in AI response")
                
                validated_questions = []
                for i, q in enumerate(questions):
                    if validate_question(q):
                        validated_questions.append(q)
                    else:
                        logger.warning(f"Question {i} failed validation: {q}")
                
                logger.info(f"Generated {len(validated_questions)} valid questions for {sport} {level}")
                if not validated_questions:
                    logger.warning(f"No valid questions generated by AI for {sport} {level}. Using fallback questions.")
                    from aiquiz.router import generate_expanded_fallback_questions
                    validated_questions = generate_expanded_fallback_questions(sport, level, question_count)
                validated_questions = add_labels_to_answers(validated_questions)
                return validated_questions
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI response as JSON: {e}")
                logger.error(f"Raw response: {response_text}")
                if attempt == max_retries - 1:  # Last attempt
                    return []
                continue
                
        except Exception as e:
            error_str = str(e)
            logger.error(f"Error generating questions with AI (attempt {attempt + 1}): {error_str}")
            if "429" in error_str or "quota" in error_str.lower() or "rate" in error_str.lower():
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)  # Exponential backoff: 2s, 4s, 8s
                    logger.warning(f"Rate limit hit on attempt {attempt + 1}, retrying in {delay} seconds...")
                    time.sleep(delay)
                    continue
                else:
                    logger.error(f"Rate limit exceeded after {max_retries} attempts, using fallback questions")
                    from aiquiz.router import generate_expanded_fallback_questions
                    fallback_questions = generate_expanded_fallback_questions(sport, level, question_count)
                    fallback_questions = add_labels_to_answers(fallback_questions)
                    return fallback_questions
            else:
                logger.error(f"Error generating questions with AI: {str(e)}")
                if attempt == max_retries - 1:  # Last attempt
                    return []
                continue
    
    # If we get here, all retries failed
    logger.error(f"All {max_retries} attempts failed for AI question generation")
    from aiquiz.router import generate_expanded_fallback_questions
    fallback_questions = generate_expanded_fallback_questions(sport, level, question_count)
    fallback_questions = add_labels_to_answers(fallback_questions)
    return fallback_questions

def validate_question(question):
    """
    Validate question structure
    """
    try:
        required_fields = ['question', 'answers']
        if not all(field in question for field in required_fields):
            return False
        
        if not question['question'].strip():
            return False
        
        answers = question.get('answers', [])
        if len(answers) != 4:
            return False
        
        # Check that exactly one answer has correct: true
        correct_answers = [a for a in answers if a.get('correct', False)]
        if len(correct_answers) != 1:
            return False
        
        # Check that all answers have text
        for answer in answers:
            if not answer.get('text', '').strip():
                return False
        
        return True
    except Exception:
        return False

def save_questions_to_battle(battle_id: str, questions: list):
    """
    Save generated questions to the battle in database or cache
    """
    try:
        import redis
        redis_client = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))
        questions_key = f"battle_questions:{battle_id}"
        redis_client.setex(
            questions_key,
            3600,  # Expire in 1 hour
            json.dumps(questions)
        )
        logger.info(f"[save_questions_to_battle] Saved {len(questions)} questions for battle {battle_id} with key {questions_key}")
    except Exception as e:
        logger.error(f"[save_questions_to_battle] Error saving questions for battle {battle_id} with key {questions_key}: {str(e)}")

@celery_app.task
def cleanup_expired_questions():
    """
    Clean up expired questions from cache
    """
    try:
        import redis
        redis_client = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))
        
        # This is a simple cleanup - in production you might want more sophisticated logic
        logger.info("Cleaning up expired questions")
        
    except Exception as e:
        logger.error(f"Error cleaning up expired questions: {str(e)}")

def add_labels_to_answers(questions):
    labels = ['A', 'B', 'C', 'D']
    for q in questions:
        for i, ans in enumerate(q.get('answers', [])):
            ans['label'] = labels[i]
    return questions

# Add this helper for logging when a task is queued

def queue_quiz_generation_task(battle_id, sport, level, question_count):
    task = generate_ai_quiz.delay(battle_id, sport, level, question_count)
    logging.info(f"[queue_quiz_generation_task] Queued quiz generation for battle {battle_id} (sport={sport}, level={level}, count={question_count}), Celery task id: {task.id}")
    return task 