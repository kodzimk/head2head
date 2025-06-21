from .init import chat, router_ai, QUESTION_STRATEGIES, DIFFICULTY_CONTEXTS, CREATIVITY_BOOSTERS, SPORT_SPECIFIC_ENHANCEMENTS, DEFAULT_SPORT_ENHANCEMENTS, question_cache, cleanup_cache, get_question_hash
import ast
import random
import json
from fastapi import HTTPException

async def generate_ai_quiz(question: str):
    """
    Enhanced AI quiz generation with creative and diverse questions.
    Expected format: "make a quiz for {sport} for level {level}"
    """
    try:
        # Clean up cache periodically
        cleanup_cache()
        
        # Parse the question to extract sport and level
        parts = question.lower().split()
        sport = None
        level = None
        
        for i, part in enumerate(parts):
            if part == "for" and i + 1 < len(parts):
                sport = parts[i + 1]
            if part == "level" and i + 1 < len(parts):
                level = parts[i + 1]
        
        if not sport or not level:
            raise Exception("Invalid question format. Expected: 'make a quiz for {sport} for level {level}'")
        
        # Normalize level
        level = level.lower()
        if level not in ["easy", "medium", "hard"]:
            # Map numeric levels to text
            level_mapping = {"1": "easy", "2": "medium", "3": "hard"}
            level = level_mapping.get(level, "medium")
        
        # Create a dynamic, creative prompt with multiple strategies
        strategies = random.sample(QUESTION_STRATEGIES, min(3, len(QUESTION_STRATEGIES)))
        strategy_text = " | ".join([s.format(sport=sport) for s in strategies])
        
        difficulty_context = random.choice(DIFFICULTY_CONTEXTS[level])
        
        # Use multiple creativity boosters for maximum variety
        creativity_boosters = random.sample(CREATIVITY_BOOSTERS, min(3, len(CREATIVITY_BOOSTERS)))
        creativity_text = " | ".join(creativity_boosters)
        
        # Add sport-specific enhancements
        sport_enhancements = SPORT_SPECIFIC_ENHANCEMENTS.get(sport, DEFAULT_SPORT_ENHANCEMENTS)
        sport_specific = random.sample(sport_enhancements, min(2, len(sport_enhancements)))
        sport_text = " | ".join(sport_specific)
        
        # Add time-based variety
        current_hour = random.randint(0, 23)
        time_contexts = [
            "Focus on recent events and current trends",
            "Include questions about historical milestones",
            "Mix questions from different eras and time periods",
            "Emphasize timeless aspects and enduring legacies"
        ]
        time_context = random.choice(time_contexts)
        
        # Add random question style variations
        style_variations = [
            "Mix direct questions with scenario-based questions",
            "Include questions that require logical reasoning",
            "Add questions about cause-and-effect relationships",
            "Include questions about comparisons and contrasts",
            "Add questions that test understanding of context",
            "Include questions about sequences and timelines",
            "Add questions about patterns and trends",
            "Add questions about exceptions and edge cases"
        ]
        style_variation = random.choice(style_variations)
        
        # Build the enhanced prompt
        enhanced_prompt = f"""
Create a {level.upper()} level quiz about {sport.upper()} with the following requirements:

FOCUS AREAS: {strategy_text}
DIFFICULTY: {difficulty_context}
CREATIVITY: {creativity_text}
SPORT-SPECIFIC: {sport_text}
TIME CONTEXT: {time_context}
STYLE: {style_variation}

SPECIFIC INSTRUCTIONS:
- Make questions engaging and fun, not just factual
- Use different question formats (Who, What, When, Where, Why, How)
- Include questions that test reasoning, not just memory
- Mix serious and entertaining questions
- Ensure all questions are accurate and up-to-date
- Make answer choices plausible and challenging
- Avoid repetitive question patterns
- Use varied sentence structures and complexity
- Include questions about emotions, culture, and human interest
- Make some questions about lesser-known aspects and trivia

VARIETY REQUIREMENTS:
- Use different question lengths (short, medium, long)
- Mix factual questions with analytical ones
- Include questions about both individual and team aspects
- Cover different geographical regions and cultures
- Mix questions about players, coaches, fans, and officials
- Include questions about both on-field and off-field aspects
- Vary the complexity of answer choices
- Include questions that require context understanding

SPORT-SPECIFIC FOCUS:
- Make questions highly relevant to {sport} culture and history
- Include questions about {sport}-specific terminology and concepts
- Cover {sport}-specific rules, strategies, and traditions
- Include questions about {sport} personalities and moments
- Make questions that only {sport} fans would appreciate

Return exactly 10 questions in valid JSON format with explanations.
"""
        
        print(f"Generating {level} level quiz for {sport}")
        print(f"Strategies: {strategy_text}")
        print(f"Creativity: {creativity_text}")
        print(f"Sport-specific: {sport_text}")
        
        # Generate the response
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
                raise Exception("Failed to parse AI response.")
        
        # Validate the response structure
        if not isinstance(questions_list, list) or len(questions_list) != 10:
            raise Exception("Invalid response structure. Expected 10 questions.")
        
        # Check for duplicates and add to cache
        unique_questions = []
        for i, question_data in enumerate(questions_list):
            if not isinstance(question_data, dict):
                raise Exception(f"Invalid question format at index {i}")
            
            required_fields = ["question", "answers", "correctAnswer"]
            for field in required_fields:
                if field not in question_data:
                    raise Exception(f"Missing required field '{field}' in question {i}")
            
            # Validate answers structure
            if not isinstance(question_data["answers"], list) or len(question_data["answers"]) != 4:
                raise Exception(f"Invalid answers format in question {i}")
            
            # Check for duplicates
            question_hash = get_question_hash(question_data["question"])
            if question_hash not in question_cache:
                question_cache.add(question_hash)
                unique_questions.append(question_data)
            else:
                print(f"Duplicate question detected and skipped: {question_data['question'][:50]}...")
        
        # If we have duplicates, regenerate the missing questions
        if len(unique_questions) < 10:
            missing_count = 10 - len(unique_questions)
            print(f"Regenerating {missing_count} questions due to duplicates")
            
            # Generate additional questions with sport-specific focus
            additional_prompt = f"""
Generate exactly {missing_count} additional unique questions about {sport.upper()} for {level.upper()} level.
These must be completely different from typical questions and focus on:

SPORT-SPECIFIC ASPECTS:
- {sport}-specific terminology and jargon
- Unique {sport} traditions and rituals
- {sport}-specific equipment and technology
- Famous {sport} venues and their history
- {sport} culture and fan traditions

CREATIVITY FOCUS:
- Obscure facts and lesser-known details
- Cultural impact and social significance
- Personal stories and human interest
- Technical innovations and evolution
- Global influence and international aspects
- Controversial moments and debates
- Behind-the-scenes stories and anecdotes

Make sure these questions are unique, creative, and highly relevant to {sport} culture.
"""
            
            additional_response = chat.send_message(additional_prompt).text
            additional_response = additional_response.replace("```json", "").replace("```", "").strip()
            
            try:
                additional_questions = json.loads(additional_response)
            except json.JSONDecodeError:
                try:
                    additional_questions = ast.literal_eval(additional_response)
                except:
                    additional_questions = []
            
            # Add unique additional questions
            for question_data in additional_questions:
                if len(unique_questions) >= 10:
                    break
                    
                question_hash = get_question_hash(question_data["question"])
                if question_hash not in question_cache:
                    question_cache.add(question_hash)
                    unique_questions.append(question_data)
        
        print(f"Successfully generated {len(unique_questions)} unique questions for {sport} ({level} level)")
        return unique_questions
        
    except Exception as e:
        print(f"Error in generate_ai_quiz: {str(e)}")
        raise Exception(f"Failed to generate quiz: {str(e)}")

@router_ai.post("/ai-quiz")
async def ai_quiz(question: str):
    """
    POST endpoint for AI quiz generation
    """
    try:
        return await generate_ai_quiz(question)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))






