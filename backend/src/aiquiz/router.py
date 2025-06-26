from .init import chat, get_next_api_key, get_chat_for_key
import ast
import random
import json
import hashlib
from datetime import datetime, timedelta
import asyncio
import logging
import time
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
    """Filter questions to ensure uniqueness within the current batch only"""
    random.shuffle(questions)
    unique_questions = []
    used_hashes = set()
    for question in questions:
        question_hash = get_question_hash(question)
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

def filter_questions_with_correct_answer(questions):
    filtered = []
    for q in questions:
        if 'correctAnswer' in q:
            filtered.append(q)
        else:
            print(f"[Warning] Skipping question missing 'correctAnswer': {q}")
    return filtered

def generate_expanded_fallback_questions(sport: str, level: str, count: int = 6, battle_id: str = None):
    """Generate fallback questions when AI generation fails, always returns 'count' questions with battle-specific uniqueness"""
    import time
    
    # Add battle-specific context for uniqueness
    battle_context = f"Battle {battle_id}" if battle_id else "Default"
    timestamp = int(time.time())
    
    # Create battle-specific variations of fallback questions
    def create_battle_specific_question(base_question, variation_index):
        """Create a battle-specific variation of a question"""
        question = base_question.copy()
        
        # Add battle context to question text
        if battle_id:
            question["question"] = f"[{battle_context}] {question['question']}"
        
        # Shuffle answer options for uniqueness
        answers = question['answers'].copy()
        random.shuffle(answers)
        question['answers'] = answers
        
        # Update correct answer to match new order
        correct_text = next((ans['text'] for ans in base_question['answers'] if ans['label'] == base_question['correctAnswer']), '')
        for ans in answers:
            if ans['text'] == correct_text:
                question['correctAnswer'] = ans['label']
                break
        
        # Add timestamp-based variation
        if variation_index > 0:
            question["question"] = f"{question['question']} (v{variation_index})"
        
        return question
    
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
                },
                {
                    "question": "Which country hosted the 2014 FIFA World Cup?",
                    "answers": [{"label": "A", "text": "Brazil"}, {"label": "B", "text": "Germany"}, {"label": "C", "text": "South Africa"}, {"label": "D", "text": "Russia"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "What is the duration of a standard football match?",
                    "answers": [{"label": "A", "text": "80 minutes"}, {"label": "B", "text": "90 minutes"}, {"label": "C", "text": "100 minutes"}, {"label": "D", "text": "120 minutes"}],
                    "correctAnswer": "B",
                    "difficulty": "EASY"
                },
                {
                    "question": "Which club has won the most UEFA Champions League titles?",
                    "answers": [{"label": "A", "text": "Real Madrid"}, {"label": "B", "text": "Barcelona"}, {"label": "C", "text": "Bayern Munich"}, {"label": "D", "text": "AC Milan"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": "Who won the Ballon d'Or in 2018?",
                    "answers": [{"label": "A", "text": "Luka Modrić"}, {"label": "B", "text": "Cristiano Ronaldo"}, {"label": "C", "text": "Lionel Messi"}, {"label": "D", "text": "Antoine Griezmann"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Which country won the first ever FIFA World Cup?",
                    "answers": [{"label": "A", "text": "Uruguay"}, {"label": "B", "text": "Brazil"}, {"label": "C", "text": "Italy"}, {"label": "D", "text": "Argentina"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Which English club is nicknamed 'The Red Devils'?",
                    "answers": [{"label": "A", "text": "Manchester United"}, {"label": "B", "text": "Liverpool"}, {"label": "C", "text": "Arsenal"}, {"label": "D", "text": "Chelsea"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "What year did the first FIFA World Cup take place?",
                    "answers": [{"label": "A", "text": "1930"}, {"label": "B", "text": "1934"}, {"label": "C", "text": "1938"}, {"label": "D", "text": "1950"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Which player has scored the most goals in World Cup history?",
                    "answers": [{"label": "A", "text": "Miroslav Klose"}, {"label": "B", "text": "Ronaldo"}, {"label": "C", "text": "Pelé"}, {"label": "D", "text": "Just Fontaine"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Which country has hosted the most World Cups?",
                    "answers": [{"label": "A", "text": "Brazil"}, {"label": "B", "text": "Germany"}, {"label": "C", "text": "France"}, {"label": "D", "text": "Italy"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                }
            ],
            "hard": [
                {
                    "question": "What was the original name of the FIFA World Cup trophy?",
                    "answers": [{"label": "A", "text": "Jules Rimet Trophy"}, {"label": "B", "text": "FIFA World Cup Trophy"}, {"label": "C", "text": "Victory Trophy"}, {"label": "D", "text": "Champions Trophy"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which player scored the fastest hat-trick in World Cup history?",
                    "answers": [{"label": "A", "text": "László Kiss"}, {"label": "B", "text": "Pelé"}, {"label": "C", "text": "Just Fontaine"}, {"label": "D", "text": "Gerd Müller"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "What year did the first European Championship take place?",
                    "answers": [{"label": "A", "text": "1960"}, {"label": "B", "text": "1964"}, {"label": "C", "text": "1968"}, {"label": "D", "text": "1972"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which country has won the most European Championships?",
                    "answers": [{"label": "A", "text": "Germany"}, {"label": "B", "text": "Spain"}, {"label": "C", "text": "France"}, {"label": "D", "text": "Italy"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "What is the record for most goals scored in a single World Cup tournament?",
                    "answers": [{"label": "A", "text": "13"}, {"label": "B", "text": "15"}, {"label": "C", "text": "17"}, {"label": "D", "text": "19"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which player has the most assists in World Cup history?",
                    "answers": [{"label": "A", "text": "Pelé"}, {"label": "B", "text": "Diego Maradona"}, {"label": "C", "text": "Zinedine Zidane"}, {"label": "D", "text": "Lothar Matthäus"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        },
        "basketball": {
            "easy": [
                {
                    "question": "How many players are on a basketball team during a game?",
                    "answers": [{"label": "A", "text": "4"}, {"label": "B", "text": "5"}, {"label": "C", "text": "6"}, {"label": "D", "text": "7"}],
                    "correctAnswer": "B",
                    "difficulty": "EASY"
                },
                {
                    "question": "Which NBA player is nicknamed 'The Greek Freak'?",
                    "answers": [{"label": "A", "text": "Giannis Antetokounmpo"}, {"label": "B", "text": "Kobe Bryant"}, {"label": "C", "text": "Shaquille O'Neal"}, {"label": "D", "text": "Dirk Nowitzki"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Which team drafted Michael Jordan in 1984?",
                    "answers": [{"label": "A", "text": "Chicago Bulls"}, {"label": "B", "text": "Portland Trail Blazers"}, {"label": "C", "text": "Houston Rockets"}, {"label": "D", "text": "Los Angeles Lakers"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "How many points is a three-pointer worth?",
                    "answers": [{"label": "A", "text": "2"}, {"label": "B", "text": "3"}, {"label": "C", "text": "4"}, {"label": "D", "text": "5"}],
                    "correctAnswer": "B",
                    "difficulty": "EASY"
                },
                {
                    "question": "Which country has won the most Olympic basketball gold medals?",
                    "answers": [{"label": "A", "text": "United States"}, {"label": "B", "text": "Soviet Union"}, {"label": "C", "text": "Yugoslavia"}, {"label": "D", "text": "Argentina"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "What year was the NBA founded?",
                    "answers": [{"label": "A", "text": "1946"}, {"label": "B", "text": "1947"}, {"label": "C", "text": "1948"}, {"label": "D", "text": "1949"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": "Which city hosted the first NBA All-Star Game?",
                    "answers": [{"label": "A", "text": "Boston"}, {"label": "B", "text": "New York"}, {"label": "C", "text": "Chicago"}, {"label": "D", "text": "Philadelphia"}],
                    "correctAnswer": "B",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Who holds the record for most three-pointers made in a single NBA season?",
                    "answers": [{"label": "A", "text": "Stephen Curry"}, {"label": "B", "text": "Ray Allen"}, {"label": "C", "text": "James Harden"}, {"label": "D", "text": "Klay Thompson"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Which player has won the most NBA championships?",
                    "answers": [{"label": "A", "text": "Bill Russell"}, {"label": "B", "text": "Michael Jordan"}, {"label": "C", "text": "Kareem Abdul-Jabbar"}, {"label": "D", "text": "LeBron James"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "What year did the NBA introduce the three-point line?",
                    "answers": [{"label": "A", "text": "1979"}, {"label": "B", "text": "1980"}, {"label": "C", "text": "1981"}, {"label": "D", "text": "1982"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Which team has won the most NBA championships?",
                    "answers": [{"label": "A", "text": "Boston Celtics"}, {"label": "B", "text": "Los Angeles Lakers"}, {"label": "C", "text": "Chicago Bulls"}, {"label": "D", "text": "Golden State Warriors"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Who is the NBA's all-time leading scorer?",
                    "answers": [{"label": "A", "text": "LeBron James"}, {"label": "B", "text": "Kareem Abdul-Jabbar"}, {"label": "C", "text": "Karl Malone"}, {"label": "D", "text": "Michael Jordan"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                }
            ],
            "hard": [
                {
                    "question": "What year did the NBA introduce the shot clock?",
                    "answers": [{"label": "A", "text": "1954"}, {"label": "B", "text": "1955"}, {"label": "C", "text": "1956"}, {"label": "D", "text": "1957"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which player has the highest career field goal percentage in NBA history?",
                    "answers": [{"label": "A", "text": "DeAndre Jordan"}, {"label": "B", "text": "Tyson Chandler"}, {"label": "C", "text": "Shaquille O'Neal"}, {"label": "D", "text": "Wilt Chamberlain"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "What year did the NBA introduce the three-point contest?",
                    "answers": [{"label": "A", "text": "1986"}, {"label": "B", "text": "1987"}, {"label": "C", "text": "1988"}, {"label": "D", "text": "1989"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which player has the most career assists in NBA history?",
                    "answers": [{"label": "A", "text": "John Stockton"}, {"label": "B", "text": "Jason Kidd"}, {"label": "C", "text": "Steve Nash"}, {"label": "D", "text": "Magic Johnson"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "What year did the NBA introduce the slam dunk contest?",
                    "answers": [{"label": "A", "text": "1984"}, {"label": "B", "text": "1985"}, {"label": "C", "text": "1986"}, {"label": "D", "text": "1987"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which player has the most career steals in NBA history?",
                    "answers": [{"label": "A", "text": "John Stockton"}, {"label": "B", "text": "Jason Kidd"}, {"label": "C", "text": "Michael Jordan"}, {"label": "D", "text": "Gary Payton"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        },
        "tennis": {
            "easy": [
                {
                    "question": "How many players are in a tennis singles match?",
                    "answers": [{"label": "A", "text": "1"}, {"label": "B", "text": "2"}, {"label": "C", "text": "3"}, {"label": "D", "text": "4"}],
                    "correctAnswer": "B",
                    "difficulty": "EASY"
                },
                {
                    "question": "Which Grand Slam tournament is played on grass?",
                    "answers": [{"label": "A", "text": "Wimbledon"}, {"label": "B", "text": "US Open"}, {"label": "C", "text": "French Open"}, {"label": "D", "text": "Australian Open"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Who has won the most Grand Slam singles titles?",
                    "answers": [{"label": "A", "text": "Margaret Court"}, {"label": "B", "text": "Serena Williams"}, {"label": "C", "text": "Steffi Graf"}, {"label": "D", "text": "Martina Navratilova"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "What is the scoring system in tennis?",
                    "answers": [{"label": "A", "text": "Love, 15, 30, 40"}, {"label": "B", "text": "1, 2, 3, 4"}, {"label": "C", "text": "0, 1, 2, 3"}, {"label": "D", "text": "A, B, C, D"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Which country has won the most Davis Cup titles?",
                    "answers": [{"label": "A", "text": "United States"}, {"label": "B", "text": "Australia"}, {"label": "C", "text": "Great Britain"}, {"label": "D", "text": "France"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "What year was the first Wimbledon tournament held?",
                    "answers": [{"label": "A", "text": "1877"}, {"label": "B", "text": "1887"}, {"label": "C", "text": "1897"}, {"label": "D", "text": "1907"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": "Which female player has won the most Wimbledon singles titles?",
                    "answers": [{"label": "A", "text": "Martina Navratilova"}, {"label": "B", "text": "Serena Williams"}, {"label": "C", "text": "Steffi Graf"}, {"label": "D", "text": "Venus Williams"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "What is a 'bagel' in tennis?",
                    "answers": [{"label": "A", "text": "A 6-0 set"}, {"label": "B", "text": "A 7-5 set"}, {"label": "C", "text": "A tiebreak"}, {"label": "D", "text": "A double fault"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Which player completed the Golden Slam in 1988?",
                    "answers": [{"label": "A", "text": "Steffi Graf"}, {"label": "B", "text": "Serena Williams"}, {"label": "C", "text": "Martina Navratilova"}, {"label": "D", "text": "Monica Seles"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "What year did the US Open move to Flushing Meadows?",
                    "answers": [{"label": "A", "text": "1978"}, {"label": "B", "text": "1979"}, {"label": "C", "text": "1980"}, {"label": "D", "text": "1981"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Which player has won the most Australian Open titles?",
                    "answers": [{"label": "A", "text": "Novak Djokovic"}, {"label": "B", "text": "Roger Federer"}, {"label": "C", "text": "Rafael Nadal"}, {"label": "D", "text": "Pete Sampras"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "What year did tennis become an Olympic sport?",
                    "answers": [{"label": "A", "text": "1896"}, {"label": "B", "text": "1900"}, {"label": "C", "text": "1904"}, {"label": "D", "text": "1908"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                }
            ],
            "hard": [
                {
                    "question": "What year did the French Open become a Grand Slam tournament?",
                    "answers": [{"label": "A", "text": "1925"}, {"label": "B", "text": "1926"}, {"label": "C", "text": "1927"}, {"label": "D", "text": "1928"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which player has the highest career winning percentage in Grand Slam matches?",
                    "answers": [{"label": "A", "text": "Margaret Court"}, {"label": "B", "text": "Serena Williams"}, {"label": "C", "text": "Steffi Graf"}, {"label": "D", "text": "Martina Navratilova"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "What year did the Australian Open move to Melbourne Park?",
                    "answers": [{"label": "A", "text": "1988"}, {"label": "B", "text": "1989"}, {"label": "C", "text": "1990"}, {"label": "D", "text": "1991"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which player has won the most consecutive Grand Slam titles?",
                    "answers": [{"label": "A", "text": "Don Budge"}, {"label": "B", "text": "Rod Laver"}, {"label": "C", "text": "Roger Federer"}, {"label": "D", "text": "Rafael Nadal"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "What year did the US Open introduce the tiebreak?",
                    "answers": [{"label": "A", "text": "1970"}, {"label": "B", "text": "1971"}, {"label": "C", "text": "1972"}, {"label": "D", "text": "1973"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which player has the most career aces in Grand Slam tournaments?",
                    "answers": [{"label": "A", "text": "Ivo Karlović"}, {"label": "B", "text": "John Isner"}, {"label": "C", "text": "Roger Federer"}, {"label": "D", "text": "Pete Sampras"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        }
    }
    
    sport_questions = fallback_questions.get(sport.lower(), {})
    level_questions = sport_questions.get(level.lower(), [])
    
    # Create battle-specific variations of the questions
    battle_specific_questions = []
    for i, base_question in enumerate(level_questions):
        # Create multiple variations for uniqueness
        for variation in range(3):  # Create 3 variations per question
            battle_question = create_battle_specific_question(base_question, variation)
            battle_specific_questions.append(battle_question)
    
    # Shuffle and select the required number of questions
    random.shuffle(battle_specific_questions)
    selected_questions = battle_specific_questions[:count]
    
    # If we don't have enough questions, create more variations
    while len(selected_questions) < count:
        for base_question in level_questions:
            if len(selected_questions) >= count:
                break
            variation = len(selected_questions) + 1
            battle_question = create_battle_specific_question(base_question, variation)
            selected_questions.append(battle_question)
    
    # Ensure all questions are unique by hash
    unique_questions = get_unique_questions(selected_questions, sport, level, count)
    
    # If still not enough, fill with generic unique questions
    if len(unique_questions) < count:
        logging.warning(f"[generate_expanded_fallback_questions] Only {len(unique_questions)} unique fallback questions for {sport}/{level}. Filling with generic questions.")
        for i in range(count - len(unique_questions)):
            unique_questions.append({
                "question": f"[{battle_context}] Generic fallback question {i+1} (t{timestamp})",
                "answers": [
                    {"label": "A", "text": "Option 1"},
                    {"label": "B", "text": "Option 2"},
                    {"label": "C", "text": "Option 3"},
                    {"label": "D", "text": "Option 4"}
                ],
                "correctAnswer": "A",
                "difficulty": level.upper()
            })
    
    return unique_questions[:count]

async def generate_ai_quiz(sport: str, level: str, count: int = 5, battle_id: str = None):
    QUESTION_COUNT = count
    try:
        level = level.lower()
        logger = logging.getLogger(__name__)
        logger.info(f"[AIQUIZ] Starting quiz generation for {sport}/{level}, count={QUESTION_COUNT}, battle_id={battle_id}")
        
        # Add battle-specific context for uniqueness
        battle_context = f"Battle {battle_id}" if battle_id else "Default Battle"
        current_timestamp = int(time.time())
        
        # Enhanced prompt for better quiz generation with battle-specific uniqueness
        prompt = f"""
Generate a quiz with {QUESTION_COUNT} multiple-choice questions about {sport.upper()}, categorized by difficulty: easy, medium, and hard. Each question should be directly related to the sport — rules, players, history, events, or tactics. Format each question with 4 options and mark the correct answer.

BATTLE CONTEXT: {battle_context}
TIMESTAMP: {current_timestamp}

IMPORTANT REQUIREMENTS:
- Each question must have exactly 4 answer options (A, B, C, D) and only one correct answer
- Focus on sports facts, rules, history, records, players, and tactics
- Avoid business, finance, sponsorship, or commercial topics
- Mix difficulty levels appropriately for {level.upper()} level
- Questions should be engaging and test real sports knowledge
- CRITICAL: Generate completely unique questions for this specific battle context
- Use the timestamp and battle context to ensure no repetition with previous battles

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
- Recent developments and current events
- Controversial moments and decisions
- Statistical records and milestones

UNIQUENESS STRATEGY:
- Use specific years, dates, and time periods
- Reference specific players, teams, or events
- Include detailed statistics and records
- Mention specific tournaments, championships, or competitions
- Reference specific rules or regulations
- Use current events and recent developments
- Vary question structure and phrasing
- Use different difficulty distributions

Return as a JSON array in this format:
[
  {{
    "question": "Question text?",
    "answers": [
      {{ "label": "A", "text": "Answer 1" }},
      {{ "label": "B", "text": "Answer 2" }},
      {{ "label": "C", "text": "Answer 3" }},
      {{ "label": "D", "text": "Answer 4" }}
    ],
    "correctAnswer": "A/B/C/D",
    "difficulty": "easy/medium/hard"
  }}
]
"""
        try:
            # Use semaphore to limit concurrent AI API calls
            async with ai_api_semaphore:
                api_key = get_next_api_key()
                chat = get_chat_for_key(api_key)
                try:
                    response_text = await asyncio.wait_for(
                        asyncio.to_thread(lambda: chat.send_message(prompt).text),
                        timeout=8.0
                    )
                except asyncio.TimeoutError:
                    logger.warning(f"[AIQUIZ] AI generation timed out after 8 seconds for {sport}/{level}. Using fallback.")
                    fallback = generate_expanded_fallback_questions(sport, level, 1, battle_id)
                    return [*generate_expanded_fallback_questions(sport, level, QUESTION_COUNT, battle_id), *fallback]
            response_text = response_text.replace("```json", "").replace("```", "").strip()
            try:
                questions_list = json.loads(response_text)
            except json.JSONDecodeError:
                try:
                    questions_list = ast.literal_eval(response_text)
                except (ValueError, SyntaxError) as e:
                    logger.warning(f"[AIQUIZ] Failed to parse AI response: {e}. Using fallback.")
                    fallback = generate_expanded_fallback_questions(sport, level, 1, battle_id)
                    return [*generate_expanded_fallback_questions(sport, level, QUESTION_COUNT, battle_id), *fallback]
            # Validate the response structure
            if not isinstance(questions_list, list) or len(questions_list) != QUESTION_COUNT:
                logger.warning(f"[AIQUIZ] Invalid AI response structure. Using fallback.")
                fallback = generate_expanded_fallback_questions(sport, level, 1, battle_id)
                return [*generate_expanded_fallback_questions(sport, level, QUESTION_COUNT, battle_id), *fallback]
            # Validate each question
            valid_questions = []
            for i, question_data in enumerate(questions_list):
                if not isinstance(question_data, dict):
                    continue
                required_fields = ["question", "answers", "correctAnswer"]
                missing_fields = [field for field in required_fields if field not in question_data]
                if missing_fields:
                    continue
                if not isinstance(question_data["answers"], list) or len(question_data["answers"]) != 4:
                    continue
                if "difficulty" not in question_data:
                    question_data["difficulty"] = level.upper()
                valid_questions.append(question_data)
            if len(valid_questions) < QUESTION_COUNT:
                logger.warning(f"[AIQUIZ] Only {len(valid_questions)} valid AI questions. Using fallback.")
                fallback = generate_expanded_fallback_questions(sport, level, 1, battle_id)
                return [*generate_expanded_fallback_questions(sport, level, QUESTION_COUNT, battle_id), *fallback]
            filtered_questions = filter_business_questions(valid_questions)
            if len(filtered_questions) < 3:
                logger.warning(f"[AIQUIZ] Too many business-related questions filtered out. Using fallback.")
                fallback = generate_expanded_fallback_questions(sport, level, 1, battle_id)
                return [*generate_expanded_fallback_questions(sport, level, QUESTION_COUNT, battle_id), *fallback]
            unique_questions = get_unique_questions(filtered_questions, sport, level, QUESTION_COUNT)
            fallback = generate_expanded_fallback_questions(sport, level, 1, battle_id)
            logger.info(f"[AIQUIZ] Successfully generated {len(unique_questions)} AI questions and 1 fallback for {sport}/{level} with battle_id={battle_id}.")
            return unique_questions[:QUESTION_COUNT] + fallback
        except Exception as e:
            logger.error(f"[AIQUIZ] Error generating AI quiz: {e}. Using fallback.")
            fallback = generate_expanded_fallback_questions(sport, level, 1, battle_id)
            return [*generate_expanded_fallback_questions(sport, level, QUESTION_COUNT, battle_id), *fallback]
    except Exception as e:
        logger.error(f"[AIQUIZ] Failed to generate quiz: {str(e)}. Using fallback.")
        fallback = generate_expanded_fallback_questions(sport, level, 1, battle_id)
        return [*generate_expanded_fallback_questions(sport, level, QUESTION_COUNT, battle_id), *fallback] 