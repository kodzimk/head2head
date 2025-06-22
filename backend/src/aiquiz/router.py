from .init import chat
import ast
import random
import json
import hashlib
from datetime import datetime, timedelta

# Global question tracking system
used_questions = {}  # Track questions by hash to avoid duplicates
question_rotation = {}  # Track question rotation by sport/level
last_reset = datetime.now()

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

def generate_expanded_fallback_questions(sport: str, level: str):
    """Generate a much larger set of fallback questions to avoid repetition"""
    expanded_fallback_questions = {
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
                    "question": "Which club has won the most UEFA Champions League titles?",
                    "answers": [{"label": "A", "text": "Real Madrid"}, {"label": "B", "text": "Barcelona"}, {"label": "C", "text": "Bayern Munich"}, {"label": "D", "text": "AC Milan"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "What is the nickname of Manchester United?",
                    "answers": [{"label": "A", "text": "The Red Devils"}, {"label": "B", "text": "The Blues"}, {"label": "C", "text": "The Gunners"}, {"label": "D", "text": "The Reds"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Which player has scored the most goals in a single World Cup tournament?",
                    "answers": [{"label": "A", "text": "Just Fontaine"}, {"label": "B", "text": "Ronaldo"}, {"label": "C", "text": "Miroslav Klose"}, {"label": "D", "text": "Pelé"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "What year was the first FIFA World Cup held?",
                    "answers": [{"label": "A", "text": "1930"}, {"label": "B", "text": "1934"}, {"label": "C", "text": "1938"}, {"label": "D", "text": "1950"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Which team is known as 'The Invincibles'?",
                    "answers": [{"label": "A", "text": "Arsenal 2003-04"}, {"label": "B", "text": "Manchester United 1999"}, {"label": "C", "text": "Chelsea 2004-05"}, {"label": "D", "text": "Liverpool 2019-20"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Who won the 2022 FIFA World Cup?",
                    "answers": [{"label": "A", "text": "Argentina"}, {"label": "B", "text": "France"}, {"label": "C", "text": "Brazil"}, {"label": "D", "text": "Portugal"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Which player has won the most Ballon d'Or awards?",
                    "answers": [{"label": "A", "text": "Lionel Messi"}, {"label": "B", "text": "Cristiano Ronaldo"}, {"label": "C", "text": "Michel Platini"}, {"label": "D", "text": "Johan Cruyff"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "What is the home stadium of FC Barcelona?",
                    "answers": [{"label": "A", "text": "Camp Nou"}, {"label": "B", "text": "Santiago Bernabéu"}, {"label": "C", "text": "Vicente Calderón"}, {"label": "D", "text": "Mestalla"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Which player is known as 'CR7'?",
                    "answers": [{"label": "A", "text": "Cristiano Ronaldo"}, {"label": "B", "text": "Lionel Messi"}, {"label": "C", "text": "Neymar"}, {"label": "D", "text": "Kylian Mbappé"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "What is the nickname of Liverpool FC?",
                    "answers": [{"label": "A", "text": "The Reds"}, {"label": "B", "text": "The Blues"}, {"label": "C", "text": "The Gunners"}, {"label": "D", "text": "The Citizens"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": "Which player scored the 'Hand of God' goal?",
                    "answers": [{"label": "A", "text": "Diego Maradona"}, {"label": "B", "text": "Lionel Messi"}, {"label": "C", "text": "Pelé"}, {"label": "D", "text": "Ronaldo"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "In which year did the Premier League begin?",
                    "answers": [{"label": "A", "text": "1992"}, {"label": "B", "text": "1993"}, {"label": "C", "text": "1994"}, {"label": "D", "text": "1995"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Who is the all-time top scorer in the UEFA Champions League?",
                    "answers": [{"label": "A", "text": "Cristiano Ronaldo"}, {"label": "B", "text": "Lionel Messi"}, {"label": "C", "text": "Robert Lewandowski"}, {"label": "D", "text": "Karim Benzema"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Which country hosted the 2018 FIFA World Cup?",
                    "answers": [{"label": "A", "text": "Russia"}, {"label": "B", "text": "Qatar"}, {"label": "C", "text": "Brazil"}, {"label": "D", "text": "Germany"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "What is the nickname of Liverpool FC?",
                    "answers": [{"label": "A", "text": "The Reds"}, {"label": "B", "text": "The Blues"}, {"label": "C", "text": "The Gunners"}, {"label": "D", "text": "The Citizens"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Which player has the most Premier League assists?",
                    "answers": [{"label": "A", "text": "Ryan Giggs"}, {"label": "B", "text": "Cesc Fàbregas"}, {"label": "C", "text": "Frank Lampard"}, {"label": "D", "text": "Steven Gerrard"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "What is the nickname of Arsenal FC?",
                    "answers": [{"label": "A", "text": "The Gunners"}, {"label": "B", "text": "The Blues"}, {"label": "C", "text": "The Reds"}, {"label": "D", "text": "The Citizens"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                }
            ],
            "hard": [
                {
                    "question": "Which player has the most international goals?",
                    "answers": [{"label": "A", "text": "Cristiano Ronaldo"}, {"label": "B", "text": "Lionel Messi"}, {"label": "C", "text": "Pelé"}, {"label": "D", "text": "Miroslav Klose"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "What was the original name of the UEFA Champions League?",
                    "answers": [{"label": "A", "text": "European Cup"}, {"label": "B", "text": "European Champions Cup"}, {"label": "C", "text": "European League"}, {"label": "D", "text": "European Championship"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which player has won the most Premier League titles?",
                    "answers": [{"label": "A", "text": "Ryan Giggs"}, {"label": "B", "text": "Paul Scholes"}, {"label": "C", "text": "Gary Neville"}, {"label": "D", "text": "Rio Ferdinand"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which player has scored the most goals in a single Premier League season?",
                    "answers": [{"label": "A", "text": "Mohamed Salah"}, {"label": "B", "text": "Alan Shearer"}, {"label": "C", "text": "Andy Cole"}, {"label": "D", "text": "Cristiano Ronaldo"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        },
        "basketball": {
            "easy": [
                {
                    "question": "Which NBA player has won the most championship rings?",
                    "answers": [{"label": "A", "text": "Bill Russell"}, {"label": "B", "text": "Michael Jordan"}, {"label": "C", "text": "Kareem Abdul-Jabbar"}, {"label": "D", "text": "LeBron James"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Which team has won the most NBA championships?",
                    "answers": [{"label": "A", "text": "Boston Celtics"}, {"label": "B", "text": "Los Angeles Lakers"}, {"label": "C", "text": "Chicago Bulls"}, {"label": "D", "text": "Golden State Warriors"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Who is known as 'The King' in basketball?",
                    "answers": [{"label": "A", "text": "LeBron James"}, {"label": "B", "text": "Michael Jordan"}, {"label": "C", "text": "Kobe Bryant"}, {"label": "D", "text": "Magic Johnson"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "What is the nickname of the Chicago Bulls?",
                    "answers": [{"label": "A", "text": "The Bulls"}, {"label": "B", "text": "The Bears"}, {"label": "C", "text": "The Cubs"}, {"label": "D", "text": "The Hawks"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "In which year was the NBA founded?",
                    "answers": [{"label": "A", "text": "1946"}, {"label": "B", "text": "1947"}, {"label": "C", "text": "1948"}, {"label": "D", "text": "1949"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Who is known as 'His Airness'?",
                    "answers": [{"label": "A", "text": "Michael Jordan"}, {"label": "B", "text": "LeBron James"}, {"label": "C", "text": "Kobe Bryant"}, {"label": "D", "text": "Magic Johnson"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": "Which player has scored the most points in NBA history?",
                    "answers": [{"label": "A", "text": "LeBron James"}, {"label": "B", "text": "Kareem Abdul-Jabbar"}, {"label": "C", "text": "Karl Malone"}, {"label": "D", "text": "Michael Jordan"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "What is the nickname of the Los Angeles Lakers?",
                    "answers": [{"label": "A", "text": "The Lakers"}, {"label": "B", "text": "The Clippers"}, {"label": "C", "text": "The Kings"}, {"label": "D", "text": "The Warriors"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Which player is known as 'The Black Mamba'?",
                    "answers": [{"label": "A", "text": "Kobe Bryant"}, {"label": "B", "text": "Michael Jordan"}, {"label": "C", "text": "LeBron James"}, {"label": "D", "text": "Magic Johnson"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                }
            ],
            "hard": [
                {
                    "question": "Which player has the most career assists in NBA history?",
                    "answers": [{"label": "A", "text": "John Stockton"}, {"label": "B", "text": "Jason Kidd"}, {"label": "C", "text": "Steve Nash"}, {"label": "D", "text": "Magic Johnson"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                },
                {
                    "question": "Which player has the most career rebounds in NBA history?",
                    "answers": [{"label": "A", "text": "Wilt Chamberlain"}, {"label": "B", "text": "Bill Russell"}, {"label": "C", "text": "Kareem Abdul-Jabbar"}, {"label": "D", "text": "Moses Malone"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        },
        "tennis": {
            "easy": [
                {
                    "question": "Which Grand Slam tournament is played on grass?",
                    "answers": [{"label": "A", "text": "Wimbledon"}, {"label": "B", "text": "Australian Open"}, {"label": "C", "text": "French Open"}, {"label": "D", "text": "US Open"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Who has won the most Grand Slam singles titles in men's tennis?",
                    "answers": [{"label": "A", "text": "Novak Djokovic"}, {"label": "B", "text": "Rafael Nadal"}, {"label": "C", "text": "Roger Federer"}, {"label": "D", "text": "Pete Sampras"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "What is the nickname of Roger Federer?",
                    "answers": [{"label": "A", "text": "The Swiss Maestro"}, {"label": "B", "text": "The King of Clay"}, {"label": "C", "text": "The Djoker"}, {"label": "D", "text": "The Bull"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Which Grand Slam is played on clay courts?",
                    "answers": [{"label": "A", "text": "French Open"}, {"label": "B", "text": "Wimbledon"}, {"label": "C", "text": "Australian Open"}, {"label": "D", "text": "US Open"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": "In which year was the first Wimbledon tournament held?",
                    "answers": [{"label": "A", "text": "1877"}, {"label": "B", "text": "1881"}, {"label": "C", "text": "1885"}, {"label": "D", "text": "1890"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "Which player is known as 'The King of Clay'?",
                    "answers": [{"label": "A", "text": "Rafael Nadal"}, {"label": "B", "text": "Roger Federer"}, {"label": "C", "text": "Novak Djokovic"}, {"label": "D", "text": "Andy Murray"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                }
            ],
            "hard": [
                {
                    "question": "Which player has won the most ATP Tour titles?",
                    "answers": [{"label": "A", "text": "Jimmy Connors"}, {"label": "B", "text": "Roger Federer"}, {"label": "C", "text": "Ivan Lendl"}, {"label": "D", "text": "Pete Sampras"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        },
        "cricket": {
            "easy": [
                {
                    "question": "Which country has won the most Cricket World Cup titles?",
                    "answers": [{"label": "A", "text": "Australia"}, {"label": "B", "text": "West Indies"}, {"label": "C", "text": "India"}, {"label": "D", "text": "England"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Who is known as the 'God of Cricket'?",
                    "answers": [{"label": "A", "text": "Sachin Tendulkar"}, {"label": "B", "text": "Virat Kohli"}, {"label": "C", "text": "Ricky Ponting"}, {"label": "D", "text": "Brian Lara"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "In which year was the first Cricket World Cup held?",
                    "answers": [{"label": "A", "text": "1975"}, {"label": "B", "text": "1979"}, {"label": "C", "text": "1983"}, {"label": "D", "text": "1987"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "What is the nickname of the Indian cricket team?",
                    "answers": [{"label": "A", "text": "Men in Blue"}, {"label": "B", "text": "Baggy Greens"}, {"label": "C", "text": "Three Lions"}, {"label": "D", "text": "Proteas"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": "Which player has scored the most international runs?",
                    "answers": [{"label": "A", "text": "Sachin Tendulkar"}, {"label": "B", "text": "Ricky Ponting"}, {"label": "C", "text": "Kumar Sangakkara"}, {"label": "D", "text": "Jacques Kallis"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                },
                {
                    "question": "What is the nickname of the Australian cricket team?",
                    "answers": [{"label": "A", "text": "Baggy Greens"}, {"label": "B", "text": "Men in Blue"}, {"label": "C", "text": "Three Lions"}, {"label": "D", "text": "Proteas"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                }
            ],
            "hard": [
                {
                    "question": "Which player has taken the most international wickets?",
                    "answers": [{"label": "A", "text": "Muttiah Muralitharan"}, {"label": "B", "text": "Shane Warne"}, {"label": "C", "text": "Anil Kumble"}, {"label": "D", "text": "Glenn McGrath"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        },
        "baseball": {
            "easy": [
                {
                    "question": "Which team has won the most World Series titles?",
                    "answers": [{"label": "A", "text": "New York Yankees"}, {"label": "B", "text": "St. Louis Cardinals"}, {"label": "C", "text": "Boston Red Sox"}, {"label": "D", "text": "Los Angeles Dodgers"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Who holds the record for most career home runs?",
                    "answers": [{"label": "A", "text": "Barry Bonds"}, {"label": "B", "text": "Hank Aaron"}, {"label": "C", "text": "Babe Ruth"}, {"label": "D", "text": "Willie Mays"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": "Which player is known as 'The Bambino'?",
                    "answers": [{"label": "A", "text": "Babe Ruth"}, {"label": "B", "text": "Lou Gehrig"}, {"label": "C", "text": "Joe DiMaggio"}, {"label": "D", "text": "Mickey Mantle"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                }
            ],
            "hard": [
                {
                    "question": "Which player has the most career hits?",
                    "answers": [{"label": "A", "text": "Pete Rose"}, {"label": "B", "text": "Ty Cobb"}, {"label": "C", "text": "Hank Aaron"}, {"label": "D", "text": "Stan Musial"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        },
        "hockey": {
            "easy": [
                {
                    "question": "Which team has won the most Stanley Cup titles?",
                    "answers": [{"label": "A", "text": "Montreal Canadiens"}, {"label": "B", "text": "Toronto Maple Leafs"}, {"label": "C", "text": "Detroit Red Wings"}, {"label": "D", "text": "Boston Bruins"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": "Who is known as 'The Great One' in hockey?",
                    "answers": [{"label": "A", "text": "Wayne Gretzky"}, {"label": "B", "text": "Mario Lemieux"}, {"label": "C", "text": "Gordie Howe"}, {"label": "D", "text": "Bobby Orr"}],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": "Which player has scored the most career goals?",
                    "answers": [{"label": "A", "text": "Wayne Gretzky"}, {"label": "B", "text": "Gordie Howe"}, {"label": "C", "text": "Jaromir Jagr"}, {"label": "D", "text": "Brett Hull"}],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                }
            ],
            "hard": [
                {
                    "question": "Which player has the most career assists?",
                    "answers": [{"label": "A", "text": "Wayne Gretzky"}, {"label": "B", "text": "Ron Francis"}, {"label": "C", "text": "Mark Messier"}, {"label": "D", "text": "Gordie Howe"}],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        }
    }
    
    # Get fallback questions for the sport and level
    sport_questions = expanded_fallback_questions.get(sport.lower(), expanded_fallback_questions["football"])
    level_questions = sport_questions.get(level.lower(), sport_questions["easy"])
    
    # Shuffle and return unique questions
    shuffled_questions = level_questions.copy()
    random.shuffle(shuffled_questions)
    
    # Get unique questions that haven't been used recently
    unique_questions = get_unique_questions(shuffled_questions, sport, level, 10)
    
    # If we don't have enough unique questions, add some with slight modifications
    if len(unique_questions) < 10:
        remaining_needed = 10 - len(unique_questions)
        for i in range(remaining_needed):
            if i < len(level_questions):
                question = level_questions[i].copy()
                # Create variations instead of just copying
                variations = create_question_variations(question, 1)
                if variations:
                    variation = variations[0]
                    variation_hash = get_question_hash(variation)
                    if not is_question_used(variation_hash, sport, level):
                        unique_questions.append(variation)
                    else:
                        # If variation is also used, try the original with shuffled answers
                        original_with_shuffle = question.copy()
                        answers = original_with_shuffle['answers'].copy()
                        random.shuffle(answers)
                        original_with_shuffle['answers'] = answers
                        # Update correct answer
                        correct_text = next((ans['text'] for ans in question['answers'] if ans['label'] == question['correctAnswer']), '')
                        for ans in answers:
                            if ans['text'] == correct_text:
                                original_with_shuffle['correctAnswer'] = ans['label']
                                break
                        unique_questions.append(original_with_shuffle)
    
    return unique_questions[:10]

async def generate_ai_quiz(sport: str, level: str):
    try:
        level = level.lower()
        
        # Get next question types for variety
        question_types_to_use = get_next_question_types(sport, level, 5)
        
        # Add random question style variations
        style_variations = [
            "Mix direct questions with scenario-based questions",
            "Include questions about comparisons and contrasts",
            "Focus on recent events and current players",
            "Emphasize historical moments and records",
            "Include questions about rules and regulations",
            "Mix trivia with analytical questions",
            "Include questions about team dynamics and strategies",
            "Focus on international competitions and rivalries"
        ]
        style_variation = random.choice(style_variations)
        
        # Create more specific question type instructions
        question_type_instructions = {
            "historical_facts": "Include questions about important historical moments, records, and milestones",
            "player_records": "Focus on individual player achievements, statistics, and career highlights",
            "team_achievements": "Ask about team championships, dynasties, and collective accomplishments",
            "rules_and_regulations": "Include questions about game rules, regulations, and technical aspects",
            "statistics": "Focus on numerical records, rankings, and statistical achievements",
            "nicknames_and_trivia": "Include questions about player nicknames, team monikers, and interesting trivia",
            "tournaments_and_competitions": "Ask about major tournaments, cups, and competitive events",
            "controversial_moments": "Include questions about famous controversies, debates, and disputed moments",
            "comparison_questions": "Ask questions that compare players, teams, or achievements",
            "scenario_based": "Create hypothetical scenarios and ask what would happen",
            "identification_questions": "Ask 'Who is this?' or 'Which team is this?' based on descriptions",
            "timeline_questions": "Ask about when events happened in chronological order",
            "geography_questions": "Include questions about venues, locations, and geographical aspects",
            "achievement_questions": "Focus on awards, honors, and recognition"
        }
        
        # Build specific instructions for the selected question types
        type_instructions = []
        for qtype in question_types_to_use:
            if qtype in question_type_instructions:
                type_instructions.append(question_type_instructions[qtype])
        
        type_instruction_text = "\n".join([f"- {instruction}" for instruction in type_instructions])
        
        # Build the enhanced prompt
        enhanced_prompt = f"""
Create a {level.upper()} level quiz about {sport.upper()} with the following requirements:

**CRITICAL: ALL QUESTIONS MUST BE ABOUT {sport.upper()} ONLY - NO OTHER SPORTS**

STYLE: {style_variation}

**QUESTION TYPE FOCUS:**
{type_instruction_text}

**MANDATORY REQUIREMENTS:**
- EVERY question must be specifically about {sport.upper()}
- Use ONLY {sport.upper()} players, teams, venues, and tournaments
- NO questions about basketball, tennis, cricket, or any other sport
- ALL answer choices must be {sport.upper()}-related
- Use real {sport.upper()} player names, team names, and venues
- Focus on {sport.upper()} rules, achievements, and history

**VARIETY REQUIREMENTS:**
- Use different question formats (Who, What, When, Where, Why, How, Which)
- Mix short and long questions
- Include questions that test reasoning, not just memory
- Vary the complexity of answer choices
- Use different sentence structures and complexity levels
- Include questions about both individual and team aspects
- Mix questions about players, coaches, fans, and officials
- Include questions that require context understanding

**CREATIVITY REQUIREMENTS:**
- Make questions engaging and fun, not just factual
- Use creative phrasing and interesting angles
- Include questions about lesser-known aspects and trivia
- Make some questions about recent events and current players
- Include questions that spark debate or discussion
- Use varied vocabulary and terminology

**SPORT-SPECIFIC FOCUS:**
- Make questions highly relevant to {sport.upper()} culture and history
- Include questions about {sport.upper()}-specific rules, strategies, and tactics
- Include questions about {sport.upper()} personalities and memorable moments
- Make questions that only {sport.upper()} fans would appreciate
- Include questions about {sport.upper()} traditions and customs

**DIFFICULTY LEVELS:**
- EASY: Basic facts, well-known players, simple rules
- MEDIUM: Specific statistics, recent events, detailed rules
- HARD: Obscure facts, historical details, complex scenarios

**FINAL CHECK: Ensure every question is about {sport.upper()} and nothing else**

Return exactly 10 questions in this JSON format:
[
  {{
    "question": "Creative question text here?",
    "answers": [
      {{ "label": "A", "text": "Answer option 1" }},
      {{ "label": "B", "text": "Answer option 2" }},
      {{ "label": "C", "text": "Answer option 3" }},
      {{ "label": "D", "text": "Answer option 4" }}
    ],
    "correctAnswer": "A/B/C/D",
    "difficulty": "{level.upper()}"
  }}
]

**IMPORTANT: Return ONLY valid JSON, no additional text or explanations.**
"""
        
        try:
            response_text = chat.send_message(enhanced_prompt).text
            
            # Clean up markdown code blocks if they exist
            response_text = response_text.replace("```json", "").replace("```", "").strip()
            
            # Try to parse as JSON first
            try:
                questions_list = json.loads(response_text)
            except json.JSONDecodeError:
                # Fallback to ast.literal_eval for Python literal format
                try:
                    questions_list = ast.literal_eval(response_text)
                except (ValueError, SyntaxError) as e:
                    print(f"Failed to parse AI response: {e}")
                    print(f"Problematic string: {response_text}")
                    print("Using fallback questions...")
                    return generate_expanded_fallback_questions(sport, level)
            
            # Validate the response structure
            if not isinstance(questions_list, list) or len(questions_list) != 10:
                print(f"Invalid response structure. Expected 10 questions, got {len(questions_list) if isinstance(questions_list, list) else 'non-list'}")
                print("Using fallback questions...")
                return generate_expanded_fallback_questions(sport, level)
            
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
            if len(valid_questions) < 10:
                print(f"Only {len(valid_questions)} valid questions generated. Using fallback questions...")
                return generate_expanded_fallback_questions(sport, level)
            
            # Filter to ensure questions are unique and haven't been used recently
            unique_questions = get_unique_questions(valid_questions, sport, level, 10)
            
            # If we don't have enough unique questions, try to generate more
            if len(unique_questions) < 10:
                print(f"Only {len(unique_questions)} unique questions available. Generating additional questions...")
                
                # Try to generate more questions with a different prompt
                additional_prompt = f"""
Create 5 more {level.upper()} level questions about {sport.upper()} that are completely different from common questions.

**REQUIREMENTS:**
- Questions must be about {sport.upper()} only
- Make them unique and creative
- Avoid common facts that everyone knows
- Focus on recent events, obscure facts, or interesting trivia
- Use different question formats and styles
- Include questions about:
  - Recent controversies or debates
  - Lesser-known players or teams
  - Specific statistics or records
  - Interesting trivia or facts
  - Current events or trends

Return exactly 5 questions in JSON format:
[
  {{
    "question": "Unique question text here?",
    "answers": [
      {{ "label": "A", "text": "Answer option 1" }},
      {{ "label": "B", "text": "Answer option 2" }},
      {{ "label": "C", "text": "Answer option 3" }},
      {{ "label": "D", "text": "Answer option 4" }}
    ],
    "correctAnswer": "A/B/C/D",
    "difficulty": "{level.upper()}"
  }}
]
"""
                
                try:
                    additional_response = chat.send_message(additional_prompt).text
                    additional_response = additional_response.replace("```json", "").replace("```", "").strip()
                    
                    try:
                        additional_questions = json.loads(additional_response)
                        if isinstance(additional_questions, list):
                            # Validate additional questions
                            for question in additional_questions:
                                if isinstance(question, dict) and "question" in question and "answers" in question and "correctAnswer" in question:
                                    if "difficulty" not in question:
                                        question["difficulty"] = level.upper()
                                    valid_questions.append(question)
                    except:
                        pass
                        
                    # Try to get unique questions again
                    unique_questions = get_unique_questions(valid_questions, sport, level, 10)
                    
                except Exception as e:
                    print(f"Failed to generate additional questions: {e}")
            
            # If still don't have enough, create variations of existing questions
            if len(unique_questions) < 10:
                print(f"Still only {len(unique_questions)} unique questions. Creating variations...")
                
                # Create variations of some questions to increase variety
                for question in valid_questions[:5]:  # Take first 5 questions
                    variations = create_question_variations(question, 2)
                    for variation in variations:
                        if len(unique_questions) >= 10:
                            break
                        variation_hash = get_question_hash(variation)
                        if not is_question_used(variation_hash, sport, level):
                            unique_questions.append(variation)
            
            # If still don't have enough, use fallback
            if len(unique_questions) < 10:
                print(f"Still only {len(unique_questions)} unique questions. Using fallback questions...")
                return generate_expanded_fallback_questions(sport, level)
            
            # Mark questions as used
            for question in unique_questions:
                question_hash = get_question_hash(question)
                mark_question_used(question_hash, sport, level)
            
            return unique_questions[:10]
            
        except Exception as e:
            print(f"Error generating AI quiz: {e}")
            print("Using fallback questions...")
            return generate_expanded_fallback_questions(sport, level)
        
    except Exception as e:
        print(f"Failed to generate quiz: {str(e)}")
        print("Using fallback questions...")
        return generate_expanded_fallback_questions(sport, level)


