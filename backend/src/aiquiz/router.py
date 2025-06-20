from .init import chat, router_ai
import ast
from fastapi import HTTPException

@router_ai.post("/ai-quiz")
async def ai_quiz(question: str):
    response_text = chat.send_message(question).text
    
    # Clean up markdown code blocks if they exist
    response_text = response_text.replace("```json", "").replace("```", "").strip()

    try:
        # Use ast.literal_eval to safely parse the string as a Python literal.
        # This correctly handles the single-quoted strings from the AI.
        questions_list = ast.literal_eval(response_text)
        return questions_list
    except (ValueError, SyntaxError) as e:
        # This will catch errors if the string is not a valid Python literal.
        print(f"Failed to parse AI response with ast.literal_eval: {e}")
        print(f"Problematic string: {response_text}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response.")






