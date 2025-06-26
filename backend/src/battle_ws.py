import logging
import asyncio
import json
import redis
import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
from models import BattleModel, UserDataCreate
from sqlalchemy import select
from init import engine, SessionLocal, redis_username, redis_email
from battle.router import battle_result, battle_draw_result, update_user_rankings
import math
from db.router import get_user_by_username, update_user_data
from datetime import datetime
from websocket import manager
import traceback

logger = logging.getLogger("battle_ws")

router = APIRouter()

# Redis client for checking cached questions
redis_client = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))

async def get_cached_questions(battle_id: str):
    """Get cached questions for a battle"""
    try:
        questions_key = f"battle_questions:{battle_id}"
        logger.info(f"[BATTLE_WS] Fetching questions with key {questions_key}")
        cached_questions = redis_client.get(questions_key)
        if cached_questions:
            logger.info(f"[BATTLE_WS] Found cached questions for {battle_id}")
            return json.loads(cached_questions)
        logger.info(f"[BATTLE_WS] No cached questions found for {battle_id}")
        return None
    except Exception as e:
        logger.error(f"[BATTLE_WS] Error getting cached questions for battle {battle_id}: {str(e)}")
        return None

# Global variables for battle management
battle_connections = {}  # battle_id -> list of websockets
battle_questions = {}    # battle_id -> list of questions
battle_scores = {}       # battle_id -> {username: score}
battle_progress = {}     # battle_id -> {username: current_question_index}
battle_answers = {}      # battle_id -> {username: {question_index: answer}}
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
                
                logger.info(f"[BATTLE_WS] Answer submitted by {user} for question {q_index} (total questions: {len(battle_questions[battle_id])})")
                
                if q_index >= len(battle_questions[battle_id]):
                    logger.error(f"[BATTLE_WS] Invalid question index {q_index} for battle {battle_id}")
                    continue
                
                # Check if user already answered this question
                if user in battle_answers[battle_id] and q_index in battle_answers[battle_id][user]:
                    logger.info(f"[BATTLE_WS] User {user} already answered question {q_index}, ignoring duplicate")
                    continue
                
                # Initialize user's answer dict if it doesn't exist
                if user not in battle_answers[battle_id]:
                    battle_answers[battle_id][user] = {}
                
                # Store the answer
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
                
                # Send immediate answer confirmation to the user who answered
                for ws in battle_connections[battle_id]:
                    try:
                        await ws.send_text(json.dumps({
                            "type": "answer_submitted",
                            "user": user,
                            "question_index": q_index,
                            "correct": correct,
                            "scores": battle_scores[battle_id],
                            "start_countdown": True
                        }))
                    except Exception as e:
                        logger.error(f"[BATTLE_WS] Error sending answer confirmation to user in battle {battle_id}: {str(e)}")
                        battle_connections[battle_id] = [w for w in battle_connections[battle_id] if w != ws]
                
                # Each user progresses independently - no waiting for opponent
                logger.info(f"[BATTLE_WS] User {user} answered question {q_index}, they will progress independently")
                
                # Check if this was the last question
                if q_index == len(battle_questions[battle_id]) - 1:
                    # Last question - check if both users have finished
                    logger.info(f"[BATTLE_WS] Last question answered by {user}, checking if both users finished")
                    
                    # Count how many users have finished all questions
                    finished_users = 0
                    for battle_user in battle_progress[battle_id]:
                        if battle_progress[battle_id][battle_user] >= len(battle_questions[battle_id]) - 1:
                            finished_users += 1
                    
                    logger.info(f"[BATTLE_WS] {finished_users} users have finished the battle")
                    
                    if finished_users >= 2:  # Both users finished
                        logger.info(f"[BATTLE_WS] Both users finished battle {battle_id}, sending final results")
                        
                        # Handle battle result and update user statistics
                        try:
                            await handle_battle_result(battle_id, battle_scores[battle_id])
                        except Exception as e:
                            logger.error(f"[BATTLE_WS] Error handling battle result: {str(e)}")
                        
                        # Send battle finished to all users
                        for ws in battle_connections[battle_id]:
                            try:
                                await ws.send_text(json.dumps({
                                    "type": "battle_finished",
                                    "final_scores": battle_scores[battle_id]
                                }))
                            except Exception as e:
                                logger.error(f"[BATTLE_WS] Error broadcasting battle finished to user in battle {battle_id}: {str(e)}")
                                battle_connections[battle_id] = [w for w in battle_connections[battle_id] if w != ws]
                    else:
                        # Still waiting for other user to finish
                        logger.info(f"[BATTLE_WS] Waiting for {2 - finished_users} more user(s) to finish battle")
                        # Send waiting message only to the user who just finished
                        try:
                            await websocket.send_text(json.dumps({
                                "type": "waiting_for_opponent",
                                "message": "Waiting for opponent to finish..."
                            }))
                        except Exception as e:
                            logger.error(f"[BATTLE_WS] Error sending waiting message to user {user} in battle {battle_id}: {str(e)}")
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
        logger.info(f"[BATTLE_WS] Cleaned up connection for user '{username}' in battle {battle_id}")

async def start_next_question_after_delay(battle_id: str, next_question_index: int):
    """Start the next question after a 3-second delay"""
    try:
        await asyncio.sleep(3)  # 3-second delay
        
        if battle_id not in battle_connections:
            logger.warning(f"[BATTLE_WS] Battle {battle_id} no longer exists, skipping next question")
            return
        
        logger.info(f"[BATTLE_WS] Starting question {next_question_index} for battle {battle_id}")
        
        # Check if this was the last question
        if next_question_index >= len(battle_questions[battle_id]):
            # Don't advance - let the answer submission handle the last question
            logger.info(f"[BATTLE_WS] Reached last question, not advancing automatically")
            return
        
        # Update question start time
        battle_question_start_time[battle_id] = asyncio.get_event_loop().time()
        
        # Send next question message to all users
        for ws in battle_connections[battle_id]:
            try:
                await ws.send_text(json.dumps({
                    "type": "next_question",
                    "question_index": next_question_index,
                    "question": battle_questions[battle_id][next_question_index],
                    "scores": battle_scores[battle_id]
                }))
            except Exception as e:
                logger.error(f"[BATTLE_WS] Error sending next question to user in battle {battle_id}: {str(e)}")
                battle_connections[battle_id] = [w for w in battle_connections[battle_id] if w != ws]
                
    except Exception as e:
        logger.info(f"[BATTLE_WS] Error in start_next_question_after_delay for battle {battle_id}: {str(e)}")

# Remove timeout function since users progress independently 

async def handle_battle_result(battle_id: str, final_scores: dict):
    logger.info(f"[BATTLE_WS] handle_battle_result called for battle_id={battle_id}, final_scores={final_scores}")
    try:
        from battle.init import battles
        battle = battles.get(battle_id)
        if not battle:
            logger.error(f"[BATTLE_WS] Battle {battle_id} not found in battles dict")
            return
        
        user1 = battle.first_opponent
        user2 = battle.second_opponent
        score1 = final_scores.get(user1, 0)
        score2 = final_scores.get(user2, 0)
        
        # Determine winner, loser, and result
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
            # Draw case
            logger.info(f"[BATTLE_WS] Battle {battle_id} ended in a draw: {score1}-{score2}")
        
        if winner:
            logger.info(f"[BATTLE_WS] Battle {battle_id} winner: {winner}, loser: {loser}, score: {score1}-{score2}")
        
        # Save battle to database
        try:
            from models import BattleModel
            from init import SessionLocal
            async with SessionLocal() as session:
                battle_db = BattleModel(
                    id=battle_id,
                    sport=battle.sport,
                    level=battle.level,
                    first_opponent=battle.first_opponent,
                    second_opponent=battle.second_opponent,
                    first_opponent_score=score1,
                    second_opponent_score=score2
                )
                session.add(battle_db)
                await session.commit()
                await session.refresh(battle_db)
                logger.info(f"[BATTLE_WS] Battle {battle_id} saved to database with scores: {score1}-{score2}")
        except Exception as e:
            logger.error(f"[BATTLE_WS] Error saving battle to database: {str(e)}\n{traceback.format_exc()}")
            return
        
        # Update user stats atomically
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
                    
                    # Calculate new statistics
                    new_total_battle = user['totalBattle'] + 1
                    
                    if result == "draw":
                        new_win_battle = user['winBattle']
                        new_streak = 0  # Draw breaks streak
                    elif username == winner:
                        new_win_battle = user['winBattle'] + 1
                        new_streak = user['streak'] + 1
                    else:
                        new_win_battle = user['winBattle']
                        new_streak = 0  # Loss breaks streak
                    
                    new_win_rate = math.floor((new_win_battle / new_total_battle) * 100) if new_total_battle > 0 else 0
                    
                    # Update battles list - ensure battle_id is added
                    battles_list = user.get('battles', [])
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
            return
        
        # Update rankings
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
        
        # Broadcast battle finished event to all connected clients
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
                    "sport": battle.sport,
                    "level": battle.level,
                    "first_opponent": battle.first_opponent,
                    "second_opponent": battle.second_opponent,
                    "first_opponent_score": score1,
                    "second_opponent_score": score2
                }
            }
            
            # Send to both users
            for user in [user1, user2]:
                await manager.send_message(json.dumps(battle_finished_data), user)
            
            logger.info(f"[BATTLE_WS] Battle finished event broadcasted to users {user1} and {user2}")
            
        except Exception as e:
            logger.error(f"[BATTLE_WS] Error broadcasting battle finished event: {str(e)}\n{traceback.format_exc()}")
        
        # Clean up in-memory battle
        if battle_id in battles:
            del battles[battle_id]
            logger.info(f"[BATTLE_WS] Removed battle {battle_id} from memory")
            
    except Exception as e:
        logger.error(f"[BATTLE_WS] Fatal error in handle_battle_result: {str(e)}\n{traceback.format_exc()}")

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
        
        except Exception as e:
            logger.error(f"[BATTLE_WS] Error in monitor_battle_timeouts: {str(e)}")

# Start the timeout monitor
import asyncio
asyncio.create_task(monitor_battle_timeouts()) 