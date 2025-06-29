import logging
import asyncio
import json
import redis
import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from websocket import manager
import traceback
from ai_quiz_generator import ai_quiz_generator
import math
import uuid
from models import UserAnswer
from init import SessionLocal

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Redis client for caching questions
redis_client = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))

# Global variables for battle management
battle_connections = {}  # battle_id -> list of websockets
battle_questions = {}    # battle_id -> list of questions
battle_states = {}       # battle_id -> battle state
battle_scores = {}       # battle_id -> {username: score}
battle_answers = {}      # battle_id -> {player: [answers]}
battle_current_question = {}  # battle_id -> current question index
battle_timers = {}       # battle_id -> timer info
battle_progress = {}     # battle_id -> {username: current_question_index}
battle_question_start_time = {}  # battle_id -> start time
processed_battles = set()  # Set of battle IDs that have already been processed
user_websocket_map = {}  # battle_id -> {username: websocket}
battle_completion_checks = {}  # battle_id -> number of completion checks performed
battle_start_time = {}  # battle_id -> battle start timestamp
battle_completion_triggered = set()  # Set of battle IDs that have triggered completion

# Battle states
WAITING = "waiting"
STARTING = "starting"
IN_PROGRESS = "in_progress"
FINISHED = "finished"

# Question time limit (5 seconds)
QUESTION_TIME_LIMIT = 5

# Add new tracking variables for user finished status
user_finished_status = {}  # Track which users have finished all questions
user_finished_timestamps = {}

async def save_user_answer(username: str, battle_id: str, question_text: str, user_answer: str, correct_answer: str, is_correct: bool, sport: str, level: str, question_index: int):
    """Save user answer to database for training purposes"""
    try:
        async with SessionLocal() as session:
            user_answer_record = UserAnswer(
                id=str(uuid.uuid4()),
                username=username,
                battle_id=battle_id,
                question_text=question_text,
                user_answer=user_answer,
                correct_answer=correct_answer,
                is_correct=is_correct,
                sport=sport,
                level=level,
                question_index=question_index
            )
            
            session.add(user_answer_record)
            await session.commit()
            logger.info(f"[BATTLE_WS] Saved answer for user {username} in battle {battle_id}")
            
    except Exception as e:
        logger.error(f"[BATTLE_WS] Error saving user answer: {str(e)}")
        # Don't fail the battle if answer saving fails

async def get_cached_questions(battle_id: str):
    """Get questions from Redis cache"""
    try:
        questions_key = f"battle_questions:{battle_id}"
        cached_questions = redis_client.get(questions_key)
        
        if cached_questions:
            questions = json.loads(cached_questions)
            logger.info(f"[BATTLE_WS] Retrieved {len(questions)} cached questions for battle {battle_id}")
            return questions
        
        return None
    except Exception as e:
        logger.error(f"[BATTLE_WS] Error getting cached questions for battle {battle_id}: {str(e)}")
        return None

async def get_battle_questions(battle_id: str, sport: str, level: str):
    """Get questions for a battle, either from cache or generate new ones using AI"""
    try:
        # Try to get from cache first
        questions = await get_cached_questions(battle_id)
        
        if not questions:
            # Generate new questions using AI
            logger.info(f"[BATTLE_WS] No cached questions found, generating AI questions for battle {battle_id}")
            questions = ai_quiz_generator.generate_questions(sport, level, 5, battle_id)
            
            # Cache the questions
            try:
                questions_key = f"battle_questions:{battle_id}"
                redis_client.setex(questions_key, 3600, json.dumps(questions))
                logger.info(f"[BATTLE_WS] Cached {len(questions)} AI-generated questions for battle {battle_id}")
            except Exception as e:
                logger.error(f"[BATTLE_WS] Error caching questions for battle {battle_id}: {str(e)}")
        
        return questions
    except Exception as e:
        logger.error(f"[BATTLE_WS] Error getting questions for battle {battle_id}: {str(e)}")
        return None

# Global variables for battle management
battle_connections = {}  # battle_id -> list of websockets
battle_questions = {}    # battle_id -> list of questions
battle_scores = {}       # battle_id -> {username: score}
battle_progress = {}     # battle_id -> {username: current_question_index}
battle_question_start_time = {}  # battle_id -> start time
processed_battles = set()  # Set of battle IDs that have already been processed

# Add timeout tracking for battles
battle_timeouts = {}

async def check_battle_timeout(battle_id: str):
    """Check if a battle should be timed out due to inactivity"""
    try:
        if battle_id not in battle_connections:
            return
        
        current_time = asyncio.get_event_loop().time()
        timeout_threshold = 300  # 5 minutes timeout
        
        # Check if any user has been inactive for too long
        for user in battle_progress.get(battle_id, {}):
            if user in battle_question_start_time:
                time_since_last_activity = current_time - battle_question_start_time[battle_id]
                if time_since_last_activity > timeout_threshold:
                    logger.warning(f"[BATTLE_WS] User {user} inactive for {time_since_last_activity}s in battle {battle_id}, forcing completion")
                    
                    # Force battle completion with current scores
                    if battle_id in battle_scores:
                        await handle_battle_result(battle_id, battle_scores[battle_id])
                    
                    # Clean up
                    if battle_id in battle_connections:
                        del battle_connections[battle_id]
                    if battle_id in battle_questions:
                        del battle_questions[battle_id]
                    if battle_id in battle_scores:
                        del battle_scores[battle_id]
                    if battle_id in battle_progress:
                        del battle_progress[battle_id]
                    if battle_id in battle_answers:
                        del battle_answers[battle_id]
                    if battle_id in battle_question_start_time:
                        del battle_question_start_time[battle_id]
                    if battle_id in user_websocket_map:
                        del user_websocket_map[battle_id]
                    
                    return
        
    except Exception as e:
        logger.error(f"[BATTLE_WS] Error in check_battle_timeout: {str(e)}")

@router.websocket("/ws/battle/{battle_id}")
async def battle_websocket(websocket: WebSocket, battle_id: str, username: str):
    await websocket.accept()
    logger.info(f"[BATTLE_WS] User '{username}' connected to battle {battle_id}")
    
    if battle_id not in battle_connections:
        battle_connections[battle_id] = []
    battle_connections[battle_id].append(websocket)
    
    # Track user-websocket mapping
    if battle_id not in user_websocket_map:
        user_websocket_map[battle_id] = {}
    user_websocket_map[battle_id][username] = websocket

    # Generate questions if not already done
    if battle_id not in battle_questions:
        logger.info(f"[BATTLE_WS] Getting questions for battle {battle_id}")
        
        # Get questions from cache (they should already be generated)
        questions = await get_cached_questions(battle_id)
        logger.info(f"[BATTLE_WS] Retrieved questions from cache: {questions}")
        
        if not questions:
            logger.error(f"[BATTLE_WS] No questions found for battle {battle_id}")
            # Let's check what's actually in Redis
            try:
                questions_key = f"battle_questions:{battle_id}"
                raw_data = redis_client.get(questions_key)
                logger.info(f"[BATTLE_WS] Raw Redis data for {questions_key}: {raw_data}")
                if raw_data:
                    logger.info(f"[BATTLE_WS] Raw data type: {type(raw_data)}")
                    logger.info(f"[BATTLE_WS] Raw data content: {raw_data}")
            except Exception as e:
                logger.error(f"[BATTLE_WS] Error checking Redis: {str(e)}")
            
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "No questions available for this battle"
            }))
            return
        
        battle_questions[battle_id] = questions
        battle_scores[battle_id] = {}
        battle_progress[battle_id] = {}
        battle_answers[battle_id] = {}
        battle_question_start_time[battle_id] = asyncio.get_event_loop().time()
        battle_start_time[battle_id] = asyncio.get_event_loop().time()  # Initialize battle start time
        battle_completion_checks[battle_id] = 0  # Initialize completion check counter
        
        # Initialize scores for both users in the battle
        from battle.init import battles
        battle = battles.get(battle_id)
        if battle:
            battle_scores[battle_id][battle.first_opponent] = 0
            battle_scores[battle_id][battle.second_opponent] = 0
            battle_progress[battle_id][battle.first_opponent] = -1  # -1 means not started
            battle_progress[battle_id][battle.second_opponent] = -1  # -1 means not started
            logger.info(f"[BATTLE_WS] Initialized scores for battle {battle_id}: {battle_scores[battle_id]}")
        
        logger.info(f"[BATTLE_WS] Questions loaded for battle {battle_id}: {len(questions)} questions")
        logger.info(f"[BATTLE_WS] First question structure: {questions[0] if questions else 'No questions'}")
        
        # Debug: Show the structure of the first question's answers
        if questions and len(questions) > 0:
            first_question = questions[0]
            logger.info(f"[BATTLE_WS] First question answers: {first_question.get('answers', [])}")
            for i, ans in enumerate(first_question.get('answers', [])):
                logger.info(f"[BATTLE_WS] Answer {i}: {ans}")
        
        # Send questions to all users in this battle
        for ws in battle_connections[battle_id]:
            try:
                message_data = {
                    "type": "quiz_ready",
                    "questions": battle_questions[battle_id]
                }
                logger.info(f"[BATTLE_WS] Sending quiz_ready message with {len(battle_questions[battle_id])} questions: {message_data}")
                await ws.send_text(json.dumps(message_data))
            except Exception as e:
                logger.error(f"[BATTLE_WS] Error sending questions to user in battle {battle_id}: {str(e)}")
                # Remove the broken connection
                battle_connections[battle_id] = [w for w in battle_connections[battle_id] if w != ws]
    else:
        # If already loaded, send to this user
        try:
            message_data = {
                "type": "quiz_ready",
                "questions": battle_questions[battle_id]
            }
            logger.info(f"[BATTLE_WS] Sending quiz_ready message to {username} with {len(battle_questions[battle_id])} questions: {message_data}")
            await websocket.send_text(json.dumps(message_data))
        except Exception as e:
            logger.error(f"[BATTLE_WS] Error sending questions to user {username} in battle {battle_id}: {str(e)}")
            return

    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"[BATTLE_WS] Message from '{username}' in battle {battle_id}: {data}")
            msg = json.loads(data)
            
            # Update last activity time for this user
            battle_question_start_time[battle_id] = asyncio.get_event_loop().time()
            
            if msg.get("type") == "submit_answer":
                user = msg.get("username")
                answer = msg.get("answer")
                q_index = msg.get("question_index", 0)
                
                # Check if battle is being processed for completion
                if battle_id in battle_completion_triggered or battle_id in battles_processing_completion:
                    logger.info(f"[BATTLE_WS] Battle {battle_id} is being processed for completion, ignoring answer submission from {user}")
                    await websocket.send_text(json.dumps({
                        "type": "battle_finished",
                        "message": "Battle is being completed, answer submission ignored"
                    }))
                    continue
                
                logger.info(f"[BATTLE_WS] Answer submitted by {user} for question {q_index} (total questions: {len(battle_questions[battle_id])})")
                
                if q_index >= len(battle_questions[battle_id]):
                    logger.error(f"[BATTLE_WS] Invalid question index {q_index} for battle {battle_id}")
                    continue
                
                # Check if user already answered this question
                if user in battle_answers[battle_id] and len(battle_answers[battle_id][user]) > q_index:
                    logger.info(f"[BATTLE_WS] User {user} already answered question {q_index}, ignoring duplicate")
                    continue
                
                # Initialize user's answer list if it doesn't exist
                if user not in battle_answers[battle_id]:
                    battle_answers[battle_id][user] = []
                
                # Ensure the answer list is long enough
                while len(battle_answers[battle_id][user]) <= q_index:
                    battle_answers[battle_id][user].append(None)
                
                # Store the answer at the correct index
                battle_answers[battle_id][user][q_index] = answer
                
                question = battle_questions[battle_id][q_index]
                correct = False
                
                # Check if the answer is correct by finding the answer with correct: true
                correct_answer = None
                logger.info(f"[BATTLE_WS] Question structure: {question}")
                logger.info(f"[BATTLE_WS] Question answers: {question.get('answers', [])}")
                logger.info(f"[BATTLE_WS] Question keys: {list(question.keys())}")
                
                for ans in question.get("answers", []):
                    logger.info(f"[BATTLE_WS] Checking answer: {ans}")
                    logger.info(f"[BATTLE_WS] Answer keys: {list(ans.keys()) if isinstance(ans, dict) else 'Not a dict'}")
                    # Check multiple possible correct answer indicators
                    if (ans.get("correct", False) or 
                        ans.get("isCorrect", False) or 
                        ans.get("correct_answer", False) or
                        ans.get("is_correct", False)):
                        correct_answer = ans.get("label", "")
                        logger.info(f"[BATTLE_WS] Found correct answer: {correct_answer}")
                        break
                
                # If no correct answer found with boolean flags, try to find it by other means
                if correct_answer is None:
                    # Check if there's a correctAnswer field in the question
                    if "correctAnswer" in question:
                        correct_answer = question["correctAnswer"]
                        logger.info(f"[BATTLE_WS] Found correct answer from question.correctAnswer: {correct_answer}")
                    # Check if there's a correct_answer field in the question
                    elif "correct_answer" in question:
                        correct_answer = question["correct_answer"]
                        logger.info(f"[BATTLE_WS] Found correct answer from question.correct_answer: {correct_answer}")
                    # Check if there's a correct field in the question
                    elif "correct" in question:
                        correct_answer = question["correct"]
                        logger.info(f"[BATTLE_WS] Found correct answer from question.correct: {correct_answer}")
                
                logger.info(f"[BATTLE_WS] Question {q_index}: user answered '{answer}', correct answer is '{correct_answer}'")
                
                # Update score if answer is correct
                if answer == correct_answer and correct_answer is not None:
                    correct = True
                    battle_scores[battle_id][user] = battle_scores[battle_id].get(user, 0) + 1
                    logger.info(f"[BATTLE_WS] Answer is correct! User score: {battle_scores[battle_id][user]}")
                else:
                    logger.info(f"[BATTLE_WS] Answer is incorrect. User score: {battle_scores[battle_id].get(user, 0)}")
                
                battle_progress[battle_id][user] = q_index
                logger.info(f"[BATTLE_WS] User {user} progress: {q_index + 1}/{len(battle_questions[battle_id])} questions completed")
                
                # Send answer submission confirmation to the user who answered
                await websocket.send_text(json.dumps({
                    "type": "answer_submitted",
                    "battle_id": battle_id,
                    "username": username,
                    "scores": battle_scores[battle_id],
                    "start_countdown": True  # Start countdown for next question
                }))
                
                # Send updated scores to opponent
                for ws in battle_connections[battle_id]:
                    if ws != websocket:  # Send to opponent only
                        try:
                            await ws.send_text(json.dumps({
                                "type": "opponent_answered",
                                "battle_id": battle_id,
                                "scores": battle_scores[battle_id]
                            }))
                        except Exception as e:
                            logger.error(f"[BATTLE_WS] Error sending opponent update: {str(e)}")
                
                # Schedule next question after 3 seconds for this user only
                asyncio.create_task(schedule_next_question(battle_id, username, q_index + 1))
                
                # Each user progresses independently - no waiting for opponent
                logger.info(f"[BATTLE_WS] User {user} answered question {q_index}, they will progress independently")
                
                # Save user answer to database for training purposes
                try:
                    # Get sport and level from battle info
                    from battle.init import battles
                    battle = battles.get(battle_id)
                    sport = battle.sport if battle else "Unknown"
                    level = battle.level if battle else "Unknown"
                    
                    # Save the answer
                    await save_user_answer(
                        username=user,
                        battle_id=battle_id,
                        question_text=question.get('question', ''),
                        user_answer=answer,
                        correct_answer=correct_answer or '',
                        is_correct=correct,
                        sport=sport,
                        level=level,
                        question_index=q_index
                    )
                except Exception as e:
                    logger.error(f"[BATTLE_WS] Error saving user answer: {str(e)}")
                    # Don't fail the battle if answer saving fails
                
    except WebSocketDisconnect:
        logger.info(f"[BATTLE_WS] User '{username}' disconnected from battle {battle_id}")
    finally:
        # Remove the websocket from the battle
        if battle_id in battle_connections:
            battle_connections[battle_id] = [ws for ws in battle_connections[battle_id] if ws != websocket]
            if not battle_connections[battle_id]:
                del battle_connections[battle_id]
                battle_questions.pop(battle_id, None)
                battle_scores.pop(battle_id, None)
                battle_progress.pop(battle_id, None)
                battle_answers.pop(battle_id, None)
                battle_question_start_time.pop(battle_id, None)
                battle_start_time.pop(battle_id, None)
                battle_completion_checks.pop(battle_id, None)
                user_websocket_map.pop(battle_id, None)
                battle_completion_triggered.discard(battle_id)
        # Also remove from user-websocket mapping
        if battle_id in user_websocket_map and username in user_websocket_map[battle_id]:
            del user_websocket_map[battle_id][username]
        logger.info(f"[BATTLE_WS] Cleaned up connection for user '{username}' in battle {battle_id}")

async def schedule_next_question(battle_id: str, username: str, question_index: int):
    """Schedule the next question after a 3-second delay"""
    try:
        await asyncio.sleep(3)  # 3-second delay
        
        if battle_id not in battle_connections:
            logger.warning(f"[BATTLE_WS] Battle {battle_id} no longer exists, skipping next question")
            return
        
        if question_index >= len(battle_questions[battle_id]):
            logger.info(f"[BATTLE_WS] User {username} reached last question, marking as finished")
            
            # Mark user as finished
            if battle_id not in user_finished_status:
                user_finished_status[battle_id] = {}
            user_finished_status[battle_id][username] = True
            
            # Record when user finished
            if battle_id not in user_finished_timestamps:
                user_finished_timestamps[battle_id] = {}
            user_finished_timestamps[battle_id][username] = asyncio.get_event_loop().time()
            
            # Update user progress to mark them as finished
            if username not in battle_progress[battle_id]:
                battle_progress[battle_id][username] = 0
            
            battle_progress[battle_id][username] = len(battle_questions[battle_id]) - 1
            
            # Update the question start time to track waiting duration
            battle_question_start_time[battle_id] = asyncio.get_event_loop().time()
            
            # Check if both users have finished - try to get battle info from multiple sources
            user1 = None
            user2 = None
            
            # First try to get from battles dict
            from battle.init import battles
            battle = battles.get(battle_id)
            if battle:
                user1 = battle.first_opponent
                user2 = battle.second_opponent
            else:
                # Fallback: try to get user info from battle_scores or other available data
                if battle_id in battle_scores:
                    score_keys = list(battle_scores[battle_id].keys())
                    if len(score_keys) >= 2:
                        user1 = score_keys[0]
                        user2 = score_keys[1]
                        logger.info(f"[BATTLE_WS] Retrieved user info from battle_scores: {user1}, {user2}")
                    else:
                        logger.warning(f"[BATTLE_WS] Not enough users in battle_scores for {battle_id}")
                        return
                else:
                    logger.warning(f"[BATTLE_WS] No battle info available for {battle_id}, cannot determine completion")
                    return
            
            if user1 and user2:
                user1_finished = user_finished_status.get(battle_id, {}).get(user1, False)
                user2_finished = user_finished_status.get(battle_id, {}).get(user2, False)
                
                logger.info(f"[BATTLE_WS] Battle {battle_id} user finished status: {user1}({user1_finished}) vs {user2}({user2_finished})")
                
                if user1_finished and user2_finished:
                    logger.info(f"[BATTLE_WS] Both users finished! Triggering battle completion for {battle_id}")
                    await trigger_battle_completion(battle_id)
                else:
                    # Still waiting for other user to finish
                    waiting_user = user2 if username == user1 else user1
                    logger.info(f"[BATTLE_WS] Waiting for {waiting_user} to finish battle {battle_id}")
                    
                    # Send waiting message to the user who just finished
                    if battle_id in user_websocket_map and username in user_websocket_map[battle_id]:
                        try:
                            await user_websocket_map[battle_id][username].send_text(json.dumps({
                                "type": "waiting_for_opponent",
                                "message": f"Waiting for {waiting_user} to finish...",
                                "scores": battle_scores[battle_id],
                                "finished_users": [u for u, finished in user_finished_status.get(battle_id, {}).items() if finished]
                            }))
                            logger.info(f"[BATTLE_WS] Sent waiting message to user {username} in battle {battle_id}")
                        except Exception as e:
                            logger.error(f"[BATTLE_WS] Error sending waiting message to user {username}: {str(e)}")
                    
                    # Schedule a completion check after 5 seconds to ensure battle doesn't get stuck
                    asyncio.create_task(delayed_completion_check(battle_id, 5))
            else:
                logger.error(f"[BATTLE_WS] Could not determine users for battle {battle_id}")
            return
        
        logger.info(f"[BATTLE_WS] Starting question {question_index} for battle {battle_id}")
        
        # Update question start time
        battle_question_start_time[battle_id] = asyncio.get_event_loop().time()
        
        # Send next question message to the specific user only
        if battle_id in user_websocket_map and username in user_websocket_map[battle_id]:
            target_websocket = user_websocket_map[battle_id][username]
            try:
                await target_websocket.send_text(json.dumps({
                    "type": "next_question",
                    "question_index": question_index,
                    "question": battle_questions[battle_id][question_index],
                    "scores": battle_scores[battle_id]
                }))
                logger.info(f"[BATTLE_WS] Sent next question {question_index} to user {username} in battle {battle_id}")
            except Exception as e:
                logger.error(f"[BATTLE_WS] Error sending next question to user {username} in battle {battle_id}: {str(e)}")
                # Remove the broken websocket
                if battle_id in battle_connections:
                    battle_connections[battle_id] = [w for w in battle_connections[battle_id] if w != target_websocket]
                if battle_id in user_websocket_map and username in user_websocket_map[battle_id]:
                    del user_websocket_map[battle_id][username]
        else:
            logger.error(f"[BATTLE_WS] No websocket found for user {username} in battle {battle_id}")
                
    except Exception as e:
        logger.error(f"[BATTLE_WS] Error in schedule_next_question for battle {battle_id}: {str(e)}")

async def delayed_completion_check(battle_id: str, delay_seconds: int):
    """Perform a delayed completion check to ensure battle doesn't get stuck"""
    try:
        await asyncio.sleep(delay_seconds)
        
        if battle_id not in battle_connections:
            return
        
        logger.info(f"[BATTLE_WS] Performing delayed completion check for battle {battle_id}")
        
        # Check if both users have finished
        from battle.init import battles
        battle = battles.get(battle_id)
        if battle:
            user1 = battle.first_opponent
            user2 = battle.second_opponent
            
            user1_finished = user_finished_status.get(battle_id, {}).get(user1, False)
            user2_finished = user_finished_status.get(battle_id, {}).get(user2, False)
            
            # Check waiting time for users who finished first
            current_time = asyncio.get_event_loop().time()
            max_waiting_time = 30  # 30 seconds max waiting time
            
            user1_waiting_time = 0
            user2_waiting_time = 0
            
            if user1_finished and not user2_finished:
                user1_finished_time = user_finished_timestamps.get(battle_id, {}).get(user1, current_time)
                user1_waiting_time = current_time - user1_finished_time
                logger.info(f"[BATTLE_WS] User {user1} has been waiting for {user1_waiting_time:.1f}s")
                
            if user2_finished and not user1_finished:
                user2_finished_time = user_finished_timestamps.get(battle_id, {}).get(user2, current_time)
                user2_waiting_time = current_time - user2_finished_time
                logger.info(f"[BATTLE_WS] User {user2} has been waiting for {user2_waiting_time:.1f}s")
            
            # Force completion if waiting time exceeded
            if user1_waiting_time > max_waiting_time or user2_waiting_time > max_waiting_time:
                logger.info(f"[BATTLE_WS] Max waiting time exceeded, forcing battle completion for {battle_id}")
                await trigger_battle_completion(battle_id)
                return
        
        # Use the existing validation logic as fallback
        if await validate_battle_completion(battle_id):
            logger.info(f"[BATTLE_WS] Delayed check: Battle {battle_id} ready for completion")
            await trigger_battle_completion(battle_id)
        else:
            logger.info(f"[BATTLE_WS] Delayed check: Battle {battle_id} not ready yet")
            
    except Exception as e:
        logger.error(f"[BATTLE_WS] Error in delayed completion check for battle {battle_id}: {str(e)}")

# Remove timeout function since users progress independently 

async def handle_battle_result(battle_id: str, final_scores: dict):
    logger.info(f"[BATTLE_WS] handle_battle_result called for battle_id={battle_id}, final_scores={final_scores}")
    
    # Track if this battle has already been processed to prevent duplicate processing
    if hasattr(handle_battle_result, 'processed_battles'):
        if battle_id in handle_battle_result.processed_battles:
            logger.warning(f"[BATTLE_WS] Battle {battle_id} already processed, skipping")
            return
    else:
        handle_battle_result.processed_battles = set()
    
    handle_battle_result.processed_battles.add(battle_id)
    
    try:
        # Try to get battle info from multiple sources
        user1 = None
        user2 = None
        battle = None
        
        # First try to get from battles dict
        from battle.init import battles
        battle = battles.get(battle_id)
        if battle:
            user1 = battle.first_opponent
            user2 = battle.second_opponent
        else:
            # Fallback: try to get user info from battle_scores
            if battle_id in battle_scores:
                score_keys = list(battle_scores[battle_id].keys())
                if len(score_keys) >= 2:
                    user1 = score_keys[0]
                    user2 = score_keys[1]
                    logger.info(f"[BATTLE_WS] Retrieved user info from battle_scores for result: {user1}, {user2}")
                else:
                    logger.error(f"[BATTLE_WS] Not enough users in battle_scores for {battle_id}")
                    return
            else:
                logger.error(f"[BATTLE_WS] No battle info available for {battle_id}")
                return
        
        if not user1 or not user2:
            logger.error(f"[BATTLE_WS] Could not determine users for battle {battle_id}")
            return
        
        # Validate final_scores data
        if not final_scores or not isinstance(final_scores, dict):
            logger.error(f"[BATTLE_WS] Invalid final_scores data: {final_scores}")
            return
        
        # Ensure both users have scores, default to 0 if missing
        score1 = final_scores.get(user1, 0)
        score2 = final_scores.get(user2, 0)
        
        # Validate scores are numeric
        try:
            score1 = int(score1) if score1 is not None else 0
            score2 = int(score2) if score2 is not None else 0
        except (ValueError, TypeError):
            logger.error(f"[BATTLE_WS] Invalid score values: score1={score1}, score2={score2}")
            score1 = 0
            score2 = 0
        
        logger.info(f"[BATTLE_WS] Processing battle result: {user1}({score1}) vs {user2}({score2})")
        
        # Determine winner, loser, and result with proper validation
        winner = None
        loser = None
        result = "draw"
        
        if score1 > score2:
            winner = user1
            loser = user2
            result = "win"
        elif score2 > score1:
            winner = user2
            loser = user1
            result = "win"
        else:
            # Draw case - both users have same score
            logger.info(f"[BATTLE_WS] Battle {battle_id} ended in a draw: {score1}-{score2}")
            result = "draw"
        
        if winner:
            logger.info(f"[BATTLE_WS] Battle {battle_id} winner: {winner}, loser: {loser}, score: {score1}-{score2}")
        else:
            logger.info(f"[BATTLE_WS] Battle {battle_id} ended in draw: {score1}-{score2}")
        
        # Save battle to database with proper error handling
        try:
            from models import BattleModel
            
            # Get sport and level from battle object or use defaults
            sport = battle.sport if battle else "Unknown"
            level = battle.level if battle else "Unknown"
            
            async with SessionLocal() as session:
                battle_db = BattleModel(
                    id=battle_id,
                    sport=sport,
                    level=level,
                    first_opponent=user1,
                    second_opponent=user2,
                    first_opponent_score=score1,
                    second_opponent_score=score2
                )
                session.add(battle_db)
                await session.commit()
                await session.refresh(battle_db)
                logger.info(f"[BATTLE_WS] Battle {battle_id} saved to database with scores: {score1}-{score2}")
        except Exception as e:
            logger.error(f"[BATTLE_WS] Error saving battle to database: {str(e)}\n{traceback.format_exc()}")
            # Continue processing even if database save fails
        
        # Update user stats atomically with enhanced error handling
        from db.router import update_user_statistics, get_user_by_username
        updated_users = {}
        update_errors = []
        
        try:
            # Update both users in a single try block for atomicity
            for username in [user1, user2]:
                try:
                    user = await get_user_by_username(username)
                    if not user:
                        logger.error(f"[BATTLE_WS] User {username} not found")
                        update_errors.append(f"User {username} not found")
                        continue
                    
                    logger.info(f"[BATTLE_WS] Updating user {username} - before: totalBattle={user['totalBattle']}, winBattle={user['winBattle']}, winRate={user['winRate']}, streak={user['streak']}")
                    
                    # Calculate new statistics with proper validation
                    current_total = user.get('totalBattle', 0)
                    current_wins = user.get('winBattle', 0)
                    current_streak = user.get('streak', 0)
                    
                    new_total_battle = current_total + 1
                    
                    if result == "draw":
                        new_win_battle = current_wins  # No change for draw
                        new_streak = 0  # Draw breaks streak
                    elif username == winner:
                        new_win_battle = current_wins + 1
                        new_streak = current_streak + 1
                    else:
                        new_win_battle = current_wins  # No change for loss
                        new_streak = 0  # Loss breaks streak
                    
                    new_win_rate = math.floor((new_win_battle / new_total_battle) * 100) if new_total_battle > 0 else 0
                    
                    # Update battles list - ensure battle_id is added
                    battles_list = user.get('battles', [])
                    if not isinstance(battles_list, list):
                        battles_list = []
                    
                    if battle_id not in battles_list:
                        battles_list.append(battle_id)
                        logger.info(f"[BATTLE_WS] Added battle {battle_id} to user {username} battles list")
                    else:
                        logger.info(f"[BATTLE_WS] Battle {battle_id} already in user {username} battles list")
                    
                    # Update user statistics
                    success = await update_user_statistics(
                        username=username,
                        total_battle=new_total_battle,
                        win_battle=new_win_battle,
                        streak=new_streak,
                        win_rate=new_win_rate,
                        battles_list=battles_list
                    )
                    
                    if success:
                        logger.info(f"[BATTLE_WS] Successfully updated user {username}: totalBattle={new_total_battle}, winBattle={new_win_battle}, winRate={new_win_rate}, streak={new_streak}")
                        updated_users[username] = {
                            'totalBattle': new_total_battle,
                            'winBattle': new_win_battle,
                            'winRate': new_win_rate,
                            'streak': new_streak
                        }
                    else:
                        logger.error(f"[BATTLE_WS] Failed to update user {username}")
                        update_errors.append(f"Failed to update user {username}")
                        
                except Exception as e:
                    error_msg = f"Error updating user {username}: {str(e)}"
                    logger.error(f"[BATTLE_WS] {error_msg}\n{traceback.format_exc()}")
                    update_errors.append(error_msg)
            
            if update_errors:
                logger.error(f"[BATTLE_WS] The following errors occurred during user updates: {update_errors}")
                # Continue with the process even if some updates failed
            else:
                logger.info(f"[BATTLE_WS] All user updates completed successfully")
                
        except Exception as e:
            error_msg = f"Error in user statistics update: {str(e)}"
            logger.error(f"[BATTLE_WS] {error_msg}\n{traceback.format_exc()}")
            # Continue processing even if user updates fail
        
        # Update rankings with error handling
        try:
            from battle.router import update_user_rankings
            logger.info(f"[BATTLE_WS] Updating user rankings...")
            ranking_success = await update_user_rankings()
            if ranking_success:
                logger.info(f"[BATTLE_WS] Successfully updated user rankings")
            else:
                logger.warning(f"[BATTLE_WS] Failed to update user rankings")
        except Exception as e:
            logger.error(f"[BATTLE_WS] Error updating user rankings: {str(e)}\n{traceback.format_exc()}")
            # Continue processing even if ranking update fails
        
        # Broadcast battle finished event to all connected clients with enhanced data
        try:
            battle_finished_data = {
                "type": "battle_finished",
                "battle_id": battle_id,
                "result": result,
                "winner": winner,
                "loser": loser,
                "final_scores": final_scores,
                "updated_users": updated_users,
                "battle": {
                    "id": battle_id,
                    "sport": battle.sport if battle else "Unknown",
                    "level": battle.level if battle else "Unknown",
                    "first_opponent": user1,
                    "second_opponent": user2,
                    "first_opponent_score": score1,
                    "second_opponent_score": score2
                },
                "timestamp": asyncio.get_event_loop().time(),
                "processing_status": "completed"
            }
            
            # Send to all users in the battle via direct websocket connections
            if battle_id in battle_connections:
                sent_count = 0
                for ws in battle_connections[battle_id]:
                    try:
                        await ws.send_text(json.dumps(battle_finished_data))
                        sent_count += 1
                        logger.info(f"[BATTLE_WS] Sent battle_finished message to user in battle {battle_id}")
                    except Exception as e:
                        logger.error(f"[BATTLE_WS] Failed to send battle_finished message: {str(e)}")
                        battle_connections[battle_id] = [w for w in battle_connections[battle_id] if w != ws]
                
                logger.info(f"[BATTLE_WS] Battle finished event sent to {sent_count} users in battle {battle_id}")
            else:
                logger.warning(f"[BATTLE_WS] No active connections found for battle {battle_id}")
            
        except Exception as e:
            logger.error(f"[BATTLE_WS] Error broadcasting battle finished event: {str(e)}\n{traceback.format_exc()}")
        
        # Clean up in-memory battle data with proper error handling
        try:
            if battle_id in battles:
                del battles[battle_id]
                logger.info(f"[BATTLE_WS] Removed battle {battle_id} from memory")
            
            # Clean up other battle-related data
            cleanup_keys = [
                battle_questions, battle_scores, battle_progress, 
                battle_answers, battle_question_start_time, 
                battle_start_time, battle_completion_checks, user_websocket_map,
                user_finished_status, user_finished_timestamps
            ]
            
            for data_dict in cleanup_keys:
                if battle_id in data_dict:
                    del data_dict[battle_id]
                    logger.info(f"[BATTLE_WS] Cleaned up {data_dict.__name__ if hasattr(data_dict, '__name__') else 'data'} for battle {battle_id}")
            
            battle_completion_triggered.discard(battle_id)
            battles_processing_completion.discard(battle_id)
            
        except Exception as e:
            logger.error(f"[BATTLE_WS] Error during cleanup: {str(e)}")
        
        logger.info(f"[BATTLE_WS] Completed battle result processing for {battle_id} with result: {result}")
            
    except Exception as e:
        logger.error(f"[BATTLE_WS] Fatal error in handle_battle_result: {str(e)}\n{traceback.format_exc()}")
    finally:
        # Remove from processed battles set to allow reprocessing if needed
        if hasattr(handle_battle_result, 'processed_battles') and battle_id in handle_battle_result.processed_battles:
            handle_battle_result.processed_battles.remove(battle_id)

async def monitor_battle_timeouts():
    """Background task to monitor battle timeouts"""
    while True:
        try:
            await asyncio.sleep(60)  # Check every minute
            
            current_time = asyncio.get_event_loop().time()
            timeout_threshold = 300  # 5 minutes timeout
            
            # Check all active battles for timeouts
            for battle_id in list(battle_connections.keys()):
                if battle_id in battle_question_start_time:
                    time_since_last_activity = current_time - battle_question_start_time[battle_id]
                    if time_since_last_activity > timeout_threshold:
                        logger.warning(f"[BATTLE_WS] Battle {battle_id} inactive for {time_since_last_activity}s, forcing completion")
                        
                        # Force battle completion with current scores
                        if battle_id in battle_scores and battle_id not in processed_battles:
                            await handle_battle_result(battle_id, battle_scores[battle_id])
                        
                        # Clean up
                        if battle_id in battle_connections:
                            del battle_connections[battle_id]
                        if battle_id in battle_questions:
                            del battle_questions[battle_id]
                        if battle_id in battle_scores:
                            del battle_scores[battle_id]
                        if battle_id in battle_progress:
                            del battle_progress[battle_id]
                        if battle_id in battle_answers:
                            del battle_answers[battle_id]
                        if battle_id in battle_question_start_time:
                            del battle_question_start_time[battle_id]
                        if battle_id in battle_start_time:
                            del battle_start_time[battle_id]
                        if battle_id in battle_completion_checks:
                            del battle_completion_checks[battle_id]
                        if battle_id in user_websocket_map:
                            del user_websocket_map[battle_id]
                        battle_completion_triggered.discard(battle_id)
        
        except Exception as e:
            logger.error(f"[BATTLE_WS] Error in monitor_battle_timeouts: {str(e)}")

# Start the timeout monitor
import asyncio
asyncio.create_task(monitor_battle_timeouts()) 

async def validate_battle_completion(battle_id: str) -> bool:
    """
    Validate that a battle is ready to be completed.
    Returns True if battle should be completed, False otherwise.
    """
    try:
        # Check if battle exists and has all necessary data
        if battle_id not in battle_questions or battle_id not in battle_scores:
            logger.warning(f"[BATTLE_WS] Battle {battle_id} missing essential data")
            return False
        
        # Get battle info - try multiple sources
        user1 = None
        user2 = None
        
        # First try to get from battles dict
        from battle.init import battles
        battle = battles.get(battle_id)
        if battle:
            user1 = battle.first_opponent
            user2 = battle.second_opponent
        else:
            # Fallback: try to get user info from battle_scores
            if battle_id in battle_scores:
                score_keys = list(battle_scores[battle_id].keys())
                if len(score_keys) >= 2:
                    user1 = score_keys[0]
                    user2 = score_keys[1]
                    logger.info(f"[BATTLE_WS] Retrieved user info from battle_scores for validation: {user1}, {user2}")
                else:
                    logger.warning(f"[BATTLE_WS] Not enough users in battle_scores for validation of {battle_id}")
                    return False
            else:
                logger.warning(f"[BATTLE_WS] No battle info available for validation of {battle_id}")
                return False
        
        if not user1 or not user2:
            logger.warning(f"[BATTLE_WS] Could not determine users for battle {battle_id}")
            return False
        
        total_questions = len(battle_questions[battle_id])
        
        # Check if both users have finished using the new tracking system
        user1_finished = user_finished_status.get(battle_id, {}).get(user1, False)
        user2_finished = user_finished_status.get(battle_id, {}).get(user2, False)
        
        # Fallback to progress checking if finished status not available
        if not user1_finished or not user2_finished:
            user1_progress = battle_progress.get(battle_id, {}).get(user1, -1)
            user2_progress = battle_progress.get(battle_id, {}).get(user2, -1)
            
            user1_finished = user1_progress >= total_questions - 1
            user2_finished = user2_progress >= total_questions - 1
        
        # Check if both users have all their answers recorded
        user1_answers = len(battle_answers.get(battle_id, {}).get(user1, []))
        user2_answers = len(battle_answers.get(battle_id, {}).get(user2, []))
        
        # Check if maximum time has expired (15 minutes = 900 seconds)
        max_battle_time = 900  # 15 minutes
        battle_duration = asyncio.get_event_loop().time() - battle_start_time.get(battle_id, 0)
        time_expired = battle_duration >= max_battle_time
        
        # Check if both users have all answers and are finished
        both_finished = user1_finished and user2_finished and user1_answers >= total_questions and user2_answers >= total_questions
        
        # Check if time expired and both users have at least some answers
        time_expired_with_answers = time_expired and user1_answers > 0 and user2_answers > 0
        
        # Check waiting time for users who finished first
        current_time = asyncio.get_event_loop().time()
        waiting_time_threshold = 30  # 30 seconds
        
        if user1_finished and not user2_finished:
            user1_finished_time = user_finished_timestamps.get(battle_id, {}).get(user1, current_time)
            user1_waiting_time = current_time - user1_finished_time
            if user1_waiting_time > waiting_time_threshold:
                logger.info(f"[BATTLE_WS] User {user1} has been waiting for {user1_waiting_time:.1f}s, forcing completion")
                both_finished = True
        
        if user2_finished and not user1_finished:
            user2_finished_time = user_finished_timestamps.get(battle_id, {}).get(user2, current_time)
            user2_waiting_time = current_time - user2_finished_time
            if user2_waiting_time > waiting_time_threshold:
                logger.info(f"[BATTLE_WS] User {user2} has been waiting for {user2_waiting_time:.1f}s, forcing completion")
                both_finished = True
        
        logger.info(f"[BATTLE_WS] Battle {battle_id} completion check:")
        logger.info(f"  - User1 ({user1}): finished={user1_finished}, answers={user1_answers}/{total_questions}")
        logger.info(f"  - User2 ({user2}): finished={user2_finished}, answers={user2_answers}/{total_questions}")
        logger.info(f"  - Battle duration: {battle_duration:.1f}s (max: {max_battle_time}s)")
        logger.info(f"  - Both finished: {both_finished}")
        logger.info(f"  - Time expired with answers: {time_expired_with_answers}")
        
        # Increment completion check counter
        if battle_id not in battle_completion_checks:
            battle_completion_checks[battle_id] = 0
        battle_completion_checks[battle_id] += 1
        
        # If both users are clearly finished, allow completion regardless of check count
        if both_finished:
            logger.info(f"[BATTLE_WS] Both users finished, allowing completion for battle {battle_id}")
            return True
        
        # If time expired with answers, allow completion regardless of check count
        if time_expired_with_answers:
            logger.info(f"[BATTLE_WS] Time expired with answers, allowing completion for battle {battle_id}")
            return True
        
        # Only limit completion checks for other scenarios
        if battle_completion_checks[battle_id] > 20:  # Increased maximum completion checks
            logger.warning(f"[BATTLE_WS] Battle {battle_id} exceeded maximum completion checks")
            return False
        
        return False
        
    except Exception as e:
        logger.error(f"[BATTLE_WS] Error in validate_battle_completion for battle {battle_id}: {str(e)}")
        return False

# Add a new variable to track battles that are being processed for completion
battles_processing_completion = set()

async def trigger_battle_completion(battle_id: str):
    """
    Trigger battle completion if not already triggered.
    """
    if battle_id in battle_completion_triggered:
        logger.warning(f"[BATTLE_WS] Battle {battle_id} completion already triggered, skipping")
        return
    
    if battle_id in battles_processing_completion:
        logger.warning(f"[BATTLE_WS] Battle {battle_id} already being processed for completion, skipping")
        return
    
    # Validate completion conditions
    if not await validate_battle_completion(battle_id):
        logger.info(f"[BATTLE_WS] Battle {battle_id} not ready for completion")
        return
    
    # Mark as triggered to prevent duplicate processing
    battle_completion_triggered.add(battle_id)
    battles_processing_completion.add(battle_id)
    
    logger.info(f"[BATTLE_WS] Triggering battle completion for {battle_id}")
    
    try:
        await handle_battle_result(battle_id, battle_scores[battle_id])
        logger.info(f"[BATTLE_WS] Battle {battle_id} completed successfully")
    except Exception as e:
        logger.error(f"[BATTLE_WS] Error completing battle {battle_id}: {str(e)}")
        # Remove from triggered set to allow retry
        battle_completion_triggered.discard(battle_id)
    finally:
        # Remove from processing set
        battles_processing_completion.discard(battle_id)

async def periodic_battle_completion_check():
    """Periodic check for battle completion every 15 seconds"""
    while True:
        try:
            await asyncio.sleep(15)  # Check every 15 seconds (reduced from 30)
            
            current_time = asyncio.get_event_loop().time()
            
            # Check all active battles
            for battle_id in list(battle_connections.keys()):
                if battle_id in battle_completion_triggered:
                    continue  # Skip battles already triggered for completion
                
                # Only check battles that have been running for at least 1 minute
                if battle_id in battle_start_time:
                    battle_duration = current_time - battle_start_time[battle_id]
                    if battle_duration < 60:  # Less than 1 minute, skip
                        continue
                
                # Check if battle should be completed
                if await validate_battle_completion(battle_id):
                    logger.info(f"[BATTLE_WS] Periodic check: Battle {battle_id} ready for completion")
                    await trigger_battle_completion(battle_id)
        
        except Exception as e:
            logger.error(f"[BATTLE_WS] Error in periodic battle completion check: {str(e)}")

# Start the periodic completion check
asyncio.create_task(periodic_battle_completion_check()) 