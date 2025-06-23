from .init import chat, get_next_api_key, get_chat_for_key
import ast
import random
import json
import hashlib
from datetime import datetime, timedelta
import asyncio

# Global question tracking system
used_questions = {}  # Track questions by hash to avoid duplicates
question_rotation = {}  # Track question rotation by sport/level
last_reset = datetime.now()

# Semaphore to limit concurrent AI API calls
ai_api_semaphore = asyncio.Semaphore(3)  # Allow max 3 concurrent AI API calls

# Question type rotation to ensure variety
question_types = [
    "historical_facts",
    "player_records", 
    "team_achievements",
    "rules_and_regulations",
    "statistics",
    "nicknames_and_trivia",
    "tournaments_and_competitions",
    "controversial_moments",
    "comparison_questions",
    "achievement_questions"
]

def get_question_hash(question_data):
    """Generate a hash for a question to track uniqueness"""
    question_text = question_data.get("question", "").lower().strip()
    # Remove common variations that don't change the core question
    question_text = question_text.replace("?", "").replace("!", "").replace(".", "")
    # Also hash the answer options to catch similar questions with different answers
    answers_text = " ".join([ans.get("text", "").lower().strip() for ans in question_data.get("answers", [])])
    combined_text = question_text + " " + answers_text
    return hashlib.md5(combined_text.encode()).hexdigest()

def is_question_used(question_hash, sport, level):
    """Check if a question has been used recently for this sport/level"""
    key = f"{sport}_{level}"
    if key not in used_questions:
        return False
    
    # Check if question was used in the last 24 hours
    current_time = datetime.now()
    if key in used_questions:
        for timestamp, hash_list in used_questions[key].items():
            if current_time - timestamp < timedelta(hours=24):
                if question_hash in hash_list:
                    return True
    return False

def get_next_question_types(sport, level, count=5):
    """Get the next question types to use for variety"""
    key = f"{sport}_{level}"
    if key not in question_rotation:
        question_rotation[key] = []
    
    # If we've used all types, reset
    if len(question_rotation[key]) >= len(question_types):
        question_rotation[key] = []
    
    # Get the next batch of question types
    available_types = [qt for qt in question_types if qt not in question_rotation[key]]
    selected_types = random.sample(available_types, min(count, len(available_types)))
    question_rotation[key].extend(selected_types)
    
    return selected_types

def mark_question_used(question_hash, sport, level):
    """Mark a question as used for this sport/level"""
    key = f"{sport}_{level}"
    current_time = datetime.now()
    
    if key not in used_questions:
        used_questions[key] = {}
    
    if current_time not in used_questions[key]:
        used_questions[key][current_time] = []
    
    used_questions[key][current_time].append(question_hash)
    
    # Clean up old entries (older than 24 hours)
    keys_to_remove = []
    for timestamp in used_questions[key]:
        if current_time - timestamp > timedelta(hours=24):
            keys_to_remove.append(timestamp)
    
    for timestamp in keys_to_remove:
        del used_questions[key][timestamp]

def get_unique_questions(questions, sport, level, required_count=10):
    """Filter questions to ensure uniqueness"""
    unique_questions = []
    used_hashes = set()
    
    for question in questions:
        question_hash = get_question_hash(question)
        
        # Skip if question was used recently
        if is_question_used(question_hash, sport, level):
            continue
        
        # Skip if question is already in this batch
        if question_hash in used_hashes:
            continue
        
        unique_questions.append(question)
        used_hashes.add(question_hash)
        
        if len(unique_questions) >= required_count:
            break
    
    return unique_questions

def create_question_variations(question, variation_count=3):
    """Create variations of a question to increase variety"""
    variations = []
    
    for i in range(variation_count):
        variation = question.copy()
        
        # Shuffle answer options
        answers = variation['answers'].copy()
        random.shuffle(answers)
        variation['answers'] = answers
        
        # Update correct answer to match new order
        correct_text = next((ans['text'] for ans in question['answers'] if ans['label'] == question['correctAnswer']), '')
        for ans in answers:
            if ans['text'] == correct_text:
                variation['correctAnswer'] = ans['label']
                break
        
        # Add slight text variations
        question_text = variation['question']
        if i == 1 and "?" in question_text:
            # Change question format
            if question_text.startswith("Who"):
                variation['question'] = question_text.replace("Who", "Which player")
            elif question_text.startswith("What"):
                variation['question'] = question_text.replace("What", "Which")
            elif question_text.startswith("When"):
                variation['question'] = question_text.replace("When", "In which year")
        
        variations.append(variation)
    
    return variations

def filter_business_questions(questions):
    """Filter out questions about equipment, economics, business, or financial matters"""
    business_keywords = [
        'equipment', 'cost', 'price', 'salary', 'contract', 'transfer fee', 'market value',
        'revenue', 'profit', 'sponsorship', 'sponsor', 'financial', 'business', 'investment',
        'merchandise', 'ticket price', 'broadcasting', 'media rights', 'commercial',
        'endorsement', 'brand', 'advertisement', 'marketing', 'economics', 'economy',
        'money', 'dollar', 'euro', 'pound', 'million', 'billion', 'worth', 'value',
        'deal', 'agreement', 'partnership', 'corporate', 'company', 'franchise'
    ]
    
    filtered_questions = []
    
    for question in questions:
        question_text = question.get('question', '').lower()
        answers_text = ' '.join([ans.get('text', '').lower() for ans in question.get('answers', [])])
        full_text = question_text + ' ' + answers_text
        
        # Check if any business keywords are present
        contains_business_content = any(keyword in full_text for keyword in business_keywords)
        
        if not contains_business_content:
            filtered_questions.append(question)
        else:
            print(f"Filtered out business-related question: {question.get('question', '')[:50]}...")
    
    return filtered_questions

def generate_expanded_fallback_questions(sport: str, level: str, count: int = 5):
    """Generate fallback questions when AI generation fails, always returns 'count' questions"""
    # Simple fallback questions for each sport and level - focused on pure sports knowledge
    fallback_questions = {
        "football": {
            "easy": [
                {
                    "question": "Which country has won the most FIFA World Cup titles?",
                    "answers": [{"label": "A", "text": "Brazil"}, {"label": "B", "text": "Germany"}, {"label": "C", "text": "Argentina"}, {"label": "D", "text": "Italy"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Who is considered the greatest football player of all time?",
                    "answers": [{"label": "A", "text": "Lionel Messi"}, {"label": "B", "text": "Cristiano Ronaldo"}, {"label": "C", "text": "Pelé"}, {"label": "D", "text": "Diego Maradona"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "How many players are on a football team during a match?",
                    "answers": [{"label": "A", "text": "10"}, {"label": "B", "text": "11"}, {"label": "C", "text": "12"}, {"label": "D", "text": "9"}],
                    "correctAnswer": "B",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": "Which club has won the most UEFA Champions League titles?",
                    "answers": [{"label": "A", "text": "Real Madrid"}, {"label": "B", "text": "Barcelona"}, {"label": "C", "text": "Bayern Munich"}, {"label": "D", "text": "AC Milan"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "What is the duration of a standard football match?",
                    "answers": [{"label": "A", "text": "80 minutes"}, {"label": "B", "text": "90 minutes"}, {"label": "C", "text": "100 minutes"}, {"label": "D", "text": "120 minutes"}],
                    "correctAnswer": "B",
                    "difficulty": "MEDIUM"
                }
            ],
            "hard": [
                {
                    "question": "What year was the first FIFA World Cup held?",
                    "answers": [{"label": "A", "text": "1930"}, {"label": "B", "text": "1934"}, {"label": "C", "text": "1938"}, {"label": "D", "text": "1950"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which player has scored the most goals in World Cup history?",
                    "answers": [{"label": "A", "text": "Miroslav Klose"}, {"label": "B", "text": "Ronaldo"}, {"label": "C", "text": "Pelé"}, {"label": "D", "text": "Just Fontaine"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        },
        "basketball": {
            "easy": [
                {
                    "question": "Which player has won the most NBA championships?",
                    "answers": [{"label": "A", "text": "Bill Russell"}, {"label": "B", "text": "Michael Jordan"}, {"label": "C", "text": "Kareem Abdul-Jabbar"}, {"label": "D", "text": "LeBron James"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "How many points is a three-pointer worth in basketball?",
                    "answers": [{"label": "A", "text": "2"}, {"label": "B", "text": "3"}, {"label": "C", "text": "4"}, {"label": "D", "text": "1"}],
                    "correctAnswer": "B",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": "Which team has won the most NBA championships?",
                    "answers": [{"label": "A", "text": "Boston Celtics"}, {"label": "B", "text": "Los Angeles Lakers"}, {"label": "C", "text": "Chicago Bulls"}, {"label": "D", "text": "Golden State Warriors"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "How many quarters are in a standard NBA game?",
                    "answers": [{"label": "A", "text": "3"}, {"label": "B", "text": "4"}, {"label": "C", "text": "5"}, {"label": "D", "text": "6"}],
                    "correctAnswer": "B",
                    "difficulty": "MEDIUM"
                }
            ],
            "hard": [
                {
                    "question": "What year was the NBA founded?",
                    "answers": [{"label": "A", "text": "1946"}, {"label": "B", "text": "1947"}, {"label": "C", "text": "1948"}, {"label": "D", "text": "1949"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Who holds the NBA record for most points scored in a single game?",
                    "answers": [{"label": "A", "text": "Wilt Chamberlain"}, {"label": "B", "text": "Kobe Bryant"}, {"label": "C", "text": "Michael Jordan"}, {"label": "D", "text": "LeBron James"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        },
        "tennis": {
            "easy": [
                {
                    "question": "How many Grand Slam tournaments are there in tennis?",
                    "answers": [{"label": "A", "text": "3"}, {"label": "B", "text": "4"}, {"label": "C", "text": "5"}, {"label": "D", "text": "6"}],
                    "correctAnswer": "B",
                    "difficulty": "EASY"
                },
                {
                    "question": "Which surface is Wimbledon played on?",
                    "answers": [{"label": "A", "text": "Clay"}, {"label": "B", "text": "Hard court"}, {"label": "C", "text": "Grass"}, {"label": "D", "text": "Carpet"}],
                    "correctAnswer": "C",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": "Who has won the most Grand Slam titles in men's tennis?",
                    "answers": [{"label": "A", "text": "Roger Federer"}, {"label": "B", "text": "Rafael Nadal"}, {"label": "C", "text": "Novak Djokovic"}, {"label": "D", "text": "Pete Sampras"}],
                    "correctAnswer": "C",
                    "difficulty": "MEDIUM"
                }
            ],
            "hard": [
                {
                    "question": "What year was the first Wimbledon tournament held?",
                    "answers": [{"label": "A", "text": "1877"}, {"label": "B", "text": "1887"}, {"label": "C", "text": "1897"}, {"label": "D", "text": "1907"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        }
    }
    
    sport_questions = fallback_questions.get(sport.lower(), {})
    level_questions = sport_questions.get(level.lower(), [])
    
    # If we don't have enough questions, duplicate some to reach 'count'
    while len(level_questions) < count:
        level_questions.extend(level_questions[:min(len(level_questions), count - len(level_questions))])
    
    # Extra safety: if still not enough, fill with generic questions
    if len(level_questions) < count:
        for i in range(count - len(level_questions)):
            level_questions.append({
                "question": f"Generic fallback question {i+1}",
                "answers": [
                    {"label": "A", "text": "Option 1"},
                    {"label": "B", "text": "Option 2"},
                    {"label": "C", "text": "Option 3"},
                    {"label": "D", "text": "Option 4"}
                ],
                "correctAnswer": "A",
                "difficulty": level.upper()
            })
    
    return level_questions[:count]

async def generate_ai_quiz(sport: str, level: str):
    QUESTION_COUNT = 5
    try:
        level = level.lower()
        
        # Simple prompt for AI generation
        prompt = f"""
Create {QUESTION_COUNT} {level.upper()} level questions about {sport.upper()}.
Each question should have 4 answer options (A, B, C, D) and one correct answer.

IMPORTANT: Focus on pure sports knowledge and AVOID questions about:
- Equipment, costs, or brands
- Player salaries, transfer fees, or contracts
- Team finances, revenue, or business operations
- Sponsorships or commercial partnerships
- Market values or investment aspects

Instead, focus on:
- Players, teams, and achievements
- Rules, tactics, and strategies
- Historical moments and records
- Statistics and competitions
- Controversial moments and outcomes

Return the questions in this JSON format:
[
  {{
    "question": "Question text here?",
    "answers": [
      {{ "label": "A", "text": "Answer option 1" }},
      {{ "label": "B", "text": "Answer option 2" }},
      {{ "label": "C", "text": "Answer option 3" }},
      {{ "label": "D", "text": "Answer option 4" }}
    ],
    "correctAnswer": "A",
    "difficulty": "{level.upper()}"
  }}
]
"""
        
        try:
            # Use semaphore to limit concurrent AI API calls
            async with ai_api_semaphore:
                api_key = get_next_api_key()
                chat = get_chat_for_key(api_key)
                # Run the blocking AI API call in a separate thread to prevent blocking the event loop
                # Add timeout to prevent hanging indefinitely
                response_text = await asyncio.wait_for(
                    asyncio.to_thread(lambda: chat.send_message(prompt).text),
                    timeout=30.0  # 30 second timeout
                )
            
            # Clean up markdown code blocks if they exist
            response_text = response_text.replace("```json", "").replace("```", "").strip()
            
            # Try to parse as JSON
            try:
                questions_list = json.loads(response_text)
            except json.JSONDecodeError:
                # Fallback to ast.literal_eval for Python literal format
                try:
                    questions_list = ast.literal_eval(response_text)
                except (ValueError, SyntaxError) as e:
                    print(f"Failed to parse AI response: {e}")
                    return generate_expanded_fallback_questions(sport, level, QUESTION_COUNT)
            
            # Validate the response structure
            if not isinstance(questions_list, list) or len(questions_list) != QUESTION_COUNT:
                print(f"Invalid response structure. Expected {QUESTION_COUNT} questions, got {len(questions_list) if isinstance(questions_list, list) else 'non-list'}")
                return generate_expanded_fallback_questions(sport, level, QUESTION_COUNT)
                
            # Validate each question
            valid_questions = []
            for i, question_data in enumerate(questions_list):
                if not isinstance(question_data, dict):
                    print(f"Invalid question format at index {i}")
                    continue
                
                required_fields = ["question", "answers", "correctAnswer"]
                missing_fields = [field for field in required_fields if field not in question_data]
                if missing_fields:
                    print(f"Missing required fields {missing_fields} in question {i}")
                    continue
                
                # Validate answers structure
                if not isinstance(question_data["answers"], list) or len(question_data["answers"]) != 4:
                    print(f"Invalid answers format in question {i}")
                    continue
                    
                # Add difficulty level if not present
                if "difficulty" not in question_data:
                    question_data["difficulty"] = level.upper()
                
                valid_questions.append(question_data)
               
            # If we don't have enough valid questions, use fallback
            if len(valid_questions) < QUESTION_COUNT:
                print(f"Only {len(valid_questions)} valid questions generated. Using fallback questions...")
                return generate_expanded_fallback_questions(sport, level, QUESTION_COUNT)
            
            # Filter out business-related questions (equipment, economics, contracts, etc.)
            filtered_questions = filter_business_questions(valid_questions)
            
            # If filtering removed too many questions, use fallback
            if len(filtered_questions) < 3:
                print(f"Too many business-related questions filtered out ({len(filtered_questions)} remaining). Using fallback questions...")
                return generate_expanded_fallback_questions(sport, level, QUESTION_COUNT)
            
            return filtered_questions[:QUESTION_COUNT]
            
        except Exception as e:
            print(f"Error generating AI quiz: {e}")
            return generate_expanded_fallback_questions(sport, level, QUESTION_COUNT)
        
    except Exception as e:
        print(f"Failed to generate quiz: {str(e)}")
        return generate_expanded_fallback_questions(sport, level, QUESTION_COUNT) 