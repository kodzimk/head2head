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
    """Handle battle completion and update user statistics"""
    try:
        # Check if this battle has already been processed
        if battle_id in processed_battles:
            logger.info(f"[BATTLE_WS] Battle {battle_id} has already been processed, skipping")
            return
        
        # Mark this battle as processed
        processed_battles.add(battle_id)
        logger.info(f"[BATTLE_WS] Processing battle result for {battle_id} with scores: {final_scores}")
        
        # Get usernames from scores
        usernames = list(final_scores.keys())
        if len(usernames) != 2:
            logger.error(f"[BATTLE_WS] Invalid number of users in battle {battle_id}: {len(usernames)}")
            return
        
        user1, user2 = usernames
        score1 = final_scores[user1]
        score2 = final_scores[user2]
        
        # Determine winner and loser
        if score1 > score2:
            winner = user1
            loser = user2
            result = "win"
        elif score2 > score1:
            winner = user2
            loser = user1
            result = "win"
        else:
            winner = user1  # For draw, both are treated equally
            loser = user2
            result = "draw"
        
        logger.info(f"[BATTLE_WS] Battle {battle_id} result: {result}, Winner: {winner}, Loser: {loser}")
        
        # Create battle data for database storage
        # We need to get the battle info from somewhere - let's try to get it from the battles dict first
        from battle.init import battles
        battle = battles.get(battle_id)
        
        logger.info(f"[BATTLE_WS] Retrieved battle from battles dict: {battle}")
        
        if not battle:
            logger.warning(f"[BATTLE_WS] Battle {battle_id} not found in battles dict, creating minimal battle data")
            # Create minimal battle data if not found
            battle_data = {
                'id': battle_id,
                'sport': 'Unknown',  # We don't have this info
                'level': 'Unknown',  # We don't have this info
                'first_opponent': user1,
                'second_opponent': user2,
                'first_opponent_score': score1,
                'second_opponent_score': score2
            }
        else:
            battle_data = {
                'id': battle_id,
                'sport': battle.sport,
                'level': battle.level,
                'first_opponent': battle.first_opponent,
                'second_opponent': battle.second_opponent,
                'first_opponent_score': score1,
                'second_opponent_score': score2
            }
        
        logger.info(f"[BATTLE_WS] Final battle data for database: {battle_data}")
        
        # Save battle to database
        try:
            async with SessionLocal() as session:
                # Check if battle already exists in database
                existing_battle = await session.get(BattleModel, battle_id)
                if existing_battle:
                    logger.info(f"[BATTLE_WS] Battle {battle_id} already exists in database, skipping save")
                else:
                    battle_db = BattleModel(
                        id=battle_id,
                        sport=battle_data['sport'],
                        level=battle_data['level'],
                        first_opponent=battle_data['first_opponent'],
                        second_opponent=battle_data['second_opponent'],
                        first_opponent_score=battle_data['first_opponent_score'],
                        second_opponent_score=battle_data['second_opponent_score']
                    )
                    session.add(battle_db)
                    await session.commit()
                    await session.refresh(battle_db)
                    logger.info(f"[BATTLE_WS] Successfully saved battle to database: {battle_db.id}")
                
                # Verify the battle exists by trying to retrieve it
                verification_battle = await session.get(BattleModel, battle_id)
                if verification_battle:
                    logger.info(f"[BATTLE_WS] Verification successful - battle {battle_id} found in database")
                else:
                    logger.error(f"[BATTLE_WS] Verification failed - battle {battle_id} not found in database after saving")
        except Exception as e:
            logger.error(f"[BATTLE_WS] Error saving battle to database: {str(e)}")
            raise
        
        # Update user statistics
        logger.info(f"[BATTLE_WS] Starting user statistics update for result: {result}")
        
        update_errors = []  # Track any errors that occur during updates
        
        try:
            if result == "draw":
                for username in [user1, user2]:
                    try:
                        user = await get_user_by_username(username)
                        logger.info(f"[BATTLE_WS] Updating user {username} for draw - before: totalBattle={user['totalBattle']}, winBattle={user['winBattle']}, winRate={user['winRate']}")
                        user['totalBattle'] += 1
                        user['streak'] = 0  
                        user['battles'].append(battle_id)
                        
                        if user['winBattle'] > 0:
                            user['winRate'] = math.floor((user['winBattle'] / user['totalBattle']) * 100)
                        else:
                            user['winRate'] = 0

                        logger.info(f"[BATTLE_WS] Updated user {username} for draw - after: totalBattle={user['totalBattle']}, winBattle={user['winBattle']}, winRate={user['winRate']}")

                        redis_username.set(user['username'], json.dumps(user))
                        redis_email.set(user['email'], json.dumps(user))
                        
                        user_data = UserDataCreate(
                            streak=user['streak'],
                            winRate=user['winRate'],
                            winBattle=user['winBattle'],
                            ranking=user['ranking'],
                            totalBattle=user['totalBattle'],
                            favourite=user['favourite'],
                            avatar=user['avatar'],
                            username=user['username'],
                            email=user['email'],
                            password=user['password'],
                            friends=user['friends'],
                            friendRequests=user['friendRequests'],
                            battles=user['battles'],
                            invitations=user['invitations']
                        )
                        await update_user_data(user_data)
                        logger.info(f"[BATTLE_WS] Successfully updated user data for {username}")
                    except Exception as e:
                        error_msg = f"Error updating user {username} for draw: {str(e)}"
                        logger.error(f"[BATTLE_WS] {error_msg}")
                        update_errors.append(error_msg)
            else:
                # Update winner
                try:
                    user = await get_user_by_username(winner)
                    logger.info(f"[BATTLE_WS] Updating winner {winner} - before: totalBattle={user['totalBattle']}, winBattle={user['winBattle']}, winRate={user['winRate']}")
                    user['winBattle'] += 1
                    user['totalBattle'] += 1
                    user['streak'] += 1
                    user['battles'].append(battle_id)

                    if user['winBattle'] > 0:
                        user['winRate'] = math.floor((user['winBattle'] / user['totalBattle']) * 100)
                    else:
                        user['winRate'] = 0

                    logger.info(f"[BATTLE_WS] Updated winner {winner} - after: totalBattle={user['totalBattle']}, winBattle={user['winBattle']}, winRate={user['winRate']}")

                    redis_username.set(user['username'], json.dumps(user))
                    redis_email.set(user['email'], json.dumps(user))
                    user_data = UserDataCreate(
                        streak=user['streak'],
                        winRate=user['winRate'],
                        winBattle=user['winBattle'],
                        ranking=user['ranking'],
                        totalBattle=user['totalBattle'],
                        favourite=user['favourite'],
                        avatar=user['avatar'],
                        username=user['username'],
                        email=user['email'],
                        password=user['password'],
                        friends=user['friends'],
                        friendRequests=user['friendRequests'],
                        battles=user['battles'],
                        invitations=user['invitations']
                    )
                    await update_user_data(user_data)
                    logger.info(f"[BATTLE_WS] Successfully updated winner data for {winner}")
                except Exception as e:
                    error_msg = f"Error updating winner {winner}: {str(e)}"
                    logger.error(f"[BATTLE_WS] {error_msg}")
                    update_errors.append(error_msg)

                # Update loser
                try:
                    user = await get_user_by_username(loser)
                    logger.info(f"[BATTLE_WS] Updating loser {loser} - before: totalBattle={user['totalBattle']}, winBattle={user['winBattle']}, winRate={user['winRate']}")
                    user['totalBattle'] += 1
                    user['streak'] = 0
                    user['battles'].append(battle_id)

                    if user['winBattle'] > 0:
                        user['winRate'] = math.floor((user['winBattle'] / user['totalBattle']) * 100)
                    else:
                        user['winRate'] = 0

                    logger.info(f"[BATTLE_WS] Updated loser {loser} - after: totalBattle={user['totalBattle']}, winBattle={user['winBattle']}, winRate={user['winRate']}")

                    redis_username.set(user['username'], json.dumps(user))
                    redis_email.set(user['email'], json.dumps(user))
                    user_data = UserDataCreate(
                        streak=user['streak'],
                        winRate=user['winRate'],
                        winBattle=user['winBattle'],
                        ranking=user['ranking'],
                        totalBattle=user['totalBattle'],
                        favourite=user['favourite'],
                        avatar=user['avatar'],
                        username=user['username'],
                        email=user['email'],
                        password=user['password'],
                        friends=user['friends'],
                        friendRequests=user['friendRequests'],
                        battles=user['battles'],
                        invitations=user['invitations']
                    )
                    await update_user_data(user_data)
                    logger.info(f"[BATTLE_WS] Successfully updated loser data for {loser}")
                except Exception as e:
                    error_msg = f"Error updating loser {loser}: {str(e)}"
                    logger.error(f"[BATTLE_WS] {error_msg}")
                    update_errors.append(error_msg)
            
            # Update rankings
            logger.info(f"[BATTLE_WS] Updating user rankings...")
            await update_user_rankings()
            logger.info(f"[BATTLE_WS] Successfully updated user rankings")
            
        except Exception as e:
            error_msg = f"Error in user statistics update: {str(e)}"
            logger.error(f"[BATTLE_WS] {error_msg}")
            update_errors.append(error_msg)
        
        # Log any errors that occurred during updates
        if update_errors:
            logger.error(f"[BATTLE_WS] The following errors occurred during user updates: {update_errors}")
        else:
            logger.info(f"[BATTLE_WS] All user updates completed successfully")
        
        logger.info(f"[BATTLE_WS] Successfully processed battle result for {battle_id}")
        
    except Exception as e:
        logger.error(f"[BATTLE_WS] Error handling battle result for {battle_id}: {str(e)}")
        raise 