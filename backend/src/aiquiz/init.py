from fastapi import APIRouter

import google.generativeai as genai

# Configure API Key
genai.configure(api_key="AIzaSyDKqLaMMoPBqKVkEIqK3q1ZIZU-q-m75HI")

# Define the system instruction
system_instruction = """
         You are ambassador of sport and creative and know everything about sport.
         Yiu will create a quesiton based on sport and level.
         create 10 questions and 4 options for each question.
         You will give answers like this:
    "question": "What is the capital of France?",
    [
    and every object should be in this format:
    "answers": [
      { "label": 'A', "text": 'Berlin' },
      { "label": 'B', "text": 'Madrid' },
      { "label": 'C', "text": 'Paris' },
      { "label": 'D', "text": 'Rome' },
    ],
    "correctAnswer": 'C',
  },
  ]
  return the questions as an array of objects.
         """

# Initialize model with system instruction
model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",  # Make sure this model is supported in your region
    system_instruction=system_instruction,
    generation_config={
        "temperature": 2.0,  # range: 0.0 (deterministic) to 1.0+ (creative)
    }
)

chat = model.start_chat()
router_ai = APIRouter()