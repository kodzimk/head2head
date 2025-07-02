from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, and_, func
from init import SessionLocal
from models import UserAnswer, TrainingSession, TrainingAnswer, UserData
import uuid
from datetime import datetime
import logging
from typing import List, Dict, Any, Optional
from ai_quiz_generator import AIQuizGenerator

logger = logging.getLogger(__name__)
training_router = APIRouter()

# Initialize AI Quiz Generator
ai_generator = AIQuizGenerator()

@training_router.get("/incorrect-answers/{username}")
async def get_incorrect_answers(
    username: str,
    sport: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50)
):
    """Get incorrect answers for a user, optionally filtered by sport and level"""
    try:
        async with SessionLocal() as session:
            # Build query
            query = select(UserAnswer).where(
                and_(
                    UserAnswer.username == username,
                    UserAnswer.is_correct == False
                )
            )
            
            # Add filters if provided
            if sport:
                query = query.where(UserAnswer.sport == sport)
            if level:
                query = query.where(UserAnswer.level == level)
            
            # Order by most recent and limit
            query = query.order_by(UserAnswer.answered_at.desc()).limit(limit)
            
            result = await session.execute(query)
            incorrect_answers = result.scalars().all()
            
            # Convert to dict format
            answers_data = []
            for answer in incorrect_answers:
                answers_data.append({
                    "id": answer.id,
                    "question_text": answer.question_text,
                    "user_answer": answer.user_answer,
                    "correct_answer": answer.correct_answer,
                    "sport": answer.sport,
                    "level": answer.level,
                    "answered_at": answer.answered_at.isoformat(),
                    "battle_id": answer.battle_id
                })
            
            return {
                "username": username,
                "incorrect_answers": answers_data,
                "total_count": len(answers_data)
            }
            
    except Exception as e:
        logger.error(f"Error fetching incorrect answers for {username}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch incorrect answers")

@training_router.get("/training-stats/{username}")
async def get_training_stats(username: str):
    """Get training statistics for a user"""
    try:
        async with SessionLocal() as session:
            # Get total incorrect answers from UserAnswer (battles)
            incorrect_query = select(func.count(UserAnswer.id)).where(
                and_(
                    UserAnswer.username == username,
                    UserAnswer.is_correct == False
                )
            )
            total_incorrect_battles = await session.scalar(incorrect_query) or 0
            
            # Get total answers from UserAnswer (battles)
            total_query = select(func.count(UserAnswer.id)).where(
                UserAnswer.username == username
            )
            total_answers_battles = await session.scalar(total_query) or 0
            
            # Get training sessions
            sessions_query = select(TrainingSession).where(
                TrainingSession.username == username
            ).order_by(TrainingSession.started_at.desc())
            
            result = await session.execute(sessions_query)
            sessions = result.scalars().all()
            
            # Calculate training stats from TrainingSession
            total_training_sessions = len(sessions)
            total_training_questions = sum(session.total_questions for session in sessions)
            total_training_correct = sum(session.correct_answers for session in sessions)
            
            # Get total incorrect answers from TrainingAnswer (training sessions)
            training_incorrect_query = select(func.count(TrainingAnswer.id)).where(
                and_(
                    TrainingAnswer.username == username,
                    TrainingAnswer.is_correct == False
                )
            )
            total_incorrect_training = await session.scalar(training_incorrect_query) or 0
            
            # Get total answers from TrainingAnswer (training sessions)
            training_total_query = select(func.count(TrainingAnswer.id)).where(
                TrainingAnswer.username == username
            )
            total_answers_training = await session.scalar(training_total_query) or 0
            
            # Combine battle and training stats
            total_answers = total_answers_battles + total_answers_training
            total_incorrect = total_incorrect_battles + total_incorrect_training
            
            # Get sport-wise incorrect answers (from both UserAnswer and TrainingAnswer)
            sport_query_battles = select(
                UserAnswer.sport,
                func.count(UserAnswer.id).label('count')
            ).where(
                and_(
                    UserAnswer.username == username,
                    UserAnswer.is_correct == False
                )
            ).group_by(UserAnswer.sport)
            
            sport_query_training = select(
                TrainingAnswer.sport,
                func.count(TrainingAnswer.id).label('count')
            ).where(
                and_(
                    TrainingAnswer.username == username,
                    TrainingAnswer.is_correct == False
                )
            ).group_by(TrainingAnswer.sport)
            
            result_battles = await session.execute(sport_query_battles)
            result_training = await session.execute(sport_query_training)
            
            # Combine sport stats
            sport_stats = {}
            for row in result_battles:
                sport_stats[row.sport] = sport_stats.get(row.sport, 0) + row.count
            for row in result_training:
                sport_stats[row.sport] = sport_stats.get(row.sport, 0) + row.count
            
            sport_stats_list = [{"sport": sport, "count": count} for sport, count in sport_stats.items()]
            sport_stats_list.sort(key=lambda x: x["count"], reverse=True)
            
            return {
                "username": username,
                "total_answers": total_answers,
                "total_incorrect": total_incorrect,
                "accuracy_rate": round(((total_answers - total_incorrect) / total_answers * 100) if total_answers else 0, 2),
                "training_sessions": total_training_sessions,
                "training_questions": total_training_questions,
                "training_correct": total_training_correct,
                "training_accuracy": round((total_training_correct / total_training_questions * 100) if total_training_questions else 0, 2),
                "sport_stats": sport_stats_list
            }
            
    except Exception as e:
        logger.error(f"Error fetching training stats for {username}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch training statistics")

@training_router.post("/start-session")
async def start_training_session(
    username: str,
    session_type: str = Query(...),
    sport: Optional[str] = Query(None),
    level: Optional[str] = Query(None)
):
    """Start a new training session"""
    try:
        session_id = str(uuid.uuid4())
        
        async with SessionLocal() as session:
            training_session = TrainingSession(
                id=session_id,
                username=username,
                session_type=session_type,
                sport=sport,
                level=level,
                total_questions=0,
                correct_answers=0
            )
            
            session.add(training_session)
            await session.commit()
            await session.refresh(training_session)
            
            return {
                "session_id": session_id,
                "username": username,
                "session_type": session_type,
                "sport": sport,
                "level": level,
                "started_at": training_session.started_at.isoformat()
            }
            
    except Exception as e:
        logger.error(f"Error starting training session for {username}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start training session")

@training_router.post("/submit-answer")
async def submit_training_answer(
    session_id: str,
    username: str,
    question_text: str,
    user_answer: str,
    correct_answer: str,
    sport: str,
    level: str,
    original_answer_id: Optional[str] = None
):
    """Submit an answer during training"""
    try:
        answer_id = str(uuid.uuid4())
        is_correct = user_answer == correct_answer
        
        async with SessionLocal() as session:
            # Save the training answer
            training_answer = TrainingAnswer(
                id=answer_id,
                training_session_id=session_id,
                username=username,
                question_text=question_text,
                user_answer=user_answer,
                correct_answer=correct_answer,
                is_correct=is_correct,
                sport=sport,
                level=level,
                original_answer_id=original_answer_id
            )
            
            session.add(training_answer)
            
            # Update training session stats
            training_session = await session.get(TrainingSession, session_id)
            if training_session:
                training_session.total_questions += 1
                if is_correct:
                    training_session.correct_answers += 1
            
            await session.commit()
            
            return {
                "answer_id": answer_id,
                "is_correct": is_correct,
                "session_stats": {
                    "total_questions": training_session.total_questions if training_session else 0,
                    "correct_answers": training_session.correct_answers if training_session else 0
                }
            }
            
    except Exception as e:
        logger.error(f"Error submitting training answer: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit training answer")

@training_router.post("/complete-session/{session_id}")
async def complete_training_session(session_id: str):
    """Mark a training session as completed"""
    try:
        async with SessionLocal() as session:
            training_session = await session.get(TrainingSession, session_id)
            if not training_session:
                raise HTTPException(status_code=404, detail="Training session not found")
            
            training_session.completed_at = datetime.utcnow()
            await session.commit()
            
            return {
                "session_id": session_id,
                "completed_at": training_session.completed_at.isoformat(),
                "final_stats": {
                    "total_questions": training_session.total_questions,
                    "correct_answers": training_session.correct_answers,
                    "accuracy": round((training_session.correct_answers / training_session.total_questions * 100) if training_session.total_questions else 0, 2)
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing training session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to complete training session")

@training_router.get("/recent-sessions/{username}")
async def get_recent_training_sessions(username: str, limit: int = Query(10, ge=1, le=20)):
    """Get recent training sessions for a user"""
    try:
        async with SessionLocal() as session:
            query = select(TrainingSession).where(
                TrainingSession.username == username
            ).order_by(TrainingSession.started_at.desc()).limit(limit)
            
            result = await session.execute(query)
            sessions = result.scalars().all()
            
            sessions_data = []
            for session_obj in sessions:
                sessions_data.append({
                    "id": session_obj.id,
                    "session_type": session_obj.session_type,
                    "sport": session_obj.sport,
                    "level": session_obj.level,
                    "total_questions": session_obj.total_questions,
                    "correct_answers": session_obj.correct_answers,
                    "accuracy": round((session_obj.correct_answers / session_obj.total_questions * 100) if session_obj.total_questions else 0, 2),
                    "started_at": session_obj.started_at.isoformat(),
                    "completed_at": session_obj.completed_at.isoformat() if session_obj.completed_at else None
                })
            
            return {
                "username": username,
                "recent_sessions": sessions_data
            }
            
    except Exception as e:
        logger.error(f"Error fetching recent training sessions for {username}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch recent training sessions")

@training_router.post("/generate-random-questions")
async def generate_random_training_questions(
    sport: Optional[str] = Query(None),
    level: str = Query("medium"),
    count: int = Query(5, ge=1, le=10),
    language: str = Query("en")
):
    """Generate random training questions using AI"""
    try:
        # Use "mixed" sport if none specified to get variety
        if not sport:
            sport = "mixed"
        
        # Generate questions using AI with language support
        questions = ai_generator.generate_questions(sport, level, count, f"training_{uuid.uuid4()}", language)
        
        # Convert to training format
        training_questions = []
        for i, question in enumerate(questions):
            # Find the correct answer
            correct_answer = None
            for answer in question.get('answers', []):
                if answer.get('correct', False):
                    correct_answer = answer.get('text', '')
                    break
            
            training_questions.append({
                "id": str(uuid.uuid4()),
                "question": question.get('question', ''),
                "answers": [
                    {"label": "A", "text": question.get('answers', [{}])[0].get('text', ''), "correct": question.get('answers', [{}])[0].get('correct', False)},
                    {"label": "B", "text": question.get('answers', [{}])[1].get('text', ''), "correct": question.get('answers', [{}])[1].get('correct', False)},
                    {"label": "C", "text": question.get('answers', [{}])[2].get('text', ''), "correct": question.get('answers', [{}])[2].get('correct', False)},
                    {"label": "D", "text": question.get('answers', [{}])[3].get('text', ''), "correct": question.get('answers', [{}])[3].get('correct', False)}
                ],
                "correctAnswer": correct_answer or "",
                "sport": sport,
                "level": level,
                "timeLimit": question.get('time_limit', 30),
                "difficulty": question.get('difficulty', level)
            })
        
        return {
            "questions": training_questions,
            "total": len(training_questions),
            "sport": sport,
            "level": level
        }
        
    except Exception as e:
        logger.error(f"Error generating random training questions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate random questions") 