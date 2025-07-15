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
        # FORCIBLY convert football to soccer
        if sport.lower() in ['football', 'american football']:
            sport = 'soccer'
        
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
            
            # If target language is English, return the questions
            if language == "en":
                validated_questions = self._validate_questions(english_questions, count)
                return self._finalize_questions(validated_questions, battle_id)
            
            # For other languages, translate the questions
            translation_prompt = self._build_translation_prompt(english_questions, language)
            translation_response = self.model.generate_content(translation_prompt)
            
            if not translation_response.text:
                logger.error("Empty translation response from Gemini API")
                return self._get_fallback_questions(sport, level, count, language)
            
            # Parse translated questions
            translated_questions = self._parse_ai_response(translation_response.text, sport, level)
            
            # Validate and format questions
            validated_questions = self._validate_questions(translated_questions, count)
            
            # Add labels and ensure uniqueness
            final_questions = self._finalize_questions(validated_questions, battle_id)
            
            logger.info(f"Successfully generated and translated {len(final_questions)} questions for {sport} {level} in {language}")
            return final_questions
            
        except Exception as e:
            logger.error(f"Error generating AI questions: {str(e)}")
            return self._get_fallback_questions(sport, level, count, language)
    
    def _build_question_prompt(self, sport: str, level: str, count: int, battle_context: str, language: str = "en") -> str:
        """Build a comprehensive prompt for question generation"""
        
        # FORCIBLY convert football to soccer
        if sport.lower() in ['football', 'american football']:
            sport = 'soccer'
        
        difficulty_guidelines = {
            "easy": "Basic facts, rules, and common knowledge that most soccer fans would know",
            "medium": "Historical facts, notable players, championships, and intermediate-level soccer knowledge",
            "hard": "Detailed statistics, records, specific dates, advanced rules, and expert-level soccer knowledge"
        }
        
        # Language-specific instructions
        language_instructions = {
            "en": "Generate questions ONLY about soccer (association football). NO American football questions allowed.",
            "ru": "Generate questions ONLY about soccer (association football). NO American football questions allowed."
        }
        
        prompt = f"""
You are an expert SOCCER quiz question generator. Generate exactly {count} unique multiple-choice questions about SOCCER.

CRITICAL RULES:
1. ONLY generate soccer (association football) questions
2. NO American football questions are allowed under ANY circumstances
3. Focus exclusively on soccer/football (the sport played with feet)

Context: {battle_context}

Language Instructions: {language_instructions.get(language, language_instructions["en"])}

Requirements:
1. Difficulty Level: {level} - {difficulty_guidelines.get(level, "Medium difficulty")}
2. Each question must have exactly 4 answer options (A, B, C, D)
3. Only one answer must be correct
4. Questions must be accurate and factually correct about SOCCER
5. Avoid repetitive or similar questions
6. Include a mix of topics: soccer rules, history, players, statistics, championships, etc.
7. All text must be in {language.upper()} language

Format each question exactly as follows:
{{
    "question": "Your soccer question text here?",
    "answers": [
        {{"text": "Answer A", "correct": true}},
        {{"text": "Answer B", "correct": false}},
        {{"text": "Answer C", "correct": false}},
        {{"text": "Answer D", "correct": false}}
    ],
    "time_limit": 30,
    "difficulty": "{level}"
}}

Return ONLY a valid JSON array containing exactly {count} soccer question objects. Do not include any other text, explanations, or formatting.

Example for SOCCER {level} questions in {language.upper()}:
"""
        
        # Use soccer-specific examples
        prompt += self._get_football_examples(level, language)
        
        return prompt
    
    def _get_football_examples(self, level: str, language: str) -> str:
        """Generate soccer-specific examples to guide AI question generation"""
        soccer_examples = {
            "easy": [
                {
                    "question": "What is the primary objective in a soccer match?",
                    "answers": [
                        {"text": "Score more goals than the opponent", "correct": True},
                        {"text": "Tackle the most players", "correct": False},
                        {"text": "Keep the ball for the longest time", "correct": False},
                        {"text": "Have the most corner kicks", "correct": False}
                    ]
                },
                {
                    "question": "How many players are on the field for each team during a soccer match?",
                    "answers": [
                        {"text": "11 players", "correct": True},
                        {"text": "10 players", "correct": False},
                        {"text": "9 players", "correct": False},
                        {"text": "12 players", "correct": False}
                    ]
                }
            ],
            "medium": [
                {
                    "question": "What is the name of the most prestigious club competition in European soccer?",
                    "answers": [
                        {"text": "UEFA Champions League", "correct": True},
                        {"text": "FIFA World Cup", "correct": False},
                        {"text": "Europa League", "correct": False},
                        {"text": "Premier League", "correct": False}
                    ]
                },
                {
                    "question": "Which country has won the most FIFA World Cup titles?",
                    "answers": [
                        {"text": "Brazil", "correct": True},
                        {"text": "Germany", "correct": False},
                        {"text": "Italy", "correct": False},
                        {"text": "Argentina", "correct": False}
                    ]
                }
            ],
            "hard": [
                {
                    "question": "What is the offside rule in soccer?",
                    "answers": [
                        {"text": "A player is in an offside position if closer to the opponent's goal line than both the ball and the second-last opponent", "correct": True},
                        {"text": "A player cannot pass the ball backwards", "correct": False},
                        {"text": "A player must stay within their half of the field", "correct": False},
                        {"text": "A player cannot touch the ball with their hands", "correct": False}
                    ]
                },
                {
                    "question": "Who holds the record for most goals in a single FIFA World Cup tournament?",
                    "answers": [
                        {"text": "Just Fontaine (France, 1958)", "correct": True},
                        {"text": "Miroslav Klose (Germany, 2014)", "correct": False},
                        {"text": "Ronaldo (Brazil, 2002)", "correct": False},
                        {"text": "Gerd Müller (Germany, 1970)", "correct": False}
                    ]
                }
            ]
        }
        
        # Convert to JSON string for AI prompt
        return json.dumps(soccer_examples.get(level, soccer_examples["medium"]), indent=2)
    
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
    
    def _validate_questions(self, questions: List[Dict[str, Any]], expected_count: int) -> List[Dict[str, Any]]:
        """Validate and clean questions"""
        validated_questions = []
        
        for i, question in enumerate(questions):
            try:
                # Check required fields
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
                
                # Add default values
                question.setdefault("time_limit", 30)
                question.setdefault("difficulty", "medium")
                
                validated_questions.append(question)
                
            except Exception as e:
                logger.error(f"Error validating question {i}: {str(e)}")
                continue
        
        # If we don't have enough questions, add fallback questions
        if len(validated_questions) < expected_count:
            logger.warning(f"Only got {len(validated_questions)} valid questions, adding fallback questions")
            fallback_questions = self._get_fallback_questions("football", "easy", expected_count - len(validated_questions))
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