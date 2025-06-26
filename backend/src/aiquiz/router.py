from .init import chat, get_next_api_key, get_chat_for_key
import ast
import random
import json
import hashlib
from datetime import datetime, timedelta
import asyncio
import logging
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

def generate_expanded_fallback_questions(sport: str, level: str, count: int = 6):
    """Generate fallback questions when AI generation fails, always returns 'count' questions"""
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
                    "question": "What is the maximum number of substitutes allowed in a football match?",
                    "answers": [{"label": "A", "text": "3"}, {"label": "B", "text": "5"}, {"label": "C", "text": "7"}, {"label": "D", "text": "2"}],
                    "correctAnswer": "B",
                    "difficulty": "EASY"
                },
                {
                    "question": "Which player is known as 'El Fenómeno'?",
                    "answers": [{"label": "A", "text": "Ronaldo Nazário"}, {"label": "B", "text": "Ronaldinho"}, {"label": "C", "text": "Neymar"}, {"label": "D", "text": "Romário"}],
                    "correctAnswer": "A",
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
                },
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
                    "question": "Who scored the 'Hand of God' goal?",
                    "answers": [{"label": "A", "text": "Diego Maradona"}, {"label": "B", "text": "Pelé"}, {"label": "C", "text": "Zinedine Zidane"}, {"label": "D", "text": "David Beckham"}],
                    "correctAnswer": "A",
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
                },
                {
                    "question": "Which country won the UEFA Euro 2004?",
                    "answers": [{"label": "A", "text": "Greece"}, {"label": "B", "text": "Portugal"}, {"label": "C", "text": "France"}, {"label": "D", "text": "Spain"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Who was the top scorer in the 2014 FIFA World Cup?",
                    "answers": [{"label": "A", "text": "James Rodríguez"}, {"label": "B", "text": "Thomas Müller"}, {"label": "C", "text": "Lionel Messi"}, {"label": "D", "text": "Neymar"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which club did Zinedine Zidane play for before joining Real Madrid?",
                    "answers": [{"label": "A", "text": "Juventus"}, {"label": "B", "text": "Bordeaux"}, {"label": "C", "text": "Monaco"}, {"label": "D", "text": "Marseille"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Who won the Golden Boot at the 2018 FIFA World Cup?",
                    "answers": [{"label": "A", "text": "Harry Kane"}, {"label": "B", "text": "Antoine Griezmann"}, {"label": "C", "text": "Romelu Lukaku"}, {"label": "D", "text": "Kylian Mbappé"}],
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
                },
                {
                    "question": "Which team is known as the 'Showtime' team in the NBA?",
                    "answers": [{"label": "A", "text": "Los Angeles Lakers"}, {"label": "B", "text": "Boston Celtics"}, {"label": "C", "text": "Chicago Bulls"}, {"label": "D", "text": "Miami Heat"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Who is the NBA's all-time leading scorer?",
                    "answers": [{"label": "A", "text": "Kareem Abdul-Jabbar"}, {"label": "B", "text": "LeBron James"}, {"label": "C", "text": "Karl Malone"}, {"label": "D", "text": "Michael Jordan"}],
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
                },
                {
                    "question": "Who was the first player to record a quadruple-double in the NBA?",
                    "answers": [{"label": "A", "text": "Nate Thurmond"}, {"label": "B", "text": "Hakeem Olajuwon"}, {"label": "C", "text": "David Robinson"}, {"label": "D", "text": "Alvin Robertson"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Which NBA player is known as 'The Answer'?",
                    "answers": [{"label": "A", "text": "Allen Iverson"}, {"label": "B", "text": "Shaquille O'Neal"}, {"label": "C", "text": "Kobe Bryant"}, {"label": "D", "text": "Tim Duncan"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
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
                },
                {
                    "question": "Which player won NBA MVP and Defensive Player of the Year in the same season?",
                    "answers": [{"label": "A", "text": "Michael Jordan"}, {"label": "B", "text": "Hakeem Olajuwon"}, {"label": "C", "text": "Giannis Antetokounmpo"}, {"label": "D", "text": "David Robinson"}],
                    "correctAnswer": "B",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which team drafted Dirk Nowitzki?",
                    "answers": [{"label": "A", "text": "Milwaukee Bucks"}, {"label": "B", "text": "Dallas Mavericks"}, {"label": "C", "text": "San Antonio Spurs"}, {"label": "D", "text": "Houston Rockets"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Who was the first non-US born player to win NBA MVP?",
                    "answers": [{"label": "A", "text": "Hakeem Olajuwon"}, {"label": "B", "text": "Dirk Nowitzki"}, {"label": "C", "text": "Giannis Antetokounmpo"}, {"label": "D", "text": "Steve Nash"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which player has the most career triple-doubles in NBA history?",
                    "answers": [{"label": "A", "text": "Russell Westbrook"}, {"label": "B", "text": "Oscar Robertson"}, {"label": "C", "text": "Magic Johnson"}, {"label": "D", "text": "Jason Kidd"}],
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
                },
                {
                    "question": "Who has won the most Grand Slam singles titles in women's tennis?",
                    "answers": [{"label": "A", "text": "Serena Williams"}, {"label": "B", "text": "Steffi Graf"}, {"label": "C", "text": "Margaret Court"}, {"label": "D", "text": "Martina Navratilova"}],
                    "correctAnswer": "C",
                    "difficulty": "EASY"
                },
                {
                    "question": "Which male player has won the most French Open titles?",
                    "answers": [{"label": "A", "text": "Rafael Nadal"}, {"label": "B", "text": "Roger Federer"}, {"label": "C", "text": "Novak Djokovic"}, {"label": "D", "text": "Pete Sampras"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "What is the term for a score of zero in tennis?",
                    "answers": [{"label": "A", "text": "Love"}, {"label": "B", "text": "Deuce"}, {"label": "C", "text": "Ace"}, {"label": "D", "text": "Break"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Which tournament is played on clay courts?",
                    "answers": [{"label": "A", "text": "French Open"}, {"label": "B", "text": "Wimbledon"}, {"label": "C", "text": "US Open"}, {"label": "D", "text": "Australian Open"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": "Who has won the most Grand Slam titles in men's tennis?",
                    "answers": [{"label": "A", "text": "Roger Federer"}, {"label": "B", "text": "Rafael Nadal"}, {"label": "C", "text": "Novak Djokovic"}, {"label": "D", "text": "Pete Sampras"}],
                    "correctAnswer": "C",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Which country hosts the Australian Open?",
                    "answers": [{"label": "A", "text": "Australia"}, {"label": "B", "text": "USA"}, {"label": "C", "text": "France"}, {"label": "D", "text": "UK"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Who is known as the 'King of Clay'?",
                    "answers": [{"label": "A", "text": "Rafael Nadal"}, {"label": "B", "text": "Roger Federer"}, {"label": "C", "text": "Novak Djokovic"}, {"label": "D", "text": "Andy Murray"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
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
                }
            ],
            "hard": [
                {
                    "question": "What year was the first Wimbledon tournament held?",
                    "answers": [{"label": "A", "text": "1877"}, {"label": "B", "text": "1887"}, {"label": "C", "text": "1897"}, {"label": "D", "text": "1907"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Who was the first male player to win all four Grand Slam tournaments in a single year?",
                    "answers": [{"label": "A", "text": "Don Budge"}, {"label": "B", "text": "Rod Laver"}, {"label": "C", "text": "Roy Emerson"}, {"label": "D", "text": "Fred Perry"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which country has produced the most men's Grand Slam singles champions?",
                    "answers": [{"label": "A", "text": "USA"}, {"label": "B", "text": "Australia"}, {"label": "C", "text": "UK"}, {"label": "D", "text": "France"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Who won the men's singles gold medal at the 2008 Beijing Olympics?",
                    "answers": [{"label": "A", "text": "Rafael Nadal"}, {"label": "B", "text": "Roger Federer"}, {"label": "C", "text": "Novak Djokovic"}, {"label": "D", "text": "Andy Murray"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which player has the most career ATP singles titles?",
                    "answers": [{"label": "A", "text": "Jimmy Connors"}, {"label": "B", "text": "Roger Federer"}, {"label": "C", "text": "Ivan Lendl"}, {"label": "D", "text": "Rafael Nadal"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Who was the youngest player to win a Grand Slam singles title?",
                    "answers": [{"label": "A", "text": "Martina Hingis"}, {"label": "B", "text": "Monica Seles"}, {"label": "C", "text": "Steffi Graf"}, {"label": "D", "text": "Serena Williams"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        },
        "cricket": {
            "easy": [
                {"question": "How many players are there in a cricket team?", "answers": [{"label": "A", "text": "9"}, {"label": "B", "text": "10"}, {"label": "C", "text": "11"}, {"label": "D", "text": "12"}], "correctAnswer": "C", "difficulty": "EASY"},
                {"question": "What is it called when a batsman is out without scoring any runs?", "answers": [{"label": "A", "text": "Duck"}, {"label": "B", "text": "Goose"}, {"label": "C", "text": "Swan"}, {"label": "D", "text": "Eagle"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "Which country won the first Cricket World Cup?", "answers": [{"label": "A", "text": "India"}, {"label": "B", "text": "Australia"}, {"label": "C", "text": "West Indies"}, {"label": "D", "text": "England"}], "correctAnswer": "C", "difficulty": "EASY"},
                {"question": "What is the maximum number of overs in a T20 match?", "answers": [{"label": "A", "text": "10"}, {"label": "B", "text": "20"}, {"label": "C", "text": "50"}, {"label": "D", "text": "40"}], "correctAnswer": "B", "difficulty": "EASY"},
                {"question": "What is the area in the center of the cricket field called?", "answers": [{"label": "A", "text": "Pitch"}, {"label": "B", "text": "Court"}, {"label": "C", "text": "Track"}, {"label": "D", "text": "Lane"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "Which piece of equipment is used by the wicketkeeper?", "answers": [{"label": "A", "text": "Bat"}, {"label": "B", "text": "Gloves"}, {"label": "C", "text": "Helmet"}, {"label": "D", "text": "Pads"}], "correctAnswer": "B", "difficulty": "EASY"}
            ],
            "medium": [
                {"question": "Who is known as the 'God of Cricket'?", "answers": [{"label": "A", "text": "Sachin Tendulkar"}, {"label": "B", "text": "Ricky Ponting"}, {"label": "C", "text": "Brian Lara"}, {"label": "D", "text": "Virat Kohli"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "How many runs is a boundary worth if the ball crosses the rope after touching the ground?", "answers": [{"label": "A", "text": "4"}, {"label": "B", "text": "6"}, {"label": "C", "text": "2"}, {"label": "D", "text": "1"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "Which bowler has taken the most wickets in Test cricket?", "answers": [{"label": "A", "text": "Shane Warne"}, {"label": "B", "text": "Muttiah Muralitharan"}, {"label": "C", "text": "James Anderson"}, {"label": "D", "text": "Anil Kumble"}], "correctAnswer": "B", "difficulty": "MEDIUM"},
                {"question": "What is the term for three wickets in three consecutive balls?", "answers": [{"label": "A", "text": "Hat-trick"}, {"label": "B", "text": "Triple"}, {"label": "C", "text": "Treble"}, {"label": "D", "text": "Trio"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "Which country hosts the IPL?", "answers": [{"label": "A", "text": "Australia"}, {"label": "B", "text": "India"}, {"label": "C", "text": "England"}, {"label": "D", "text": "South Africa"}], "correctAnswer": "B", "difficulty": "MEDIUM"},
                {"question": "Who was the first captain to win the Cricket World Cup twice?", "answers": [{"label": "A", "text": "Clive Lloyd"}, {"label": "B", "text": "Ricky Ponting"}, {"label": "C", "text": "MS Dhoni"}, {"label": "D", "text": "Imran Khan"}], "correctAnswer": "B", "difficulty": "MEDIUM"}
            ],
            "hard": [
                {"question": "Which cricketer has scored the most double centuries in Test cricket?", "answers": [{"label": "A", "text": "Don Bradman"}, {"label": "B", "text": "Brian Lara"}, {"label": "C", "text": "Kumar Sangakkara"}, {"label": "D", "text": "Sachin Tendulkar"}], "correctAnswer": "C", "difficulty": "HARD"},
                {"question": "Who bowled the fastest recorded delivery in cricket?", "answers": [{"label": "A", "text": "Shoaib Akhtar"}, {"label": "B", "text": "Brett Lee"}, {"label": "C", "text": "Jeff Thomson"}, {"label": "D", "text": "Shaun Tait"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Which country won the first T20 World Cup?", "answers": [{"label": "A", "text": "India"}, {"label": "B", "text": "Pakistan"}, {"label": "C", "text": "Australia"}, {"label": "D", "text": "England"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Who was the first batsman to score 10,000 runs in ODIs?", "answers": [{"label": "A", "text": "Sachin Tendulkar"}, {"label": "B", "text": "Viv Richards"}, {"label": "C", "text": "Sunil Gavaskar"}, {"label": "D", "text": "Brian Lara"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "What is the term for a score of 111 in cricket?", "answers": [{"label": "A", "text": "Nelson"}, {"label": "B", "text": "Century"}, {"label": "C", "text": "Half-century"}, {"label": "D", "text": "Duck"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Who is the only player to captain and keep wicket in a World Cup final?", "answers": [{"label": "A", "text": "MS Dhoni"}, {"label": "B", "text": "Adam Gilchrist"}, {"label": "C", "text": "Kumar Sangakkara"}, {"label": "D", "text": "Alec Stewart"}], "correctAnswer": "A", "difficulty": "HARD"}
            ]
        },
        "baseball": {
            "easy": [
                {"question": "How many bases are there on a baseball field?", "answers": [{"label": "A", "text": "3"}, {"label": "B", "text": "4"}, {"label": "C", "text": "5"}, {"label": "D", "text": "6"}], "correctAnswer": "B", "difficulty": "EASY"},
                {"question": "What is it called when a batter hits the ball out of the park in fair territory?", "answers": [{"label": "A", "text": "Home run"}, {"label": "B", "text": "Triple"}, {"label": "C", "text": "Double"}, {"label": "D", "text": "Single"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "How many players are on a baseball team?", "answers": [{"label": "A", "text": "7"}, {"label": "B", "text": "8"}, {"label": "C", "text": "9"}, {"label": "D", "text": "10"}], "correctAnswer": "C", "difficulty": "EASY"},
                {"question": "What is the area where pitchers warm up called?", "answers": [{"label": "A", "text": "Bullpen"}, {"label": "B", "text": "Dugout"}, {"label": "C", "text": "Outfield"}, {"label": "D", "text": "Infield"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "Which base must a runner touch last to score a run?", "answers": [{"label": "A", "text": "First base"}, {"label": "B", "text": "Second base"}, {"label": "C", "text": "Third base"}, {"label": "D", "text": "Home plate"}], "correctAnswer": "D", "difficulty": "EASY"},
                {"question": "What is the term for three strikes in a row?", "answers": [{"label": "A", "text": "Strikeout"}, {"label": "B", "text": "Walk"}, {"label": "C", "text": "Hit"}, {"label": "D", "text": "Run"}], "correctAnswer": "A", "difficulty": "EASY"}
            ],
            "medium": [
                {"question": "Who holds the record for most home runs in a single MLB season?", "answers": [{"label": "A", "text": "Barry Bonds"}, {"label": "B", "text": "Babe Ruth"}, {"label": "C", "text": "Mark McGwire"}, {"label": "D", "text": "Sammy Sosa"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "What is the distance between bases in Major League Baseball?", "answers": [{"label": "A", "text": "60 feet"}, {"label": "B", "text": "90 feet"}, {"label": "C", "text": "100 feet"}, {"label": "D", "text": "120 feet"}], "correctAnswer": "B", "difficulty": "MEDIUM"},
                {"question": "Which team has won the most World Series titles?", "answers": [{"label": "A", "text": "New York Yankees"}, {"label": "B", "text": "Boston Red Sox"}, {"label": "C", "text": "Los Angeles Dodgers"}, {"label": "D", "text": "Chicago Cubs"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "What is a 'grand slam' in baseball?", "answers": [{"label": "A", "text": "A home run with bases loaded"}, {"label": "B", "text": "A triple play"}, {"label": "C", "text": "A double play"}, {"label": "D", "text": "A no-hitter"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "Who is known as the 'Sultan of Swat'?", "answers": [{"label": "A", "text": "Babe Ruth"}, {"label": "B", "text": "Lou Gehrig"}, {"label": "C", "text": "Willie Mays"}, {"label": "D", "text": "Hank Aaron"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "Which position does the player who throws the ball to the batter play?", "answers": [{"label": "A", "text": "Pitcher"}, {"label": "B", "text": "Catcher"}, {"label": "C", "text": "Shortstop"}, {"label": "D", "text": "First baseman"}], "correctAnswer": "A", "difficulty": "MEDIUM"}
            ],
            "hard": [
                {"question": "Who was the first African American to play in Major League Baseball?", "answers": [{"label": "A", "text": "Jackie Robinson"}, {"label": "B", "text": "Satchel Paige"}, {"label": "C", "text": "Willie Mays"}, {"label": "D", "text": "Hank Aaron"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Which pitcher has the most career strikeouts in MLB history?", "answers": [{"label": "A", "text": "Nolan Ryan"}, {"label": "B", "text": "Randy Johnson"}, {"label": "C", "text": "Roger Clemens"}, {"label": "D", "text": "Greg Maddux"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "What is the rarest play in baseball?", "answers": [{"label": "A", "text": "Unassisted triple play"}, {"label": "B", "text": "Grand slam"}, {"label": "C", "text": "No-hitter"}, {"label": "D", "text": "Perfect game"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Who was the first player to hit 700 home runs?", "answers": [{"label": "A", "text": "Babe Ruth"}, {"label": "B", "text": "Barry Bonds"}, {"label": "C", "text": "Hank Aaron"}, {"label": "D", "text": "Alex Rodriguez"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Which team won the first World Series?", "answers": [{"label": "A", "text": "Boston Americans"}, {"label": "B", "text": "New York Yankees"}, {"label": "C", "text": "Chicago Cubs"}, {"label": "D", "text": "Brooklyn Dodgers"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Who holds the record for most RBIs in a single season?", "answers": [{"label": "A", "text": "Hack Wilson"}, {"label": "B", "text": "Lou Gehrig"}, {"label": "C", "text": "Babe Ruth"}, {"label": "D", "text": "Albert Pujols"}], "correctAnswer": "A", "difficulty": "HARD"}
            ]
        },
        "hockey": {
            "easy": [
                {"question": "How many players are there on an ice hockey team?", "answers": [{"label": "A", "text": "5"}, {"label": "B", "text": "6"}, {"label": "C", "text": "7"}, {"label": "D", "text": "8"}], "correctAnswer": "B", "difficulty": "EASY"},
                {"question": "What is the term for a score of zero in hockey?", "answers": [{"label": "A", "text": "Love"}, {"label": "B", "text": "Deuce"}, {"label": "C", "text": "Ace"}, {"label": "D", "text": "Break"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "Which country won the first Olympic ice hockey tournament?", "answers": [{"label": "A", "text": "Canada"}, {"label": "B", "text": "Russia"}, {"label": "C", "text": "Sweden"}, {"label": "D", "text": "Finland"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "What is the term for a score of 100 in hockey?", "answers": [{"label": "A", "text": "Century"}, {"label": "B", "text": "Hundred"}, {"label": "C", "text": "Duck"}, {"label": "D", "text": "Break"}], "correctAnswer": "B", "difficulty": "EASY"},
                {"question": "Which player is known as the 'Great One'?", "answers": [{"label": "A", "text": "Wayne Gretzky"}, {"label": "B", "text": "Mario Lemieux"}, {"label": "C", "text": "Mark Messier"}, {"label": "D", "text": "Bobby Orr"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "Which team drafted Wayne Gretzky in 1979?", "answers": [{"label": "A", "text": "Edmonton Oilers"}, {"label": "B", "text": "New York Rangers"}, {"label": "C", "text": "Toronto Maple Leafs"}, {"label": "D", "text": "Montreal Canadiens"}], "correctAnswer": "A", "difficulty": "EASY"}
            ],
            "medium": [
                {"question": "Which team has won the most Stanley Cups?", "answers": [{"label": "A", "text": "Montreal Canadiens"}, {"label": "B", "text": "Toronto Maple Leafs"}, {"label": "C", "text": "Edmonton Oilers"}, {"label": "D", "text": "Detroit Red Wings"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "How many periods are in a standard ice hockey game?", "answers": [{"label": "A", "text": "2"}, {"label": "B", "text": "3"}, {"label": "C", "text": "4"}, {"label": "D", "text": "5"}], "correctAnswer": "B", "difficulty": "MEDIUM"},
                {"question": "Who was the first player to score 1,000 points in a single NHL season?", "answers": [{"label": "A", "text": "Wayne Gretzky"}, {"label": "B", "text": "Mario Lemieux"}, {"label": "C", "text": "Mark Messier"}, {"label": "D", "text": "Bobby Orr"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "What is a 'hat trick' in hockey?", "answers": [{"label": "A", "text": "Scoring three goals in a single game"}, {"label": "B", "text": "Scoring three assists in a single game"}, {"label": "C", "text": "Scoring three penalties in a single game"}, {"label": "D", "text": "Scoring three points in a single game"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "Which player is known as the 'Great Wall of China'?", "answers": [{"label": "A", "text": "Liu Shaoqi"}, {"label": "B", "text": "Deng Xiaoping"}, {"label": "C", "text": "Mao Zedong"}, {"label": "D", "text": "Zhou Enlai"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "Which team drafted Liu Shaoqi in 1979?", "answers": [{"label": "A", "text": "Harbin Tigers"}, {"label": "B", "text": "Beijing Ducks"}, {"label": "C", "text": "Shanghai Sharks"}, {"label": "D", "text": "Tianjin Dragons"}], "correctAnswer": "A", "difficulty": "MEDIUM"}
            ],
            "hard": [
                {"question": "What year was the NHL founded?", "answers": [{"label": "A", "text": "1917"}, {"label": "B", "text": "1926"}, {"label": "C", "text": "1932"}, {"label": "D", "text": "1946"}], "correctAnswer": "B", "difficulty": "HARD"},
                {"question": "Who holds the NHL record for most points scored in a single game?", "answers": [{"label": "A", "text": "Wayne Gretzky"}, {"label": "B", "text": "Mario Lemieux"}, {"label": "C", "text": "Mark Messier"}, {"label": "D", "text": "Bobby Orr"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Which player won the Hart Trophy and Conn Smythe Trophy in the same season?", "answers": [{"label": "A", "text": "Wayne Gretzky"}, {"label": "B", "text": "Mario Lemieux"}, {"label": "C", "text": "Mark Messier"}, {"label": "D", "text": "Bobby Orr"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Which team drafted Mark Messier?", "answers": [{"label": "A", "text": "Edmonton Oilers"}, {"label": "B", "text": "New York Rangers"}, {"label": "C", "text": "Toronto Maple Leafs"}, {"label": "D", "text": "Montreal Canadiens"}], "correctAnswer": "B", "difficulty": "HARD"},
                {"question": "Who was the first player to score 1,000 points in a single NHL season?", "answers": [{"label": "A", "text": "Wayne Gretzky"}, {"label": "B", "text": "Mario Lemieux"}, {"label": "C", "text": "Mark Messier"}, {"label": "D", "text": "Bobby Orr"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Who was the first player to score 1,000 points in a single NHL season?", "answers": [{"label": "A", "text": "Wayne Gretzky"}, {"label": "B", "text": "Mario Lemieux"}, {"label": "C", "text": "Mark Messier"}, {"label": "D", "text": "Bobby Orr"}], "correctAnswer": "A", "difficulty": "HARD"}
            ]
        },
        "volleyball": {
            "easy": [
                {"question": "How many players are there on a volleyball team?", "answers": [{"label": "A", "text": "5"}, {"label": "B", "text": "6"}, {"label": "C", "text": "7"}, {"label": "D", "text": "8"}], "correctAnswer": "B", "difficulty": "EASY"},
                {"question": "What is the term for a score of zero in volleyball?", "answers": [{"label": "A", "text": "Love"}, {"label": "B", "text": "Deuce"}, {"label": "C", "text": "Ace"}, {"label": "D", "text": "Break"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "Which country won the first Olympic volleyball tournament?", "answers": [{"label": "A", "text": "Russia"}, {"label": "B", "text": "Brazil"}, {"label": "C", "text": "United States"}, {"label": "D", "text": "China"}], "correctAnswer": "B", "difficulty": "EASY"},
                {"question": "What is the term for a score of 15 in volleyball?", "answers": [{"label": "A", "text": "Game"}, {"label": "B", "text": "Set"}, {"label": "C", "text": "Point"}, {"label": "D", "text": "Rally"}], "correctAnswer": "C", "difficulty": "EASY"},
                {"question": "Which player is known as the 'King of the Court'?", "answers": [{"label": "A", "text": "Mario"}, {"label": "B", "text": "Ivan"}, {"label": "C", "text": "Andre"}, {"label": "D", "text": "Paolo"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "Which team drafted Mario in 1992?", "answers": [{"label": "A", "text": "Italy"}, {"label": "B", "text": "Brazil"}, {"label": "C", "text": "United States"}, {"label": "D", "text": "Russia"}], "correctAnswer": "A", "difficulty": "EASY"}
            ],
            "medium": [
                {"question": "Which team has won the most FIVB Volleyball World Championships?", "answers": [{"label": "A", "text": "Brazil"}, {"label": "B", "text": "United States"}, {"label": "C", "text": "Russia"}, {"label": "D", "text": "Italy"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "How many points is a kill worth in volleyball?", "answers": [{"label": "A", "text": "1"}, {"label": "B", "text": "2"}, {"label": "C", "text": "3"}, {"label": "D", "text": "4"}], "correctAnswer": "B", "difficulty": "MEDIUM"},
                {"question": "Which player is known as the 'King of the Court'?", "answers": [{"label": "A", "text": "Mario"}, {"label": "B", "text": "Ivan"}, {"label": "C", "text": "Andre"}, {"label": "D", "text": "Paolo"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "Which team drafted Paolo in 1992?", "answers": [{"label": "A", "text": "Italy"}, {"label": "B", "text": "Brazil"}, {"label": "C", "text": "United States"}, {"label": "D", "text": "Russia"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "What is a 'sandwich' in volleyball?", "answers": [{"label": "A", "text": "A 3-2 set"}, {"label": "B", "text": "A 2-3 set"}, {"label": "C", "text": "A 2-1 set"}, {"label": "D", "text": "A 3-1 set"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "Which player completed the Golden Slam in volleyball?", "answers": [{"label": "A", "text": "Ivan"}, {"label": "B", "text": "Mario"}, {"label": "C", "text": "Paolo"}, {"label": "D", "text": "Andre"}], "correctAnswer": "A", "difficulty": "MEDIUM"}
            ],
            "hard": [
                {"question": "What year was the first FIVB Volleyball World Championships held?", "answers": [{"label": "A", "text": "1949"}, {"label": "B", "text": "1952"}, {"label": "C", "text": "1964"}, {"label": "D", "text": "1976"}], "correctAnswer": "B", "difficulty": "HARD"},
                {"question": "Who was the first player to win the Olympic gold medal in volleyball?", "answers": [{"label": "A", "text": "Mario"}, {"label": "B", "text": "Ivan"}, {"label": "C", "text": "Andre"}, {"label": "D", "text": "Paolo"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Which country has produced the most men's volleyball players?", "answers": [{"label": "A", "text": "Brazil"}, {"label": "B", "text": "United States"}, {"label": "C", "text": "Russia"}, {"label": "D", "text": "Italy"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Who won the women's volleyball gold medal at the 2008 Beijing Olympics?", "answers": [{"label": "A", "text": "United States"}, {"label": "B", "text": "Brazil"}, {"label": "C", "text": "Russia"}, {"label": "D", "text": "Italy"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Which player has the most career kills in volleyball?", "answers": [{"label": "A", "text": "Ivan"}, {"label": "B", "text": "Mario"}, {"label": "C", "text": "Paolo"}, {"label": "D", "text": "Andre"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Who was the first player to win the Olympic gold medal in volleyball?", "answers": [{"label": "A", "text": "Mario"}, {"label": "B", "text": "Ivan"}, {"label": "C", "text": "Andre"}, {"label": "D", "text": "Paolo"}], "correctAnswer": "A", "difficulty": "HARD"}
            ]
        },
        "rugby": {
            "easy": [
                {"question": "How many players are there on a rugby team?", "answers": [{"label": "A", "text": "15"}, {"label": "B", "text": "16"}, {"label": "C", "text": "17"}, {"label": "D", "text": "18"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "What is the term for a score of zero in rugby?", "answers": [{"label": "A", "text": "Love"}, {"label": "B", "text": "Deuce"}, {"label": "C", "text": "Ace"}, {"label": "D", "text": "Break"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "Which country won the first Rugby World Cup?", "answers": [{"label": "A", "text": "New Zealand"}, {"label": "B", "text": "South Africa"}, {"label": "C", "text": "Australia"}, {"label": "D", "text": "England"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "What is the term for a score of 100 in rugby?", "answers": [{"label": "A", "text": "Hundred"}, {"label": "B", "text": "Century"}, {"label": "C", "text": "Duck"}, {"label": "D", "text": "Break"}], "correctAnswer": "B", "difficulty": "EASY"},
                {"question": "Which player is known as the 'Lion of New Zealand'?", "answers": [{"label": "A", "text": "Richie McCaw"}, {"label": "B", "text": "Dan Carter"}, {"label": "C", "text": "Tana Umaga"}, {"label": "D", "text": "Sean Fitzpatrick"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "Which team drafted Dan Carter in 1996?", "answers": [{"label": "A", "text": "New Zealand"}, {"label": "B", "text": "Australia"}, {"label": "C", "text": "South Africa"}, {"label": "D", "text": "England"}], "correctAnswer": "A", "difficulty": "EASY"}
            ],
            "medium": [
                {"question": "Which team has won the most Rugby World Cups?", "answers": [{"label": "A", "text": "New Zealand"}, {"label": "B", "text": "South Africa"}, {"label": "C", "text": "Australia"}, {"label": "D", "text": "England"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "How many points is a try worth in rugby?", "answers": [{"label": "A", "text": "5"}, {"label": "B", "text": "7"}, {"label": "C", "text": "10"}, {"label": "D", "text": "15"}], "correctAnswer": "B", "difficulty": "MEDIUM"},
                {"question": "Which player is known as the 'Lion of New Zealand'?", "answers": [{"label": "A", "text": "Richie McCaw"}, {"label": "B", "text": "Dan Carter"}, {"label": "C", "text": "Tana Umaga"}, {"label": "D", "text": "Sean Fitzpatrick"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "Which team drafted Tana Umaga?", "answers": [{"label": "A", "text": "New Zealand"}, {"label": "B", "text": "Australia"}, {"label": "C", "text": "South Africa"}, {"label": "D", "text": "England"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "What is a 'haka' in rugby?", "answers": [{"label": "A", "text": "A traditional Maori war dance"}, {"label": "B", "text": "A traditional Maori greeting"}, {"label": "C", "text": "A traditional Maori song"}, {"label": "D", "text": "A traditional Maori game"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "Which player completed the Golden Slam in rugby?", "answers": [{"label": "A", "text": "Richie McCaw"}, {"label": "B", "text": "Dan Carter"}, {"label": "C", "text": "Tana Umaga"}, {"label": "D", "text": "Sean Fitzpatrick"}], "correctAnswer": "A", "difficulty": "MEDIUM"}
            ],
            "hard": [
                {"question": "What year was the first Rugby World Cup held?", "answers": [{"label": "A", "text": "1987"}, {"label": "B", "text": "1991"}, {"label": "C", "text": "1995"}, {"label": "D", "text": "1999"}], "correctAnswer": "B", "difficulty": "HARD"},
                {"question": "Who was the first player to score 1,000 points in a single Rugby World Cup?", "answers": [{"label": "A", "text": "Richie McCaw"}, {"label": "B", "text": "Dan Carter"}, {"label": "C", "text": "Tana Umaga"}, {"label": "D", "text": "Sean Fitzpatrick"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Which country won the first Rugby World Cup?", "answers": [{"label": "A", "text": "New Zealand"}, {"label": "B", "text": "South Africa"}, {"label": "C", "text": "Australia"}, {"label": "D", "text": "England"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Who was the first player to score 1,000 points in a single Rugby World Cup?", "answers": [{"label": "A", "text": "Richie McCaw"}, {"label": "B", "text": "Dan Carter"}, {"label": "C", "text": "Tana Umaga"}, {"label": "D", "text": "Sean Fitzpatrick"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Which player has the most career points in rugby?", "answers": [{"label": "A", "text": "Richie McCaw"}, {"label": "B", "text": "Dan Carter"}, {"label": "C", "text": "Tana Umaga"}, {"label": "D", "text": "Sean Fitzpatrick"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Who was the first player to score 1,000 points in a single Rugby World Cup?", "answers": [{"label": "A", "text": "Richie McCaw"}, {"label": "B", "text": "Dan Carter"}, {"label": "C", "text": "Tana Umaga"}, {"label": "D", "text": "Sean Fitzpatrick"}], "correctAnswer": "A", "difficulty": "HARD"}
            ]
        },
        "golf": {
            "easy": [
                {"question": "How many players are there on a golf course?", "answers": [{"label": "A", "text": "1"}, {"label": "B", "text": "2"}, {"label": "C", "text": "3"}, {"label": "D", "text": "4"}], "correctAnswer": "B", "difficulty": "EASY"},
                {"question": "What is the term for a score of zero in golf?", "answers": [{"label": "A", "text": "Love"}, {"label": "B", "text": "Deuce"}, {"label": "C", "text": "Ace"}, {"label": "D", "text": "Break"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "Which country won the first Olympic golf tournament?", "answers": [{"label": "A", "text": "United States"}, {"label": "B", "text": "Great Britain"}, {"label": "C", "text": "France"}, {"label": "D", "text": "Germany"}], "correctAnswer": "B", "difficulty": "EASY"},
                {"question": "What is the term for a score of 100 in golf?", "answers": [{"label": "A", "text": "Hundred"}, {"label": "B", "text": "Century"}, {"label": "C", "text": "Duck"}, {"label": "D", "text": "Break"}], "correctAnswer": "B", "difficulty": "EASY"},
                {"question": "Which player is known as the 'Golden Boy'?", "answers": [{"label": "A", "text": "Tiger Woods"}, {"label": "B", "text": "Jack Nicklaus"}, {"label": "C", "text": "Gary Player"}, {"label": "D", "text": "Arnold Palmer"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "Which team drafted Tiger Woods in 1996?", "answers": [{"label": "A", "text": "United States"}, {"label": "B", "text": "Great Britain"}, {"label": "C", "text": "France"}, {"label": "D", "text": "Germany"}], "correctAnswer": "A", "difficulty": "EASY"}
            ],
            "medium": [
                {"question": "Which team has won the most Masters tournaments?", "answers": [{"label": "A", "text": "United States"}, {"label": "B", "text": "Great Britain"}, {"label": "C", "text": "France"}, {"label": "D", "text": "Germany"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "How many points is a birdie worth in golf?", "answers": [{"label": "A", "text": "1"}, {"label": "B", "text": "2"}, {"label": "C", "text": "3"}, {"label": "D", "text": "4"}], "correctAnswer": "B", "difficulty": "MEDIUM"},
                {"question": "Which player is known as the 'Golden Boy'?", "answers": [{"label": "A", "text": "Tiger Woods"}, {"label": "B", "text": "Jack Nicklaus"}, {"label": "C", "text": "Gary Player"}, {"label": "D", "text": "Arnold Palmer"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "Which team drafted Gary Player?", "answers": [{"label": "A", "text": "United States"}, {"label": "B", "text": "Great Britain"}, {"label": "C", "text": "France"}, {"label": "D", "text": "Germany"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "What is a 'bogey' in golf?", "answers": [{"label": "A", "text": "A score of 1 over par"}, {"label": "B", "text": "A score of 2 over par"}, {"label": "C", "text": "A score of 3 over par"}, {"label": "D", "text": "A score of 4 over par"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "Which player completed the Golden Slam in golf?", "answers": [{"label": "A", "text": "Tiger Woods"}, {"label": "B", "text": "Jack Nicklaus"}, {"label": "C", "text": "Gary Player"}, {"label": "D", "text": "Arnold Palmer"}], "correctAnswer": "A", "difficulty": "MEDIUM"}
            ],
            "hard": [
                {"question": "What year was the first Olympic golf tournament held?", "answers": [{"label": "A", "text": "1900"}, {"label": "B", "text": "1904"}, {"label": "C", "text": "1908"}, {"label": "D", "text": "1912"}], "correctAnswer": "B", "difficulty": "HARD"},
                {"question": "Who was the first player to score 1,000 points in a single Olympic golf tournament?", "answers": [{"label": "A", "text": "Tiger Woods"}, {"label": "B", "text": "Jack Nicklaus"}, {"label": "C", "text": "Gary Player"}, {"label": "D", "text": "Arnold Palmer"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Which country won the first Olympic golf tournament?", "answers": [{"label": "A", "text": "United States"}, {"label": "B", "text": "Great Britain"}, {"label": "C", "text": "France"}, {"label": "D", "text": "Germany"}], "correctAnswer": "B", "difficulty": "HARD"},
                {"question": "Who was the first player to score 1,000 points in a single Olympic golf tournament?", "answers": [{"label": "A", "text": "Tiger Woods"}, {"label": "B", "text": "Jack Nicklaus"}, {"label": "C", "text": "Gary Player"}, {"label": "D", "text": "Arnold Palmer"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Which player has the most career points in golf?", "answers": [{"label": "A", "text": "Tiger Woods"}, {"label": "B", "text": "Jack Nicklaus"}, {"label": "C", "text": "Gary Player"}, {"label": "D", "text": "Arnold Palmer"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Who was the first player to score 1,000 points in a single Olympic golf tournament?", "answers": [{"label": "A", "text": "Tiger Woods"}, {"label": "B", "text": "Jack Nicklaus"}, {"label": "C", "text": "Gary Player"}, {"label": "D", "text": "Arnold Palmer"}], "correctAnswer": "A", "difficulty": "HARD"}
            ]
        },
        "boxing": {
            "easy": [
                {"question": "How many rounds are there in a boxing match?", "answers": [{"label": "A", "text": "6"}, {"label": "B", "text": "8"}, {"label": "C", "text": "10"}, {"label": "D", "text": "12"}], "correctAnswer": "B", "difficulty": "EASY"},
                {"question": "What is the term for a score of zero in boxing?", "answers": [{"label": "A", "text": "Love"}, {"label": "B", "text": "Deuce"}, {"label": "C", "text": "Ace"}, {"label": "D", "text": "Break"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "Which country won the first Olympic boxing tournament?", "answers": [{"label": "A", "text": "United States"}, {"label": "B", "text": "Great Britain"}, {"label": "C", "text": "France"}, {"label": "D", "text": "Germany"}], "correctAnswer": "B", "difficulty": "EASY"},
                {"question": "What is the term for a score of 100 in boxing?", "answers": [{"label": "A", "text": "Hundred"}, {"label": "B", "text": "Century"}, {"label": "C", "text": "Duck"}, {"label": "D", "text": "Break"}], "correctAnswer": "B", "difficulty": "EASY"},
                {"question": "Which player is known as the 'Greatest'?", "answers": [{"label": "A", "text": "Muhammad Ali"}, {"label": "B", "text": "Mike Tyson"}, {"label": "C", "text": "Joe Louis"}, {"label": "D", "text": "Floyd Mayweather"}], "correctAnswer": "A", "difficulty": "EASY"},
                {"question": "Which team drafted Muhammad Ali in 1960?", "answers": [{"label": "A", "text": "United States"}, {"label": "B", "text": "Great Britain"}, {"label": "C", "text": "France"}, {"label": "D", "text": "Germany"}], "correctAnswer": "A", "difficulty": "EASY"}
            ],
            "medium": [
                {"question": "Which team has won the most Olympic boxing tournaments?", "answers": [{"label": "A", "text": "United States"}, {"label": "B", "text": "Great Britain"}, {"label": "C", "text": "France"}, {"label": "D", "text": "Germany"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "How many points is a knockdown worth in boxing?", "answers": [{"label": "A", "text": "1"}, {"label": "B", "text": "2"}, {"label": "C", "text": "3"}, {"label": "D", "text": "4"}], "correctAnswer": "B", "difficulty": "MEDIUM"},
                {"question": "Which player is known as the 'Greatest'?", "answers": [{"label": "A", "text": "Muhammad Ali"}, {"label": "B", "text": "Mike Tyson"}, {"label": "C", "text": "Joe Louis"}, {"label": "D", "text": "Floyd Mayweather"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "Which team drafted Joe Louis?", "answers": [{"label": "A", "text": "United States"}, {"label": "B", "text": "Great Britain"}, {"label": "C", "text": "France"}, {"label": "D", "text": "Germany"}], "correctAnswer": "B", "difficulty": "MEDIUM"},
                {"question": "What is a 'cut' in boxing?", "answers": [{"label": "A", "text": "A score of 100"}, {"label": "B", "text": "A score of 100"}, {"label": "C", "text": "A score of 100"}, {"label": "D", "text": "A score of 100"}], "correctAnswer": "A", "difficulty": "MEDIUM"},
                {"question": "Which player completed the Golden Slam in boxing?", "answers": [{"label": "A", "text": "Muhammad Ali"}, {"label": "B", "text": "Mike Tyson"}, {"label": "C", "text": "Joe Louis"}, {"label": "D", "text": "Floyd Mayweather"}], "correctAnswer": "A", "difficulty": "MEDIUM"}
            ],
            "hard": [
                {"question": "What year was the first Olympic boxing tournament held?", "answers": [{"label": "A", "text": "1904"}, {"label": "B", "text": "1908"}, {"label": "C", "text": "1912"}, {"label": "D", "text": "1920"}], "correctAnswer": "B", "difficulty": "HARD"},
                {"question": "Who was the first player to score 1,000 points in a single Olympic boxing tournament?", "answers": [{"label": "A", "text": "Muhammad Ali"}, {"label": "B", "text": "Mike Tyson"}, {"label": "C", "text": "Joe Louis"}, {"label": "D", "text": "Floyd Mayweather"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Which country won the first Olympic boxing tournament?", "answers": [{"label": "A", "text": "United States"}, {"label": "B", "text": "Great Britain"}, {"label": "C", "text": "France"}, {"label": "D", "text": "Germany"}], "correctAnswer": "B", "difficulty": "HARD"},
                {"question": "Who was the first player to score 1,000 points in a single Olympic boxing tournament?", "answers": [{"label": "A", "text": "Muhammad Ali"}, {"label": "B", "text": "Mike Tyson"}, {"label": "C", "text": "Joe Louis"}, {"label": "D", "text": "Floyd Mayweather"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Which player has the most career points in boxing?", "answers": [{"label": "A", "text": "Muhammad Ali"}, {"label": "B", "text": "Mike Tyson"}, {"label": "C", "text": "Joe Louis"}, {"label": "D", "text": "Floyd Mayweather"}], "correctAnswer": "A", "difficulty": "HARD"},
                {"question": "Who was the first player to score 1,000 points in a single Olympic boxing tournament?", "answers": [{"label": "A", "text": "Muhammad Ali"}, {"label": "B", "text": "Mike Tyson"}, {"label": "C", "text": "Joe Louis"}, {"label": "D", "text": "Floyd Mayweather"}], "correctAnswer": "A", "difficulty": "HARD"}
            ]
        }
    }
    
    sport_questions = fallback_questions.get(sport.lower(), {})
    level_questions = sport_questions.get(level.lower(), [])
    
    # If we don't have enough questions, duplicate some to reach 'count'
    while len(level_questions) < count:
        level_questions.extend(level_questions[:min(len(level_questions), count - len(level_questions))])
    
    # Filter out any questions missing 'correctAnswer'
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
    
    # Ensure all fallback questions are unique by hash
    unique_questions = get_unique_questions(level_questions, sport, level, count)
    # If still not enough, fill with generic unique questions
    if len(unique_questions) < count:
        logging.warning(f"[generate_expanded_fallback_questions] Only {len(unique_questions)} unique fallback questions for {sport}/{level}. Filling with generic questions.")
        for i in range(count - len(unique_questions)):
            unique_questions.append({
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
    return unique_questions[:count]

async def generate_ai_quiz(sport: str, level: str, count: int = 5):
    QUESTION_COUNT = count
    try:
        level = level.lower()
        logger = logging.getLogger(__name__)
        logger.info(f"[AIQUIZ] Starting quiz generation for {sport}/{level}, count={QUESTION_COUNT}")
        # Enhanced prompt for better quiz generation
        prompt = f"""
Generate a quiz with {QUESTION_COUNT} multiple-choice questions about {sport.upper()}, categorized by difficulty: easy, medium, and hard. Each question should be directly related to the sport — rules, players, history, events, or tactics. Format each question with 4 options and mark the correct answer.

IMPORTANT REQUIREMENTS:
- Each question must have exactly 4 answer options (A, B, C, D) and only one correct answer
- Focus on sports facts, rules, history, records, players, and tactics
- Avoid business, finance, sponsorship, or commercial topics
- Mix difficulty levels appropriately for {level.upper()} level
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
                    fallback = generate_expanded_fallback_questions(sport, level, 1)
                    return [*generate_expanded_fallback_questions(sport, level, QUESTION_COUNT), *fallback]
            response_text = response_text.replace("```json", "").replace("```", "").strip()
            try:
                questions_list = json.loads(response_text)
            except json.JSONDecodeError:
                try:
                    questions_list = ast.literal_eval(response_text)
                except (ValueError, SyntaxError) as e:
                    logger.warning(f"[AIQUIZ] Failed to parse AI response: {e}. Using fallback.")
                    fallback = generate_expanded_fallback_questions(sport, level, 1)
                    return [*generate_expanded_fallback_questions(sport, level, QUESTION_COUNT), *fallback]
            # Validate the response structure
            if not isinstance(questions_list, list) or len(questions_list) != QUESTION_COUNT:
                logger.warning(f"[AIQUIZ] Invalid AI response structure. Using fallback.")
                fallback = generate_expanded_fallback_questions(sport, level, 1)
                return [*generate_expanded_fallback_questions(sport, level, QUESTION_COUNT), *fallback]
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
                fallback = generate_expanded_fallback_questions(sport, level, 1)
                return [*generate_expanded_fallback_questions(sport, level, QUESTION_COUNT), *fallback]
            filtered_questions = filter_business_questions(valid_questions)
            if len(filtered_questions) < 3:
                logger.warning(f"[AIQUIZ] Too many business-related questions filtered out. Using fallback.")
                fallback = generate_expanded_fallback_questions(sport, level, 1)
                return [*generate_expanded_fallback_questions(sport, level, QUESTION_COUNT), *fallback]
            unique_questions = get_unique_questions(filtered_questions, sport, level, QUESTION_COUNT)
            fallback = generate_expanded_fallback_questions(sport, level, 1)
            logger.info(f"[AIQUIZ] Successfully generated {len(unique_questions)} AI questions and 1 fallback for {sport}/{level}.")
            return unique_questions[:QUESTION_COUNT] + fallback
        except Exception as e:
            logger.error(f"[AIQUIZ] Error generating AI quiz: {e}. Using fallback.")
            fallback = generate_expanded_fallback_questions(sport, level, 1)
            return [*generate_expanded_fallback_questions(sport, level, QUESTION_COUNT), *fallback]
    except Exception as e:
        logger.error(f"[AIQUIZ] Failed to generate quiz: {str(e)}. Using fallback.")
        fallback = generate_expanded_fallback_questions(sport, level, 1)
        return [*generate_expanded_fallback_questions(sport, level, QUESTION_COUNT), *fallback] 