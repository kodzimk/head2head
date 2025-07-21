import os
import json
import google.generativeai as genai
from typing import List, Dict, Any
import logging
import random
import time

logger = logging.getLogger(__name__)

# Configure Google Generative AI
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is required")

genai.configure(api_key=GOOGLE_API_KEY)

# Use Gemini 2.0 Flash Exp for best performance
model = genai.GenerativeModel('gemini-2.0-flash-exp')

class AIQuizGenerator:
    def __init__(self):
        self.model = model
        self.used_questions = set()  # Track used questions to ensure uniqueness
        
        # Comprehensive sport-specific question generation guidelines
        self.sport_guidelines = {
            "tennis": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "court dimensions", 
                        "scoring system", 
                        "famous tournaments", 
                        "equipment"
                    ],
                    "example_topics": [
                        "How many sets are needed to win a Grand Slam match for men and women?",
                        "What are the dimensions of a standard tennis court?",
                        "What does 'love' mean in tennis scoring?",
                        "Name the four Grand Slam tournaments in order of their occurrence in the year",
                        "What is the official diameter of a tennis ball?"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "tournament histories", 
                        "surface types", 
                        "famous rivalries", 
                        "technical rules"
                    ],
                    "example_topics": [
                        "Which player has the most Grand Slam singles titles in tennis history?",
                        "What are the characteristics of clay, grass, and hard court surfaces?",
                        "Explain the tiebreak rule in tennis and when it is used",
                        "Describe the most famous tennis rivalries in modern history",
                        "How do professional tennis players earn ranking points?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced tactics", 
                        "statistical records", 
                        "technical strategies", 
                        "historical innovations", 
                        "complex rule interpretations"
                    ],
                    "example_topics": [
                        "Analyze the physics behind different types of tennis spin (topspin, backspin, sidespin)",
                        "What is the most challenging record in professional tennis and why?",
                        "Compare and contrast playing strategies on different court surfaces",
                        "How has tennis racket technology evolved to improve player performance?",
                        "Explain the most complex rules in professional tennis tournaments, including Hawk-Eye technology"
                    ]
                }
            },
            "soccer": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "team composition", 
                        "field dimensions", 
                        "famous players", 
                        "scoring"
                    ],
                    "example_topics": [
                        "How many players are on a soccer field during a match?",
                        "What is the size of a soccer goal?",
                        "Explain the offside rule simply",
                        "Name the most famous soccer players",
                        "How is a goal scored in soccer?"
                    ]
                },
                "medium": {
                    "topics": [
                        "team histories", 
                        "tournament details", 
                        "player achievements", 
                        "tactical formations", 
                        "international competitions"
                    ],
                    "example_topics": [
                        "Which national team has won the most World Cups?",
                        "Explain the different soccer formations",
                        "What is the significance of the Champions League?",
                        "Describe famous soccer team rivalries",
                        "How do soccer leagues and promotions work?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced tactics", 
                        "statistical analysis", 
                        "technical skills", 
                        "historical innovations", 
                        "complex strategic insights"
                    ],
                    "example_topics": [
                        "Analyze the tactical evolution of soccer over decades",
                        "Explain the most complex soccer strategies",
                        "What are the most advanced player performance metrics?",
                        "Describe the technical differences between soccer playing styles",
                        "How do soccer teams develop unique tactical approaches?"
                    ]
                }
            },
            "basketball": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "scoring", 
                        "court dimensions", 
                        "team composition", 
                        "equipment"
                    ],
                    "example_topics": [
                        "How many points is a three-pointer worth?",
                        "What is the size of a basketball court?",
                        "How many players are on a basketball team?",
                        "What are the basic rules of basketball?",
                        "Describe the different types of basketball shots"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "team histories", 
                        "tactical strategies", 
                        "famous tournaments", 
                        "league structures"
                    ],
                    "example_topics": [
                        "Which NBA team has won the most championships?",
                        "Explain different basketball defensive strategies",
                        "What is the structure of the NBA playoffs?",
                        "Describe famous basketball player rivalries",
                        "How do basketball draft picks work?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced analytics", 
                        "strategic innovations", 
                        "technical skill analysis", 
                        "historical tactical changes", 
                        "complex performance metrics"
                    ],
                    "example_topics": [
                        "Analyze the evolution of basketball offensive strategies",
                        "What are the most advanced basketball performance metrics?",
                        "Describe the technical differences between playing styles",
                        "How do teams develop unique basketball tactics?",
                        "Explain the most complex basketball statistical analyses"
                    ]
                }
            },
            "baseball": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "field layout", 
                        "scoring", 
                        "team composition", 
                        "equipment"
                    ],
                    "example_topics": [
                        "How many innings are in a baseball game?",
                        "What is a home run?",
                        "How many players are on a baseball team?",
                        "What are the basic rules of baseball?",
                        "Describe the different types of baseball pitches"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "team histories", 
                        "league structures", 
                        "famous tournaments", 
                        "tactical strategies"
                    ],
                    "example_topics": [
                        "Which team has won the most World Series?",
                        "Explain different baseball defensive strategies",
                        "What is the structure of Major League Baseball?",
                        "Describe famous baseball player rivalries",
                        "How do baseball trades and drafts work?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced analytics", 
                        "strategic innovations", 
                        "technical skill analysis", 
                        "historical tactical changes", 
                        "complex performance metrics"
                    ],
                    "example_topics": [
                        "Analyze the evolution of baseball batting techniques",
                        "What are the most advanced baseball performance metrics?",
                        "Describe the technical differences between pitching styles",
                        "How do teams develop unique baseball tactics?",
                        "Explain the most complex baseball statistical analyses"
                    ]
                }
            },
            "hockey": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "rink layout", 
                        "scoring", 
                        "team composition", 
                        "equipment"
                    ],
                    "example_topics": [
                        "How many players are on the ice during a hockey game?",
                        "What is a power play?",
                        "How is a goal scored in hockey?",
                        "What are the basic rules of hockey?",
                        "Describe the different types of hockey penalties"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "team histories", 
                        "league structures", 
                        "famous tournaments", 
                        "tactical strategies"
                    ],
                    "example_topics": [
                        "Which team has won the most Stanley Cups?",
                        "Explain different hockey defensive strategies",
                        "What is the structure of the NHL?",
                        "Describe famous hockey player rivalries",
                        "How do hockey trades and drafts work?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced analytics", 
                        "strategic innovations", 
                        "technical skill analysis", 
                        "historical tactical changes", 
                        "complex performance metrics"
                    ],
                    "example_topics": [
                        "Analyze the evolution of hockey offensive strategies",
                        "What are the most advanced hockey performance metrics?",
                        "Describe the technical differences between playing styles",
                        "How do teams develop unique hockey tactics?",
                        "Explain the most complex hockey statistical analyses"
                    ]
                }
            },
            "golf": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "course layout", 
                        "scoring", 
                        "equipment", 
                        "tournament formats"
                    ],
                    "example_topics": [
                        "What is par in golf?",
                        "How many clubs can a golfer carry?",
                        "What is a birdie?",
                        "What are the basic rules of golf?",
                        "Describe the different types of golf shots"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "tournament histories", 
                        "famous courses", 
                        "major championships", 
                        "scoring techniques"
                    ],
                    "example_topics": [
                        "Which golfer has won the most major championships?",
                        "What are the four major golf tournaments?",
                        "Explain the Ryder Cup",
                        "Describe famous golf course challenges",
                        "How do golf rankings work?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced techniques", 
                        "statistical analysis", 
                        "course strategy", 
                        "equipment technology", 
                        "complex performance metrics"
                    ],
                    "example_topics": [
                        "Analyze the physics of golf swing techniques",
                        "What are the most advanced golf performance metrics?",
                        "Describe the technical evolution of golf equipment",
                        "How do professional golfers strategize course play?",
                        "Explain the most complex golf statistical analyses"
                    ]
                }
            },
            "cricket": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "field layout", 
                        "scoring", 
                        "team composition", 
                        "equipment"
                    ],
                    "example_topics": [
                        "How many players are in a cricket team?",
                        "What is a wicket?",
                        "How is a run scored in cricket?",
                        "What are the basic rules of cricket?",
                        "Describe the different types of cricket deliveries"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "tournament histories", 
                        "league structures", 
                        "famous international competitions", 
                        "tactical strategies"
                    ],
                    "example_topics": [
                        "Which team has won the most Cricket World Cups?",
                        "Explain different cricket batting strategies",
                        "What is the structure of the IPL?",
                        "Describe famous cricket player rivalries",
                        "How do cricket tournaments and rankings work?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced analytics", 
                        "strategic innovations", 
                        "technical skill analysis", 
                        "historical tactical changes", 
                        "complex performance metrics"
                    ],
                    "example_topics": [
                        "Analyze the evolution of cricket bowling techniques",
                        "What are the most advanced cricket performance metrics?",
                        "Describe the technical differences between playing styles",
                        "How do teams develop unique cricket tactics?",
                        "Explain the most complex cricket statistical analyses"
                    ]
                }
            },
            "volleyball": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "court layout", 
                        "scoring", 
                        "team composition", 
                        "equipment"
                    ],
                    "example_topics": [
                        "How many players are on a volleyball team?",
                        "What is a rally?",
                        "How is a point scored in volleyball?",
                        "What are the basic rules of volleyball?",
                        "Describe the different types of volleyball serves"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "tournament histories", 
                        "league structures", 
                        "famous international competitions", 
                        "tactical strategies"
                    ],
                    "example_topics": [
                        "Which country has won the most Olympic volleyball medals?",
                        "Explain different volleyball defensive strategies",
                        "What is the structure of international volleyball tournaments?",
                        "Describe famous volleyball player achievements",
                        "How do volleyball rankings and leagues work?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced analytics", 
                        "strategic innovations", 
                        "technical skill analysis", 
                        "historical tactical changes", 
                        "complex performance metrics"
                    ],
                    "example_topics": [
                        "Analyze the evolution of volleyball offensive strategies",
                        "What are the most advanced volleyball performance metrics?",
                        "Describe the technical differences between playing styles",
                        "How do teams develop unique volleyball tactics?",
                        "Explain the most complex volleyball statistical analyses"
                    ]
                }
            },
            "rugby": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "field layout", 
                        "scoring", 
                        "team composition", 
                        "equipment"
                    ],
                    "example_topics": [
                        "How many players are on a rugby team?",
                        "What is a try?",
                        "How is a point scored in rugby?",
                        "What are the basic rules of rugby?",
                        "Describe the different types of rugby passes"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "tournament histories", 
                        "league structures", 
                        "famous international competitions", 
                        "tactical strategies"
                    ],
                    "example_topics": [
                        "Which team has won the most Rugby World Cups?",
                        "Explain different rugby defensive strategies",
                        "What is the structure of international rugby tournaments?",
                        "Describe famous rugby player rivalries",
                        "How do rugby rankings and leagues work?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced analytics", 
                        "strategic innovations", 
                        "technical skill analysis", 
                        "historical tactical changes", 
                        "complex performance metrics"
                    ],
                    "example_topics": [
                        "Analyze the evolution of rugby offensive strategies",
                        "What are the most advanced rugby performance metrics?",
                        "Describe the technical differences between playing styles",
                        "How do teams develop unique rugby tactics?",
                        "Explain the most complex rugby statistical analyses"
                    ]
                }
            }
        }
        
    def generate_questions(self, sport: str, level: str, count: int = 5, battle_id: str = None, language: str = "en") -> List[Dict[str, Any]]:
        """
        Generate unique sports quiz questions using Gemini AI
        
        Args:
            sport: The sport (football, basketball, tennis, etc.)
            level: Difficulty level (easy, medium, hard)
            count: Number of questions to generate
            battle_id: Battle ID for uniqueness
            language: Language code (en, ru) for question generation
            
        Returns:
            List of question dictionaries with proper format
        """
        try:
            logger.info(f"Generating {count} {level} {sport} questions for battle {battle_id} in {language}")
            
            # Create unique context for this battle
            battle_context = f"Battle ID: {battle_id}" if battle_id else f"Session: {int(time.time())}"
            
            # First generate questions in English
            english_prompt = self._build_question_prompt(sport, level, count, battle_context, "en")
            english_response = self.model.generate_content(english_prompt)
            
            if not english_response.text:
                logger.error("Empty response from Gemini API")
                return self._get_fallback_questions(sport, level, count, language)
            
            # Parse English questions
            english_questions = self._parse_ai_response(english_response.text, sport, level)
            
            # Validate questions with sport-specific constraints
            validated_questions = self._validate_questions(english_questions, count, sport)
            
            # If target language is English, return the questions
            if language == "en":
                return self._finalize_questions(validated_questions, battle_id)
            
            # For other languages, translate the questions
            translation_prompt = self._build_translation_prompt(validated_questions, language)
            translation_response = self.model.generate_content(translation_prompt)
            
            if not translation_response.text:
                logger.error("Empty translation response from Gemini API")
                return self._get_fallback_questions(sport, level, count, language)
            
            # Parse translated questions
            translated_questions = self._parse_ai_response(translation_response.text, sport, level)
            
            # Validate and format questions
            validated_translated_questions = self._validate_questions(translated_questions, count, sport)
            
            # Add labels and ensure uniqueness
            final_questions = self._finalize_questions(validated_translated_questions, battle_id)
            
            logger.info(f"Successfully generated and translated {len(final_questions)} questions for {sport} {level} in {language}")
            return final_questions
            
        except Exception as e:
            logger.error(f"Error generating AI questions: {str(e)}")
            return self._get_fallback_questions(sport, level, count, language)
    
    def _build_question_prompt(self, sport: str, level: str, count: int, battle_context: str, language: str = "en") -> str:
        """Build a comprehensive prompt for question generation with enhanced sport-specific details"""
        
        # Detailed sport-specific question generation guidelines
        sport_guidelines = {
            "tennis": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "court dimensions", 
                        "scoring system", 
                        "famous tournaments", 
                        "equipment"
                    ],
                    "example_topics": [
                        "How many sets are needed to win a Grand Slam match for men and women?",
                        "What are the dimensions of a standard tennis court?",
                        "What does 'love' mean in tennis scoring?",
                        "Name the four Grand Slam tournaments in order of their occurrence in the year",
                        "What is the official diameter of a tennis ball?"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "tournament histories", 
                        "surface types", 
                        "famous rivalries", 
                        "technical rules"
                    ],
                    "example_topics": [
                        "Which player has the most Grand Slam singles titles in tennis history?",
                        "What are the characteristics of clay, grass, and hard court surfaces?",
                        "Explain the tiebreak rule in tennis and when it is used",
                        "Describe the most famous tennis rivalries in modern history",
                        "How do professional tennis players earn ranking points?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced tactics", 
                        "statistical records", 
                        "technical strategies", 
                        "historical innovations", 
                        "complex rule interpretations"
                    ],
                    "example_topics": [
                        "Analyze the physics behind different types of tennis spin (topspin, backspin, sidespin)",
                        "What is the most challenging record in professional tennis and why?",
                        "Compare and contrast playing strategies on different court surfaces",
                        "How has tennis racket technology evolved to improve player performance?",
                        "Explain the most complex rules in professional tennis tournaments, including Hawk-Eye technology"
                    ]
                }
            },
            "soccer": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "team composition", 
                        "field dimensions", 
                        "famous players", 
                        "scoring"
                    ],
                    "example_topics": [
                        "How many players are on a soccer field during a match?",
                        "What is the size of a soccer goal?",
                        "Explain the offside rule simply",
                        "Name the most famous soccer players",
                        "How is a goal scored in soccer?"
                    ]
                },
                "medium": {
                    "topics": [
                        "team histories", 
                        "tournament details", 
                        "player achievements", 
                        "tactical formations", 
                        "international competitions"
                    ],
                    "example_topics": [
                        "Which national team has won the most World Cups?",
                        "Explain the different soccer formations",
                        "What is the significance of the Champions League?",
                        "Describe famous soccer team rivalries",
                        "How do soccer leagues and promotions work?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced tactics", 
                        "statistical analysis", 
                        "technical skills", 
                        "historical innovations", 
                        "complex strategic insights"
                    ],
                    "example_topics": [
                        "Analyze the tactical evolution of soccer over decades",
                        "Explain the most complex soccer strategies",
                        "What are the most advanced player performance metrics?",
                        "Describe the technical differences between soccer playing styles",
                        "How do soccer teams develop unique tactical approaches?"
                    ]
                }
            },
            "basketball": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "scoring", 
                        "court dimensions", 
                        "team composition", 
                        "equipment"
                    ],
                    "example_topics": [
                        "How many points is a three-pointer worth?",
                        "What is the size of a basketball court?",
                        "How many players are on a basketball team?",
                        "What are the basic rules of basketball?",
                        "Describe the different types of basketball shots"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "team histories", 
                        "tactical strategies", 
                        "famous tournaments", 
                        "league structures"
                    ],
                    "example_topics": [
                        "Which NBA team has won the most championships?",
                        "Explain different basketball defensive strategies",
                        "What is the structure of the NBA playoffs?",
                        "Describe famous basketball player rivalries",
                        "How do basketball draft picks work?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced analytics", 
                        "strategic innovations", 
                        "technical skill analysis", 
                        "historical tactical changes", 
                        "complex performance metrics"
                    ],
                    "example_topics": [
                        "Analyze the evolution of basketball offensive strategies",
                        "What are the most advanced basketball performance metrics?",
                        "Describe the technical differences between playing styles",
                        "How do teams develop unique basketball tactics?",
                        "Explain the most complex basketball statistical analyses"
                    ]
                }
            },
            "baseball": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "field layout", 
                        "scoring", 
                        "team composition", 
                        "equipment"
                    ],
                    "example_topics": [
                        "How many innings are in a baseball game?",
                        "What is a home run?",
                        "How many players are on a baseball team?",
                        "What are the basic rules of baseball?",
                        "Describe the different types of baseball pitches"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "team histories", 
                        "league structures", 
                        "famous tournaments", 
                        "tactical strategies"
                    ],
                    "example_topics": [
                        "Which team has won the most World Series?",
                        "Explain different baseball defensive strategies",
                        "What is the structure of Major League Baseball?",
                        "Describe famous baseball player rivalries",
                        "How do baseball trades and drafts work?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced analytics", 
                        "strategic innovations", 
                        "technical skill analysis", 
                        "historical tactical changes", 
                        "complex performance metrics"
                    ],
                    "example_topics": [
                        "Analyze the evolution of baseball batting techniques",
                        "What are the most advanced baseball performance metrics?",
                        "Describe the technical differences between pitching styles",
                        "How do teams develop unique baseball tactics?",
                        "Explain the most complex baseball statistical analyses"
                    ]
                }
            },
            "hockey": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "rink layout", 
                        "scoring", 
                        "team composition", 
                        "equipment"
                    ],
                    "example_topics": [
                        "How many players are on the ice during a hockey game?",
                        "What is a power play?",
                        "How is a goal scored in hockey?",
                        "What are the basic rules of hockey?",
                        "Describe the different types of hockey penalties"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "team histories", 
                        "league structures", 
                        "famous tournaments", 
                        "tactical strategies"
                    ],
                    "example_topics": [
                        "Which team has won the most Stanley Cups?",
                        "Explain different hockey defensive strategies",
                        "What is the structure of the NHL?",
                        "Describe famous hockey player rivalries",
                        "How do hockey trades and drafts work?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced analytics", 
                        "strategic innovations", 
                        "technical skill analysis", 
                        "historical tactical changes", 
                        "complex performance metrics"
                    ],
                    "example_topics": [
                        "Analyze the evolution of hockey offensive strategies",
                        "What are the most advanced hockey performance metrics?",
                        "Describe the technical differences between playing styles",
                        "How do teams develop unique hockey tactics?",
                        "Explain the most complex hockey statistical analyses"
                    ]
                }
            },
            "golf": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "course layout", 
                        "scoring", 
                        "equipment", 
                        "tournament formats"
                    ],
                    "example_topics": [
                        "What is par in golf?",
                        "How many clubs can a golfer carry?",
                        "What is a birdie?",
                        "What are the basic rules of golf?",
                        "Describe the different types of golf shots"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "tournament histories", 
                        "famous courses", 
                        "major championships", 
                        "scoring techniques"
                    ],
                    "example_topics": [
                        "Which golfer has won the most major championships?",
                        "What are the four major golf tournaments?",
                        "Explain the Ryder Cup",
                        "Describe famous golf course challenges",
                        "How do golf rankings work?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced techniques", 
                        "statistical analysis", 
                        "course strategy", 
                        "equipment technology", 
                        "complex performance metrics"
                    ],
                    "example_topics": [
                        "Analyze the physics of golf swing techniques",
                        "What are the most advanced golf performance metrics?",
                        "Describe the technical evolution of golf equipment",
                        "How do professional golfers strategize course play?",
                        "Explain the most complex golf statistical analyses"
                    ]
                }
            },
            "cricket": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "field layout", 
                        "scoring", 
                        "team composition", 
                        "equipment"
                    ],
                    "example_topics": [
                        "How many players are in a cricket team?",
                        "What is a wicket?",
                        "How is a run scored in cricket?",
                        "What are the basic rules of cricket?",
                        "Describe the different types of cricket deliveries"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "tournament histories", 
                        "league structures", 
                        "famous international competitions", 
                        "tactical strategies"
                    ],
                    "example_topics": [
                        "Which team has won the most Cricket World Cups?",
                        "Explain different cricket batting strategies",
                        "What is the structure of the IPL?",
                        "Describe famous cricket player rivalries",
                        "How do cricket tournaments and rankings work?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced analytics", 
                        "strategic innovations", 
                        "technical skill analysis", 
                        "historical tactical changes", 
                        "complex performance metrics"
                    ],
                    "example_topics": [
                        "Analyze the evolution of cricket bowling techniques",
                        "What are the most advanced cricket performance metrics?",
                        "Describe the technical differences between playing styles",
                        "How do teams develop unique cricket tactics?",
                        "Explain the most complex cricket statistical analyses"
                    ]
                }
            },
            "volleyball": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "court layout", 
                        "scoring", 
                        "team composition", 
                        "equipment"
                    ],
                    "example_topics": [
                        "How many players are on a volleyball team?",
                        "What is a rally?",
                        "How is a point scored in volleyball?",
                        "What are the basic rules of volleyball?",
                        "Describe the different types of volleyball serves"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "tournament histories", 
                        "league structures", 
                        "famous international competitions", 
                        "tactical strategies"
                    ],
                    "example_topics": [
                        "Which country has won the most Olympic volleyball medals?",
                        "Explain different volleyball defensive strategies",
                        "What is the structure of international volleyball tournaments?",
                        "Describe famous volleyball player achievements",
                        "How do volleyball rankings and leagues work?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced analytics", 
                        "strategic innovations", 
                        "technical skill analysis", 
                        "historical tactical changes", 
                        "complex performance metrics"
                    ],
                    "example_topics": [
                        "Analyze the evolution of volleyball offensive strategies",
                        "What are the most advanced volleyball performance metrics?",
                        "Describe the technical differences between playing styles",
                        "How do teams develop unique volleyball tactics?",
                        "Explain the most complex volleyball statistical analyses"
                    ]
                }
            },
            "rugby": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "field layout", 
                        "scoring", 
                        "team composition", 
                        "equipment"
                    ],
                    "example_topics": [
                        "How many players are on a rugby team?",
                        "What is a try?",
                        "How is a point scored in rugby?",
                        "What are the basic rules of rugby?",
                        "Describe the different types of rugby passes"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "tournament histories", 
                        "league structures", 
                        "famous international competitions", 
                        "tactical strategies"
                    ],
                    "example_topics": [
                        "Which team has won the most Rugby World Cups?",
                        "Explain different rugby defensive strategies",
                        "What is the structure of international rugby tournaments?",
                        "Describe famous rugby player rivalries",
                        "How do rugby rankings and leagues work?"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced analytics", 
                        "strategic innovations", 
                        "technical skill analysis", 
                        "historical tactical changes", 
                        "complex performance metrics"
                    ],
                    "example_topics": [
                        "Analyze the evolution of rugby offensive strategies",
                        "What are the most advanced rugby performance metrics?",
                        "Describe the technical differences between playing styles",
                        "How do teams develop unique rugby tactics?",
                        "Explain the most complex rugby statistical analyses"
                    ]
                }
            }
        }
        
        # Difficulty-specific guidelines
        difficulty_guidelines = {
            "easy": "Basic facts, common knowledge, straightforward questions",
            "medium": "Intermediate knowledge, historical facts, player achievements",
            "hard": "Advanced analysis, complex strategies, in-depth technical understanding"
        }
        
        # Language-specific instructions
        language_instructions = {
            "en": "Generate questions in English.",
            "ru": "Generate questions in Russian. Use proper Russian grammar and sports terminology."
        }
        
        # Select sport-specific guidelines, default to general if not found
        sport_config = sport_guidelines.get(sport.lower(), {
            "easy": {"topics": ["general sports knowledge"], "example_topics": ["What is a sport?"]},
            "medium": {"topics": ["sports history"], "example_topics": ["What is a championship?"]},
            "hard": {"topics": ["sports strategy"], "example_topics": ["How do teams develop strategies?"]}
        })
        
        # Get level-specific configuration
        level_config = sport_config.get(level.lower(), sport_config.get("medium"))
        
        # Build comprehensive prompt
        prompt = f"""
You are an expert {sport} quiz question generator. Generate {count} unique, non-repetitive multiple-choice questions about {sport}.

Context: {battle_context}

Language Instructions: {language_instructions.get(language, language_instructions["en"])}

Difficulty Level: {level} - {difficulty_guidelines.get(level, "Medium difficulty")}

Specific Guidelines:
1. Focus on {", ".join(level_config["topics"])}
2. Avoid previously used question patterns
3. Ensure questions are engaging and test real knowledge
4. Include a mix of factual and analytical questions
5. Maintain the specified difficulty level

Potential Topic Areas:
{chr(10).join(f"- {topic}" for topic in level_config["topics"])}

Example Question Areas:
{chr(10).join(f"- {example}" for example in level_config["example_topics"])}

Requirements:
1. Each question must have exactly 4 answer options (A, B, C, D)
2. Only one answer must be correct
3. Questions must be accurate and factually correct
4. Avoid repetitive or similar questions
5. All text must be in {language.upper()} language

Format each question exactly as follows:
{{
    "question": "Your question text here?",
    "answers": [
        {{"text": "Answer A", "correct": true}},
        {{"text": "Answer B", "correct": false}},
        {{"text": "Answer C", "correct": false}},
        {{"text": "Answer D", "correct": false}}
    ],
    "time_limit": 30,
    "difficulty": "{level}"
}}

Return ONLY a valid JSON array containing exactly {count} unique question objects. Do not include any other text, explanations, or formatting.
"""
        
        return prompt
    
    def _get_soccer_examples(self, level: str, language: str = "en") -> str:
        """Get soccer-specific examples based on difficulty and language"""
        if language == "ru":
            if level == "easy":
                return '''
[
    {
        "question": "Сколько игроков в футбольной команде во время матча?",
        "answers": [
            {"text": "10", "correct": false},
            {"text": "11", "correct": true},
            {"text": "12", "correct": false},
            {"text": "9", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "easy"
    }
]'''
            elif level == "medium":
                return '''
[
    {
        "question": "Какая команда выиграла больше всего титулов Лиги чемпионов УЕФА?",
        "answers": [
            {"text": "Реал Мадрид", "correct": true},
            {"text": "Барселона", "correct": false},
            {"text": "Бавария Мюнхен", "correct": false},
            {"text": "Милан", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "medium"
    }
]'''
            else:  # hard
                return '''
[
    {
        "question": "Какой игрок забил больше всего голов за один сезон в Премьер-лиге?",
        "answers": [
            {"text": "Эрлинг Холанд (36 голов)", "correct": true},
            {"text": "Мохамед Салах (32 гола)", "correct": false},
            {"text": "Алан Ширер (34 гола)", "correct": false},
            {"text": "Энди Коул (34 гола)", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "hard"
    }
]'''
        else:  # English examples (default)
            if level == "easy":
                return '''
[
    {
        "question": "How many players are on a football team during a match?",
        "answers": [
            {"text": "10", "correct": false},
            {"text": "11", "correct": true},
            {"text": "12", "correct": false},
            {"text": "9", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "easy"
    }
]'''
            elif level == "medium":
                return '''
[
    {
        "question": "Which team has won the most UEFA Champions League titles?",
        "answers": [
            {"text": "Real Madrid", "correct": true},
            {"text": "Barcelona", "correct": false},
            {"text": "Bayern Munich", "correct": false},
            {"text": "AC Milan", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "medium"
    }
]'''
            else:  # hard
                return '''
[
    {
        "question": "Which player has scored the most goals in a single Premier League season?",
        "answers": [
            {"text": "Erling Haaland (36 goals)", "correct": true},
            {"text": "Mohamed Salah (32 goals)", "correct": false},
            {"text": "Alan Shearer (34 goals)", "correct": false},
            {"text": "Andy Cole (34 goals)", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "hard"
    }
]'''
    
    def _get_basketball_examples(self, level: str, language: str = "en") -> str:
        """Get basketball-specific examples based on difficulty and language"""
        if language == "ru":
            if level == "easy":
                return '''
[
    {
        "question": "Сколько очков стоит трехочковый бросок в баскетболе?",
        "answers": [
            {"text": "2", "correct": false},
            {"text": "3", "correct": true},
            {"text": "4", "correct": false},
            {"text": "5", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "easy"
    }
]'''
            elif level == "medium":
                return '''
[
    {
        "question": "Какая команда выиграла больше всего чемпионатов?",
        "answers": [
            {"text": "Бостон Селтикс", "correct": true},
            {"text": "Лос-Анджелес Лейкерс", "correct": false},
            {"text": "Чикаго Буллз", "correct": false},
            {"text": "Голден Стейт Уорриорз", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "medium"
    }
]'''
            else:  # hard
                return '''
[
    {
        "question": "Какой рекорд для наибольшего количества очков, набранного в одной игре NBA?",
        "answers": [
            {"text": "100 очков (Уилт Чемберлен)", "correct": true},
            {"text": "81 очко (Коби Брайант)", "correct": false},
            {"text": "73 очка (Дэвид Томпсон)", "correct": false},
            {"text": "69 очков (Майкл Джордан)", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "hard"
    }
]'''
        else:  # English examples (default)
            if level == "easy":
                return '''
[
    {
        "question": "How many points is a three-pointer worth in basketball?",
        "answers": [
            {"text": "2", "correct": false},
            {"text": "3", "correct": true},
            {"text": "4", "correct": false},
            {"text": "5", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "easy"
    }
]'''
            elif level == "medium":
                return '''
[
    {
        "question": "Which NBA team has won the most championships?",
        "answers": [
            {"text": "Boston Celtics", "correct": true},
            {"text": "Los Angeles Lakers", "correct": false},
            {"text": "Chicago Bulls", "correct": false},
            {"text": "Golden State Warriors", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "medium"
    }
]'''
            else:  # hard
                return '''
[
    {
        "question": "What is the record for most points scored in a single NBA game?",
        "answers": [
            {"text": "100 points (Wilt Chamberlain)", "correct": true},
            {"text": "81 points (Kobe Bryant)", "correct": false},
            {"text": "73 points (David Thompson)", "correct": false},
            {"text": "69 points (Michael Jordan)", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "hard"
    }
]'''
    
    def _get_tennis_examples(self, level: str, language: str = "en") -> str:
        """Get tennis-specific examples based on difficulty and language"""
        if language == "ru":
            if level == "easy":
                return '''
[
    {
        "question": "Сколько турниров Гранд-Слоун в теннисе?",
        "answers": [
            {"text": "3", "correct": false},
            {"text": "4", "correct": true},
            {"text": "5", "correct": false},
            {"text": "6", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "easy"
    }
]'''
            elif level == "medium":
                return '''
[
    {
        "question": "Какой игрок выиграл больше всего титулов Уимблдона?",
        "answers": [
            {"text": "Роджер Федерер", "correct": true},
            {"text": "Питер Сампрас", "correct": false},
            {"text": "Рафаэль Надаль", "correct": false},
            {"text": "Новак Джокович", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "medium"
    }
]'''
            else:  # hard
                return '''
[
    {
        "question": "Какой игрок имеет наибольшее количество сервисов в турнирах Гранд-Слоун?",
        "answers": [
            {"text": "Иво Каралович", "correct": true},
            {"text": "Джон Изнер", "correct": false},
            {"text": "Роджер Федерер", "correct": false},
            {"text": "Питер Сампрас", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "hard"
    }
]'''
        else:  # English examples (default)
            if level == "easy":
                return '''
[
    {
        "question": "How many Grand Slam tournaments are there in tennis?",
        "answers": [
            {"text": "3", "correct": false},
            {"text": "4", "correct": true},
            {"text": "5", "correct": false},
            {"text": "6", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "easy"
    }
]'''
            elif level == "medium":
                return '''
[
    {
        "question": "Which player has won the most Wimbledon titles?",
        "answers": [
            {"text": "Roger Federer", "correct": true},
            {"text": "Pete Sampras", "correct": false},
            {"text": "Rafael Nadal", "correct": false},
            {"text": "Novak Djokovic", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "medium"
    }
]'''
            else:  # hard
                return '''
[
    {
        "question": "Which player has the most career aces in Grand Slam tournaments?",
        "answers": [
            {"text": "Ivo Karlović", "correct": true},
            {"text": "John Isner", "correct": false},
            {"text": "Roger Federer", "correct": false},
            {"text": "Pete Sampras", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "hard"
    }
]'''
    
    def _get_general_examples(self, level: str, language: str = "en") -> str:
        """Get general sports examples"""
        return '''
[
    {
        "question": "What is the primary objective in most team sports?",
        "answers": [
            {"text": "Score more points than the opponent", "correct": true},
            {"text": "Have the most possession time", "correct": false},
            {"text": "Make the most passes", "correct": false},
            {"text": "Run the fastest", "correct": false}
        ],
        "time_limit": 30,
        "difficulty": "easy"
    }
]'''
    
    def _parse_ai_response(self, response_text: str, sport: str, level: str) -> List[Dict[str, Any]]:
        """Parse the AI response and extract questions"""
        try:
            # Clean the response text
            cleaned_text = response_text.strip()
            
            # Remove any markdown formatting
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
            
            cleaned_text = cleaned_text.strip()
            
            # Parse JSON
            questions = json.loads(cleaned_text)
            
            if not isinstance(questions, list):
                logger.error("AI response is not a list")
                return []
            
            return questions
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {str(e)}")
            logger.error(f"Response text: {response_text}")
            return []
        except Exception as e:
            logger.error(f"Error parsing AI response: {str(e)}")
            return []
    
    def _validate_questions(self, questions: List[Dict[str, Any]], expected_count: int, sport: str = None) -> List[Dict[str, Any]]:
        """Validate and clean questions with sport-specific constraints and diversity checks"""
        validated_questions = []
        used_topics = set()
        used_question_patterns = set()
        
        # Sport-specific validation rules (same as in previous edit)
        sport_constraints = {
            "tennis": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "court dimensions", 
                        "scoring system", 
                        "famous tournaments", 
                        "equipment"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "tournament histories", 
                        "surface types", 
                        "famous rivalries", 
                        "technical rules"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced tactics", 
                        "statistical records", 
                        "technical strategies", 
                        "historical innovations", 
                        "complex rule interpretations"
                    ]
                }
            },
            "soccer": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "team composition", 
                        "field dimensions", 
                        "famous players", 
                        "scoring"
                    ]
                },
                "medium": {
                    "topics": [
                        "team histories", 
                        "tournament details", 
                        "player achievements", 
                        "tactical formations", 
                        "international competitions"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced tactics", 
                        "statistical analysis", 
                        "technical skills", 
                        "historical innovations", 
                        "complex strategic insights"
                    ]
                }
            },
            "basketball": {
                "easy": {
                    "topics": [
                        "basic rules", 
                        "scoring", 
                        "court dimensions", 
                        "team composition", 
                        "equipment"
                    ]
                },
                "medium": {
                    "topics": [
                        "player achievements", 
                        "team histories", 
                        "tactical strategies", 
                        "famous tournaments", 
                        "league structures"
                    ]
                },
                "hard": {
                    "topics": [
                        "advanced analytics", 
                        "strategic innovations", 
                        "technical skill analysis", 
                        "historical tactical changes", 
                        "complex performance metrics"
                    ]
                }
            }
        }
        
        def is_question_unique(question: Dict[str, Any]) -> bool:
            """Check if the question is unique based on various criteria"""
            # Extract key features of the question
            question_text = question.get('question', '').lower()
            question_topics = [topic for topic in sport_constraints.get(sport.lower(), {}).get(level.lower(), {}).get('topics', []) if topic.lower() in question_text]
            
            # Check against used topics and question patterns
            topic_match = any(topic in used_topics for topic in question_topics)
            pattern_match = any(pattern in question_text for pattern in used_question_patterns)
            
            return not (topic_match or pattern_match)
        
        for i, question in enumerate(questions):
            try:
                # Existing validation checks
                if not all(key in question for key in ["question", "answers"]):
                    logger.warning(f"Question {i} missing required fields, skipping")
                    continue
                
                # Validate answers
                answers = question.get("answers", [])
                if not isinstance(answers, list) or len(answers) != 4:
                    logger.warning(f"Question {i} has invalid answers format, skipping")
                    continue
                
                # Check that exactly one answer is correct
                correct_answers = [ans for ans in answers if ans.get("correct", False)]
                if len(correct_answers) != 1:
                    logger.warning(f"Question {i} must have exactly one correct answer, skipping")
                    continue
                
                # Validate answer format
                for j, answer in enumerate(answers):
                    if not isinstance(answer, dict) or "text" not in answer:
                        logger.warning(f"Question {i} answer {j} has invalid format, skipping")
                        continue
                
                # Sport-specific and diversity validation
                if sport and sport.lower() in sport_constraints:
                    sport_config = sport_constraints[sport.lower()]
                    difficulty = question.get("difficulty", "medium").lower()
                    
                    # Check if question contains sport-specific topics
                    if not any(topic in question.get("question", "").lower() for topic in sport_config.get(difficulty, {}).get("topics", [])):
                        logger.warning(f"Question {i} does not relate to {sport} topics, skipping")
                        continue
                
                # Uniqueness check
                if not is_question_unique(question):
                    logger.warning(f"Question {i} is too similar to previous questions, skipping")
                    continue
                
                # Update used topics and patterns
                question_text = question.get('question', '').lower()
                question_topics = [topic for topic in sport_constraints.get(sport.lower(), {}).get(level.lower(), {}).get('topics', []) if topic.lower() in question_text]
                used_topics.update(question_topics)
                used_question_patterns.add(question_text)
                
                # Add default values
                question.setdefault("time_limit", 30)
                question.setdefault("difficulty", "medium")
                
                validated_questions.append(question)
                
                # Stop if we have enough unique questions
                if len(validated_questions) == expected_count:
                    break
                
            except Exception as e:
                logger.error(f"Error validating question {i}: {str(e)}")
                continue
        
        # If we don't have enough questions, add fallback questions
        if len(validated_questions) < expected_count:
            logger.warning(f"Only got {len(validated_questions)} valid questions, adding fallback questions")
            fallback_questions = self._get_fallback_questions(sport or "football", "easy", expected_count - len(validated_questions))
            validated_questions.extend(fallback_questions)
        
        return validated_questions[:expected_count]
    
    def _finalize_questions(self, questions: List[Dict[str, Any]], battle_id: str) -> List[Dict[str, Any]]:
        """Add labels and ensure uniqueness"""
        for question in questions:
            # Shuffle answers to randomize correct answer position
            answers = question.get('answers', [])
            random.shuffle(answers)
            
            # Add labels to answers after shuffling
            labels = ['A', 'B', 'C', 'D']
            for i, answer in enumerate(answers):
                answer['label'] = labels[i]
            
            # Update the question with shuffled answers
            question['answers'] = answers
            
            # Add battle context for uniqueness
            if battle_id:
                question['battle_id'] = battle_id
        
        return questions
    
    def _get_fallback_questions(self, sport: str, level: str, count: int, language: str = "en") -> List[Dict[str, Any]]:
        """Get fallback questions when AI generation fails"""
        logger.info(f"Using fallback questions for {sport} {level} in {language}")
        
        # Simple fallback questions
        fallback_questions = [
            {
                "question": f"What is the primary objective in {sport}?",
                "answers": [
                    {"text": "Score more points than the opponent", "correct": True, "label": "A"},
                    {"text": "Have the most possession time", "correct": False, "label": "B"},
                    {"text": "Make the most passes", "correct": False, "label": "C"},
                    {"text": "Run the fastest", "correct": False, "label": "D"}
                ],
                "time_limit": 30,
                "difficulty": level
            },
            {
                "question": f"How many players are typically on a {sport} team?",
                "answers": [
                    {"text": "5-11 players", "correct": True, "label": "A"},
                    {"text": "1-3 players", "correct": False, "label": "B"},
                    {"text": "15-20 players", "correct": False, "label": "C"},
                    {"text": "25-30 players", "correct": False, "label": "D"}
                ],
                "time_limit": 30,
                "difficulty": level
            }
        ]
        
        # Repeat questions if needed
        while len(fallback_questions) < count:
            fallback_questions.extend(fallback_questions[:count - len(fallback_questions)])
        
        return fallback_questions[:count]
    
    def _build_translation_prompt(self, questions: List[Dict[str, Any]], target_language: str) -> str:
        """Build a prompt for translating questions to the target language"""
        
        language_names = {
            "ru": "Russian (русский)",
            "en": "English"
        }
        
        questions_json = json.dumps(questions, indent=2, ensure_ascii=False)
        
        prompt = f"""
You are an expert sports translator. Translate the following sports quiz questions from English to {language_names.get(target_language, target_language)}.

Important requirements:
1. Maintain the exact same JSON structure
2. Translate all text fields (question and answer texts) into {language_names.get(target_language, target_language)}
3. Keep all other fields (difficulty, time_limit, etc.) unchanged
4. Ensure proper grammar and sports terminology in {language_names.get(target_language, target_language)}
5. Keep the same meaning and difficulty level
6. Keep the same correct/incorrect answer flags

Questions to translate:
{questions_json}

Return ONLY the translated JSON array with exactly the same structure. Do not include any other text or explanations.
"""
        return prompt

    def translate_flashcards(self, flashcards: List[Dict[str, Any]], target_language: str) -> List[Dict[str, Any]]:
        """
        Translate flashcards to the target language
        
        Args:
            flashcards: List of flashcard dictionaries
            target_language: Language code (en, ru) for translation
            
        Returns:
            List of translated flashcard dictionaries
        """
        try:
            if target_language == "en":
                return flashcards
                
            logger.info(f"Translating {len(flashcards)} flashcards to {target_language}")
            
            # Build translation prompt for flashcards
            translation_prompt = self._build_flashcard_translation_prompt(flashcards, target_language)
            translation_response = self.model.generate_content(translation_prompt)
            
            if not translation_response.text:
                logger.error("Empty translation response from Gemini API")
                return flashcards
            
            try:
                translated_flashcards = json.loads(translation_response.text)
                if isinstance(translated_flashcards, list):
                    logger.info(f"Successfully translated {len(translated_flashcards)} flashcards to {target_language}")
                    return translated_flashcards
                else:
                    logger.error("Invalid translation response format")
                    return flashcards
            except json.JSONDecodeError:
                logger.error("Failed to parse translated flashcards JSON")
                return flashcards
                
        except Exception as e:
            logger.error(f"Error translating flashcards: {str(e)}")
            return flashcards

    def _build_flashcard_translation_prompt(self, flashcards: List[Dict[str, Any]], target_language: str) -> str:
        """Build a prompt for translating flashcards to the target language"""
        
        language_names = {
            "ru": "Russian (русский)",
            "en": "English"
        }
        
        flashcards_json = json.dumps(flashcards, indent=2, ensure_ascii=False)
        
        prompt = f"""
You are an expert sports translator. Translate the following sports flashcards from English to {language_names.get(target_language, target_language)}.

Important requirements:
1. Maintain the exact same JSON structure
2. Translate only the 'term' and 'definition' fields into {language_names.get(target_language, target_language)}
3. Keep all other fields (id, sport, level, source, etc.) unchanged
4. Ensure proper grammar and sports terminology in {language_names.get(target_language, target_language)}
5. Keep the same meaning and difficulty level
6. Preserve any special formatting or numbers in the text

Flashcards to translate:
{flashcards_json}

Return ONLY the translated JSON array with exactly the same structure. Do not include any other text or explanations.
"""
        return prompt

# Global instance
ai_quiz_generator = AIQuizGenerator() 