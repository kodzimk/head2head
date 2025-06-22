from .init import chat
import ast
import random
import json

def generate_fallback_questions(sport: str, level: str):
    """Generate fallback questions when AI fails"""
    fallback_questions = {
        "football": {
            "easy": [
                {
                    "question": f"Which country has won the most FIFA World Cup titles?",
                    "answers": [
                        {"label": "A", "text": "Brazil"},
                        {"label": "B", "text": "Germany"},
                        {"label": "C", "text": "Argentina"},
                        {"label": "D", "text": "Italy"}
                    ],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                },
                {
                    "question": f"Who is considered the greatest football player of all time?",
                    "answers": [
                        {"label": "A", "text": "Lionel Messi"},
                        {"label": "B", "text": "Cristiano Ronaldo"},
                        {"label": "C", "text": "Pelé"},
                        {"label": "D", "text": "Diego Maradona"}
                    ],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": f"Which club has won the most UEFA Champions League titles?",
                    "answers": [
                        {"label": "A", "text": "Real Madrid"},
                        {"label": "B", "text": "Barcelona"},
                        {"label": "C", "text": "Bayern Munich"},
                        {"label": "D", "text": "AC Milan"}
                    ],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                }
            ],
            "hard": [
                {
                    "question": f"In which year did the first FIFA World Cup take place?",
                    "answers": [
                        {"label": "A", "text": "1930"},
                        {"label": "B", "text": "1934"},
                        {"label": "C", "text": "1938"},
                        {"label": "D", "text": "1950"}
                    ],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        },
        "basketball": {
            "easy": [
                {
                    "question": f"Which NBA player has won the most championship rings?",
                    "answers": [
                        {"label": "A", "text": "Michael Jordan"},
                        {"label": "B", "text": "Bill Russell"},
                        {"label": "C", "text": "Kareem Abdul-Jabbar"},
                        {"label": "D", "text": "LeBron James"}
                    ],
                    "correctAnswer": "B",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": f"Which team has won the most NBA championships?",
                    "answers": [
                        {"label": "A", "text": "Los Angeles Lakers"},
                        {"label": "B", "text": "Boston Celtics"},
                        {"label": "C", "text": "Chicago Bulls"},
                        {"label": "D", "text": "Golden State Warriors"}
                    ],
                    "correctAnswer": "B",
                    "difficulty": "MEDIUM"
                }
            ],
            "hard": [
                {
                    "question": f"In which year was the NBA founded?",
                    "answers": [
                        {"label": "A", "text": "1946"},
                        {"label": "B", "text": "1947"},
                        {"label": "C", "text": "1948"},
                        {"label": "D", "text": "1949"}
                    ],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        },
        "tennis": {
            "easy": [
                {
                    "question": f"Which Grand Slam tournament is played on grass?",
                    "answers": [
                        {"label": "A", "text": "Australian Open"},
                        {"label": "B", "text": "French Open"},
                        {"label": "C", "text": "Wimbledon"},
                        {"label": "D", "text": "US Open"}
                    ],
                    "correctAnswer": "C",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": f"Who has won the most Grand Slam singles titles in men's tennis?",
                    "answers": [
                        {"label": "A", "text": "Roger Federer"},
                        {"label": "B", "text": "Rafael Nadal"},
                        {"label": "C", "text": "Novak Djokovic"},
                        {"label": "D", "text": "Pete Sampras"}
                    ],
                    "correctAnswer": "C",
                    "difficulty": "MEDIUM"
                }
            ],
            "hard": [
                {
                    "question": f"In which year was the first Wimbledon tournament held?",
                    "answers": [
                        {"label": "A", "text": "1877"},
                        {"label": "B", "text": "1881"},
                        {"label": "C", "text": "1885"},
                        {"label": "D", "text": "1890"}
                    ],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        },
        "cricket": {
            "easy": [
                {
                    "question": f"Which country has won the most Cricket World Cup titles?",
                    "answers": [
                        {"label": "A", "text": "Australia"},
                        {"label": "B", "text": "West Indies"},
                        {"label": "C", "text": "India"},
                        {"label": "D", "text": "England"}
                    ],
                    "correctAnswer": "A",
                    "difficulty": "EASY"
                }
            ],
            "medium": [
                {
                    "question": f"Who is known as the 'God of Cricket'?",
                    "answers": [
                        {"label": "A", "text": "Sachin Tendulkar"},
                        {"label": "B", "text": "Virat Kohli"},
                        {"label": "C", "text": "Ricky Ponting"},
                        {"label": "D", "text": "Brian Lara"}
                    ],
                    "correctAnswer": "A",
                    "difficulty": "MEDIUM"
                }
            ],
            "hard": [
                {
                    "question": f"In which year was the first Cricket World Cup held?",
                    "answers": [
                        {"label": "A", "text": "1975"},
                        {"label": "B", "text": "1979"},
                        {"label": "C", "text": "1983"},
                        {"label": "D", "text": "1987"}
                    ],
                    "correctAnswer": "A",
                    "difficulty": "HARD"
                }
            ]
        }
    }
    
    # Get fallback questions for the sport and level
    sport_questions = fallback_questions.get(sport.lower(), fallback_questions["football"])
    level_questions = sport_questions.get(level.lower(), sport_questions["easy"])
    
    # Repeat questions to get 10 total
    questions = []
    for i in range(10):
        question = level_questions[i % len(level_questions)].copy()
        # Modify question slightly to avoid exact duplicates
        question["question"] = f"{question['question']} (Question {i+1})"
        questions.append(question)
    
    return questions

async def generate_ai_quiz(sport: str, level: str):
    try:
        level = level.lower()
    
        # Add random question style variations
        style_variations = [
            "Mix direct questions with scenario-based questions",
            "Include questions about comparisons and contrasts",
        ]
        style_variation = random.choice(style_variations)
        
        # Build the enhanced prompt
        enhanced_prompt = f"""
Create a {level.upper()} level quiz about {sport.upper()} with the following requirements:

**CRITICAL: ALL QUESTIONS MUST BE ABOUT {sport.upper()} ONLY - NO OTHER SPORTS**

STYLE: {style_variation}

**MANDATORY REQUIREMENTS:**
- EVERY question must be specifically about {sport.upper()}
- Use ONLY {sport.upper()} players, teams, venues, and tournaments
- NO questions about basketball, tennis, cricket, or any other sport
- ALL answer choices must be {sport.upper()}-related
- Use real {sport.upper()} player names, team names, and venues
- Focus on {sport.upper()} rules, achievements, and history

SPECIFIC INSTRUCTIONS:
- Make questions engaging and fun, not just factual
- Use different question formats (Who, What, When, Where, Why, How)
- Include questions that test reasoning, not just memory
- Mix serious and entertaining questions
- Ensure all questions are accurate and up-to-date
- Make answer choices plausible and challenging
- Avoid repetitive question patterns
- Use varied sentence structures and complexity
- Make some questions about lesser-known aspects and trivia

VARIETY REQUIREMENTS:
- Use different question lengths (short, medium, long)
- Mix factual questions with analytical ones
- Include questions about both individual and team aspects
- Mix questions about players, coaches, fans, and officials
- Vary the complexity of answer choices
- Include questions that require context understanding

SPORT-SPECIFIC FOCUS:
- Make questions highly relevant to {sport.upper()} culture and history
- Include questions about {sport.upper()}-specific terminology
- Cover {sport.upper()}-specific rules, strategies
- Include questions about {sport.upper()} personalities and moments
- Make questions that only {sport.upper()} fans would appreciate

DIFFICULTY LEVELS:
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
                    return generate_fallback_questions(sport, level)
            
            # Validate the response structure
            if not isinstance(questions_list, list) or len(questions_list) != 10:
                print(f"Invalid response structure. Expected 10 questions, got {len(questions_list) if isinstance(questions_list, list) else 'non-list'}")
                print("Using fallback questions...")
                return generate_fallback_questions(sport, level)
            
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
                return generate_fallback_questions(sport, level)
            
            return valid_questions[:10]  # Return exactly 10 questions
            
        except Exception as e:
            print(f"Error generating AI quiz: {e}")
            print("Using fallback questions...")
            return generate_fallback_questions(sport, level)
        
    except Exception as e:
        print(f"Failed to generate quiz: {str(e)}")
        print("Using fallback questions...")
        return generate_fallback_questions(sport, level)


