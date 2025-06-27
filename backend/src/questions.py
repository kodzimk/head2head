import random

# Simple manual questions for testing
MANUAL_QUESTIONS = {
    "football": {
        "easy": [
            {
                "question": "Which country has won the most FIFA World Cup titles?",
                "answers": [
                    {"text": "Brazil", "correct": True},
                    {"text": "Germany", "correct": False},
                    {"text": "Argentina", "correct": False},
                    {"text": "Italy", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "easy"
            },
            {
                "question": "How many players are on a football team during a match?",
                "answers": [
                    {"text": "10", "correct": False},
                    {"text": "11", "correct": True},
                    {"text": "12", "correct": False},
                    {"text": "9", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "easy"
            },
            {
                "question": "Which country hosted the 2014 FIFA World Cup?",
                "answers": [
                    {"text": "Brazil", "correct": True},
                    {"text": "Germany", "correct": False},
                    {"text": "South Africa", "correct": False},
                    {"text": "Russia", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "easy"
            },
            {
                "question": "What is the duration of a standard football match?",
                "answers": [
                    {"text": "80 minutes", "correct": False},
                    {"text": "85 minutes", "correct": False},
                    {"text": "90 minutes", "correct": True},
                    {"text": "95 minutes", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "easy"
            },
            {
                "question": "Which player has won the most Ballon d'Or awards?",
                "answers": [
                    {"text": "Lionel Messi", "correct": True},
                    {"text": "Cristiano Ronaldo", "correct": False},
                    {"text": "Pelé", "correct": False},
                    {"text": "Diego Maradona", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "easy"
            }
        ],
        "medium": [
            {
                "question": "In which year was the first FIFA World Cup held?",
                "answers": [
                    {"text": "1930", "correct": True},
                    {"text": "1934", "correct": False},
                    {"text": "1938", "correct": False},
                    {"text": "1950", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "medium"
            },
            {
                "question": "Which team has won the most UEFA Champions League titles?",
                "answers": [
                    {"text": "Real Madrid", "correct": True},
                    {"text": "Barcelona", "correct": False},
                    {"text": "Bayern Munich", "correct": False},
                    {"text": "AC Milan", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "medium"
            },
            {
                "question": "What is the offside rule in football?",
                "answers": [
                    {"text": "A player cannot be behind the last defender when the ball is passed", "correct": True},
                    {"text": "A player cannot touch the ball with their hands", "correct": False},
                    {"text": "A player cannot score from outside the penalty area", "correct": False},
                    {"text": "A player cannot pass backwards", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "medium"
            },
            {
                "question": "Which country won the 2018 FIFA World Cup?",
                "answers": [
                    {"text": "France", "correct": True},
                    {"text": "Croatia", "correct": False},
                    {"text": "Belgium", "correct": False},
                    {"text": "England", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "medium"
            },
            {
                "question": "What is the name of the football stadium in Barcelona?",
                "answers": [
                    {"text": "Camp Nou", "correct": True},
                    {"text": "Santiago Bernabéu", "correct": False},
                    {"text": "Old Trafford", "correct": False},
                    {"text": "Anfield", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "medium"
            }
        ],
        "hard": [
            {
                "question": "Which player scored the fastest hat-trick in Premier League history?",
                "answers": [
                    {"text": "Sadio Mané", "correct": True},
                    {"text": "Mohamed Salah", "correct": False},
                    {"text": "Harry Kane", "correct": False},
                    {"text": "Sergio Agüero", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "hard"
            },
            {
                "question": "In which year did the Premier League begin?",
                "answers": [
                    {"text": "1992", "correct": True},
                    {"text": "1990", "correct": False},
                    {"text": "1994", "correct": False},
                    {"text": "1996", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "hard"
            },
            {
                "question": "Which player has the most assists in Premier League history?",
                "answers": [
                    {"text": "Ryan Giggs", "correct": True},
                    {"text": "Cesc Fàbregas", "correct": False},
                    {"text": "Wayne Rooney", "correct": False},
                    {"text": "Frank Lampard", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "hard"
            },
            {
                "question": "What is the record for most goals scored in a single Premier League season?",
                "answers": [
                    {"text": "34 goals", "correct": True},
                    {"text": "32 goals", "correct": False},
                    {"text": "30 goals", "correct": False},
                    {"text": "28 goals", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "hard"
            },
            {
                "question": "Which team has won the most Premier League titles?",
                "answers": [
                    {"text": "Manchester United", "correct": True},
                    {"text": "Chelsea", "correct": False},
                    {"text": "Arsenal", "correct": False},
                    {"text": "Manchester City", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "hard"
            }
        ]
    },
    "basketball": {
        "easy": [
            {
                "question": "How many players are on a basketball team during a game?",
                "answers": [
                    {"text": "4", "correct": False},
                    {"text": "5", "correct": True},
                    {"text": "6", "correct": False},
                    {"text": "7", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "easy"
            },
            {
                "question": "How many points is a three-pointer worth?",
                "answers": [
                    {"text": "2", "correct": False},
                    {"text": "3", "correct": True},
                    {"text": "4", "correct": False},
                    {"text": "5", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "easy"
            },
            {
                "question": "Which NBA team has won the most championships?",
                "answers": [
                    {"text": "Boston Celtics", "correct": True},
                    {"text": "Los Angeles Lakers", "correct": False},
                    {"text": "Chicago Bulls", "correct": False},
                    {"text": "Golden State Warriors", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "easy"
            },
            {
                "question": "What is the height of a basketball hoop?",
                "answers": [
                    {"text": "8 feet", "correct": False},
                    {"text": "9 feet", "correct": False},
                    {"text": "10 feet", "correct": True},
                    {"text": "11 feet", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "easy"
            },
            {
                "question": "How many quarters are in a basketball game?",
                "answers": [
                    {"text": "3", "correct": False},
                    {"text": "4", "correct": True},
                    {"text": "5", "correct": False},
                    {"text": "6", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "easy"
            }
        ],
        "medium": [
            {
                "question": "Which player has won the most NBA MVP awards?",
                "answers": [
                    {"text": "Kareem Abdul-Jabbar", "correct": True},
                    {"text": "Michael Jordan", "correct": False},
                    {"text": "LeBron James", "correct": False},
                    {"text": "Bill Russell", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "medium"
            },
            {
                "question": "What year was the NBA founded?",
                "answers": [
                    {"text": "1946", "correct": True},
                    {"text": "1947", "correct": False},
                    {"text": "1948", "correct": False},
                    {"text": "1949", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "medium"
            },
            {
                "question": "Which player has the most career points in NBA history?",
                "answers": [
                    {"text": "LeBron James", "correct": True},
                    {"text": "Kareem Abdul-Jabbar", "correct": False},
                    {"text": "Michael Jordan", "correct": False},
                    {"text": "Kobe Bryant", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "medium"
            },
            {
                "question": "What is the shot clock duration in the NBA?",
                "answers": [
                    {"text": "24 seconds", "correct": True},
                    {"text": "30 seconds", "correct": False},
                    {"text": "20 seconds", "correct": False},
                    {"text": "35 seconds", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "medium"
            },
            {
                "question": "Which team won the 2023 NBA Championship?",
                "answers": [
                    {"text": "Denver Nuggets", "correct": True},
                    {"text": "Miami Heat", "correct": False},
                    {"text": "Los Angeles Lakers", "correct": False},
                    {"text": "Boston Celtics", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "medium"
            }
        ],
        "hard": [
            {
                "question": "Which player has the most career steals in NBA history?",
                "answers": [
                    {"text": "John Stockton", "correct": True},
                    {"text": "Jason Kidd", "correct": False},
                    {"text": "Michael Jordan", "correct": False},
                    {"text": "Gary Payton", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "hard"
            },
            {
                "question": "What is the record for most points scored in a single NBA game?",
                "answers": [
                    {"text": "100 points", "correct": True},
                    {"text": "81 points", "correct": False},
                    {"text": "73 points", "correct": False},
                    {"text": "69 points", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "hard"
            },
            {
                "question": "Which player has the most career assists in NBA history?",
                "answers": [
                    {"text": "John Stockton", "correct": True},
                    {"text": "Jason Kidd", "correct": False},
                    {"text": "Steve Nash", "correct": False},
                    {"text": "Magic Johnson", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "hard"
            },
            {
                "question": "What year did the NBA introduce the three-point line?",
                "answers": [
                    {"text": "1979", "correct": True},
                    {"text": "1980", "correct": False},
                    {"text": "1981", "correct": False},
                    {"text": "1982", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "hard"
            },
            {
                "question": "Which player has won the most NBA Finals MVP awards?",
                "answers": [
                    {"text": "Michael Jordan", "correct": True},
                    {"text": "LeBron James", "correct": False},
                    {"text": "Shaquille O'Neal", "correct": False},
                    {"text": "Tim Duncan", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "hard"
            }
        ]
    },
    "tennis": {
        "easy": [
            {
                "question": "How many players are in a tennis singles match?",
                "answers": [
                    {"text": "1", "correct": False},
                    {"text": "2", "correct": True},
                    {"text": "3", "correct": False},
                    {"text": "4", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "easy"
            },
            {
                "question": "Which Grand Slam tournament is played on grass?",
                "answers": [
                    {"text": "Wimbledon", "correct": True},
                    {"text": "US Open", "correct": False},
                    {"text": "French Open", "correct": False},
                    {"text": "Australian Open", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "easy"
            },
            {
                "question": "What is the scoring system in tennis?",
                "answers": [
                    {"text": "Love, 15, 30, 40", "correct": True},
                    {"text": "1, 2, 3, 4", "correct": False},
                    {"text": "0, 1, 2, 3", "correct": False},
                    {"text": "A, B, C, D", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "easy"
            },
            {
                "question": "What year was the first Wimbledon tournament held?",
                "answers": [
                    {"text": "1877", "correct": True},
                    {"text": "1887", "correct": False},
                    {"text": "1897", "correct": False},
                    {"text": "1907", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "easy"
            },
            {
                "question": "Which country has won the most Davis Cup titles?",
                "answers": [
                    {"text": "United States", "correct": True},
                    {"text": "Australia", "correct": False},
                    {"text": "Great Britain", "correct": False},
                    {"text": "France", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "easy"
            }
        ],
        "medium": [
            {
                "question": "Who has won the most Grand Slam singles titles?",
                "answers": [
                    {"text": "Margaret Court", "correct": True},
                    {"text": "Serena Williams", "correct": False},
                    {"text": "Steffi Graf", "correct": False},
                    {"text": "Martina Navratilova", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "medium"
            },
            {
                "question": "Which Grand Slam tournament is played on clay?",
                "answers": [
                    {"text": "French Open", "correct": True},
                    {"text": "Wimbledon", "correct": False},
                    {"text": "US Open", "correct": False},
                    {"text": "Australian Open", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "medium"
            },
            {
                "question": "What is a tiebreak in tennis?",
                "answers": [
                    {"text": "A special scoring system to decide a set", "correct": True},
                    {"text": "A break in play", "correct": False},
                    {"text": "A type of serve", "correct": False},
                    {"text": "A penalty", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "medium"
            },
            {
                "question": "Which player has won the most Wimbledon titles?",
                "answers": [
                    {"text": "Roger Federer", "correct": True},
                    {"text": "Pete Sampras", "correct": False},
                    {"text": "Rafael Nadal", "correct": False},
                    {"text": "Novak Djokovic", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "medium"
            },
            {
                "question": "What year did the US Open introduce the tiebreak?",
                "answers": [
                    {"text": "1970", "correct": True},
                    {"text": "1971", "correct": False},
                    {"text": "1972", "correct": False},
                    {"text": "1973", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "medium"
            }
        ],
        "hard": [
            {
                "question": "Which player has the highest career winning percentage in Grand Slam matches?",
                "answers": [
                    {"text": "Margaret Court", "correct": True},
                    {"text": "Serena Williams", "correct": False},
                    {"text": "Steffi Graf", "correct": False},
                    {"text": "Martina Navratilova", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "hard"
            },
            {
                "question": "What year did the Australian Open move to Melbourne Park?",
                "answers": [
                    {"text": "1988", "correct": True},
                    {"text": "1989", "correct": False},
                    {"text": "1990", "correct": False},
                    {"text": "1991", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "hard"
            },
            {
                "question": "Which player has won the most consecutive Grand Slam titles?",
                "answers": [
                    {"text": "Don Budge", "correct": True},
                    {"text": "Rod Laver", "correct": False},
                    {"text": "Roger Federer", "correct": False},
                    {"text": "Rafael Nadal", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "hard"
            },
            {
                "question": "Which player has the most career aces in Grand Slam tournaments?",
                "answers": [
                    {"text": "Ivo Karlović", "correct": True},
                    {"text": "John Isner", "correct": False},
                    {"text": "Roger Federer", "correct": False},
                    {"text": "Pete Sampras", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "hard"
            },
            {
                "question": "What year did the French Open become a Grand Slam tournament?",
                "answers": [
                    {"text": "1925", "correct": True},
                    {"text": "1926", "correct": False},
                    {"text": "1927", "correct": False},
                    {"text": "1928", "correct": False}
                ],
                "time_limit": 30,
                "difficulty": "hard"
            }
        ]
    }
}

def get_questions(sport: str, level: str, count: int = 5):
    """
    Get manual questions for a specific sport and level
    """
    sport_questions = MANUAL_QUESTIONS.get(sport.lower(), {})
    level_questions = sport_questions.get(level.lower(), [])
    
    if not level_questions:
        # Fallback to football easy questions
        level_questions = MANUAL_QUESTIONS.get("football", {}).get("easy", [])
    
    # Shuffle and select the required number of questions
    random.shuffle(level_questions)
    selected_questions = level_questions[:count]
    
    # Add labels to answers
    for question in selected_questions:
        labels = ['A', 'B', 'C', 'D']
        for i, answer in enumerate(question.get('answers', [])):
            answer['label'] = labels[i]
    
    return selected_questions

def add_labels_to_answers(questions):
    """Add A, B, C, D labels to answers"""
    labels = ['A', 'B', 'C', 'D']
    for question in questions:
        for i, answer in enumerate(question.get('answers', [])):
            answer['label'] = labels[i]
    return questions 