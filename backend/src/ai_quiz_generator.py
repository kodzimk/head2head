import os
import json
import google.generativeai as genai
from typing import List, Dict, Any, Optional
import logging
import random
import time
import asyncio
from .config import get_next_google_api_key

logger = logging.getLogger(__name__)

class AIQuizGenerator:
    def __init__(self):
        self.used_questions = set()  # Track used questions to ensure uniqueness
        
    async def generate_questions_with_key(self, sport: str, level: str, count: int, battle_id: Optional[str], language: str, api_key: str) -> List[Dict[str, Any]]:
        """Generate questions using a specific API key"""
        try:
            # Configure API for this instance
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            # Create unique context for this battle
            battle_context = f"Battle ID: {battle_id}" if battle_id else f"Session: {int(time.time())}"
            
            # Generate questions in English
            english_prompt = self._build_question_prompt(sport, level, count, battle_context, "en")
            english_response = model.generate_content(english_prompt)
            
            if not english_response.text:
                logger.error(f"Empty response from Gemini API with key ending in ...{api_key[-4:]}")
                return []
            
            # Parse English questions
            english_questions = self._parse_ai_response(english_response.text, sport, level)
            
            # If target language is English, return the questions
            if language == "en":
                validated_questions = self._validate_questions(english_questions, count)
                return self._finalize_questions(validated_questions, battle_id)
            
            # For other languages, translate the questions
            translation_prompt = self._build_translation_prompt(english_questions, language)
            translation_response = model.generate_content(translation_prompt)
            
            if not translation_response.text:
                logger.error(f"Empty translation response from Gemini API with key ending in ...{api_key[-4:]}")
                return []
            
            # Parse translated questions
            translated_questions = self._parse_ai_response(translation_response.text, sport, level)
            
            # Validate and format questions
            validated_questions = self._validate_questions(translated_questions, count)
            final_questions = self._finalize_questions(validated_questions, battle_id)
            
            logger.info(f"Successfully generated {len(final_questions)} questions with key ending in ...{api_key[-4:]}")
            return final_questions
            
        except Exception as e:
            logger.error(f"Error generating AI questions with key ending in ...{api_key[-4:]}: {str(e)}")
            return []

    async def generate_questions(self, sport: str, level: str, count: int = 5, battle_id: str = None, language: str = "en") -> List[Dict[str, Any]]:
        """
        Generate unique sports quiz questions using multiple Gemini AI instances in parallel
        """
        try:
            # Get multiple API keys
            api_key1 = get_next_google_api_key()
            api_key2 = get_next_google_api_key()
            
            # Split the question count between two API keys
            count1 = count // 2
            count2 = count - count1
            
            # Generate questions in parallel
            tasks = [
                self.generate_questions_with_key(sport, level, count1, battle_id, language, api_key1),
                self.generate_questions_with_key(sport, level, count2, battle_id, language, api_key2)
            ]
            
            # Wait for both tasks to complete
            results = await asyncio.gather(*tasks)
            
            # Combine and validate results
            all_questions = []
            for questions in results:
                all_questions.extend(questions)
            
            # If we don't have enough questions, use fallback
            if len(all_questions) < count:
                logger.warning(f"Not enough questions generated ({len(all_questions)}/{count}). Using fallback.")
                return self._get_fallback_questions(sport, level, count, language)
            
            # Ensure we have exactly the requested number of questions
            validated_questions = self._validate_questions(all_questions, count)
            final_questions = self._finalize_questions(validated_questions, battle_id)
            
            logger.info(f"Successfully generated {len(final_questions)} questions using multiple API keys")
            return final_questions
            
        except Exception as e:
            logger.error(f"Error in parallel question generation: {str(e)}")
            return self._get_fallback_questions(sport, level, count, language)
    
    def _build_question_prompt(self, sport: str, level: str, count: int, battle_context: str, language: str = "en") -> str:
        """Build a comprehensive prompt for question generation"""
        
        difficulty_guidelines = {
            "easy": "Basic facts, rules, and common knowledge that most sports fans would know",
            "medium": "Historical facts, notable players, championships, and intermediate-level knowledge",
            "hard": "Detailed statistics, records, specific dates, advanced rules, and expert-level knowledge"
        }
        
        # Language-specific instructions
        language_instructions = {
            "en": "Generate questions in English.",
            "ru": "Generate questions in Russian. Use proper Russian grammar and sports terminology."
        }
        
        prompt = f"""
You are an expert sports quiz question generator. Generate exactly {count} unique multiple-choice questions about {sport}.

Context: {battle_context}

Language Instructions: {language_instructions.get(language, language_instructions["en"])}

Requirements:
1. Difficulty Level: {level} - {difficulty_guidelines.get(level, "Medium difficulty")}
2. Each question must have exactly 4 answer options (A, B, C, D)
3. Only one answer must be correct
4. Questions must be accurate and factually correct
5. Questions should be engaging and test real knowledge
6. Avoid repetitive or similar questions
7. Include a mix of topics: rules, history, players, statistics, championships, etc.
8. All text must be in {language.upper()} language

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

Return ONLY a valid JSON array containing exactly {count} question objects. Do not include any other text, explanations, or formatting.

Example for {sport} {level} questions in {language.upper()}:
"""
        
        # Add sport-specific examples
        if sport.lower() == "football":
            prompt += self._get_football_examples(level, language)
        elif sport.lower() == "basketball":
            prompt += self._get_basketball_examples(level, language)
        elif sport.lower() == "tennis":
            prompt += self._get_tennis_examples(level, language)
        else:
            prompt += self._get_general_examples(level, language)
        
        return prompt
    
    def _get_football_examples(self, level: str, language: str = "en") -> str:
        """Get football-specific examples based on difficulty and language"""
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