from fastapi import APIRouter
import google.generativeai as genai
import random
import hashlib
import time

# Configure API Key
genai.configure(api_key="AIzaSyDKqLaMMoPBqKVkEIqK3q1ZIZU-q-m75HI")

# Question cache to prevent duplicates
question_cache = set()
cache_cleanup_time = time.time()

def cleanup_cache():
    """Clean up old cache entries every hour"""
    global cache_cleanup_time
    current_time = time.time()
    if current_time - cache_cleanup_time > 3600:  # 1 hour
        question_cache.clear()
        cache_cleanup_time = current_time

def get_question_hash(question_text):
    """Generate a hash for a question to detect duplicates"""
    return hashlib.md5(question_text.lower().encode()).hexdigest()

# Enhanced system instruction for more creative and diverse questions
system_instruction = """
You are an expert sports quiz master with deep knowledge of all sports. Your mission is to create engaging, diverse, and never-repetitive quiz questions.

IMPORTANT RULES:
1. NEVER repeat the same questions or use similar phrasing
2. Always create FRESH, CREATIVE questions for each request
3. Mix different question types and difficulty levels
4. Use various contexts: historical events, current players, rules, statistics, memorable moments, etc.
5. Make questions engaging and fun, not just factual
6. Use different sentence structures and question formats
7. Vary the complexity and length of questions

QUESTION TYPES TO ROTATE:
- Historical moments and records
- Current players and teams
- Rules and regulations
- Statistics and achievements
- Famous quotes and incidents
- Tactics and strategies
- Equipment and venues
- International competitions
- Controversial moments
- Lesser-known facts
- Coaching and management
- Fan culture and traditions
- Media and broadcasting
- Business and economics
- Technology and innovation
- Rivalries and drama
- Celebrations and rituals
- Venue history and atmosphere
- Equipment evolution
- Global impact and influence

DIFFICULTY LEVELS:
- EASY: Basic facts, well-known players, simple rules
- MEDIUM: Specific statistics, recent events, detailed rules
- HARD: Obscure facts, historical details, complex scenarios

CREATIVITY TECHNIQUES:
- Use wordplay and puns when appropriate
- Ask "what if" scenarios
- Include multiple-choice questions that test reasoning, not just memory
- Mix serious and fun questions
- Use different question formats (Who, What, When, Where, Why, How)
- Include questions about emotions and psychology
- Ask about cultural impact and social significance
- Include questions about innovation and evolution
- Ask about personal stories and human interest
- Include questions about global reach and international appeal

OUTPUT FORMAT:
Return exactly 10 questions in this JSON format:
[
  {
    "question": "Creative question text here?",
    "answers": [
      { "label": "A", "text": "Answer option 1" },
      { "label": "B", "text": "Answer option 2" },
      { "label": "C", "text": "Answer option 3" },
      { "label": "D", "text": "Answer option 4" }
    ],
    "correctAnswer": "A/B/C/D",
    "explanation": "Brief explanation of why this is correct"
  }
]

Make each question unique, engaging, and appropriate for the specified sport and difficulty level.
"""

# Initialize model with enhanced configuration
model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    system_instruction=system_instruction,
    generation_config={
        "temperature": 0.9,  # High creativity while maintaining coherence
        "top_p": 0.8,       # Nucleus sampling for diversity
        "top_k": 40,        # Top-k sampling for variety
        "max_output_tokens": 4000,  # Allow longer, more detailed responses
    }
)

chat = model.start_chat()
router_ai = APIRouter()

# Question generation strategies for variety
QUESTION_STRATEGIES = [
    "Create questions about {sport} focusing on HISTORICAL MOMENTS and RECORDS",
    "Generate {sport} questions about CURRENT PLAYERS and TEAMS",
    "Make {sport} questions about RULES, REGULATIONS, and OFFICIAL GUIDELINES",
    "Design {sport} questions about STATISTICS, ACHIEVEMENTS, and MILESTONES",
    "Craft {sport} questions about FAMOUS QUOTES, INCIDENTS, and MEMORABLE MOMENTS",
    "Develop {sport} questions about TACTICS, STRATEGIES, and GAME PLANS",
    "Create {sport} questions about EQUIPMENT, VENUES, and TECHNICAL ASPECTS",
    "Generate {sport} questions about INTERNATIONAL COMPETITIONS and TOURNAMENTS",
    "Make {sport} questions about CONTROVERSIAL MOMENTS and DEBATES",
    "Design {sport} questions about LESSER-KNOWN FACTS and TRIVIA",
    "Craft {sport} questions about COACHES, MANAGERS, and LEADERSHIP",
    "Develop {sport} questions about FAN CULTURE, TRADITIONS, and CEREMONIES",
    "Create {sport} questions about MEDIA, BROADCASTING, and COMMENTARY",
    "Generate {sport} questions about BUSINESS, SPONSORSHIPS, and ECONOMICS",
    "Make {sport} questions about TECHNOLOGY and INNOVATION in sports",
    "Design {sport} questions about RIVALRIES, DRAMA, and INTENSE MOMENTS",
    "Craft {sport} questions about CELEBRATIONS, RITUALS, and TRADITIONS",
    "Develop {sport} questions about VENUE HISTORY and ATMOSPHERE",
    "Create {sport} questions about EQUIPMENT EVOLUTION and CHANGES",
    "Generate {sport} questions about GLOBAL IMPACT and INTERNATIONAL APPEAL",
    "Make {sport} questions about PERSONAL STORIES and HUMAN INTEREST",
    "Design {sport} questions about CULTURAL SIGNIFICANCE and SOCIAL IMPACT",
    "Craft {sport} questions about INNOVATION and EVOLUTION of the sport",
    "Develop {sport} questions about EMOTIONS and PSYCHOLOGY in sports"
]

DIFFICULTY_CONTEXTS = {
    "easy": [
        "Focus on basic facts that most fans would know",
        "Ask about well-known players and simple rules",
        "Include questions about popular teams and basic terminology",
        "Cover fundamental aspects that beginners would learn",
        "Focus on current stars and recent events",
        "Ask about basic equipment and simple strategies"
    ],
    "medium": [
        "Include specific statistics and recent events",
        "Ask about detailed rules and regulations",
        "Cover players from the last 10-20 years",
        "Include questions about tactics and strategies",
        "Focus on memorable moments and achievements",
        "Ask about team dynamics and leadership"
    ],
    "hard": [
        "Ask about obscure facts and historical details",
        "Include questions about players from different eras",
        "Cover complex scenarios and edge cases",
        "Ask about lesser-known statistics and records",
        "Focus on deep tactical knowledge and analysis",
        "Include questions about controversial decisions and debates"
    ]
}

# Additional creativity boosters
CREATIVITY_BOOSTERS = [
    "Include some questions with wordplay or puns",
    "Add questions about memorable quotes or catchphrases",
    "Include questions about fan traditions and culture",
    "Add questions about iconic moments and celebrations",
    "Include questions about equipment evolution and technology",
    "Add questions about rivalries and dramatic moments",
    "Include questions about international impact and global reach",
    "Add questions about coaching strategies and leadership",
    "Include questions about statistics and records",
    "Add questions about venue history and atmosphere",
    "Include questions about personal achievements and milestones",
    "Add questions about team chemistry and dynamics",
    "Include questions about rule changes and evolution",
    "Add questions about memorable celebrations and rituals",
    "Include questions about fan reactions and emotions",
    "Add questions about media coverage and commentary",
    "Add questions about business aspects and sponsorships",
    "Add questions about technological innovations",
    "Include questions about cultural significance",
    "Add questions about social impact and influence"
]

# Sport-specific question enhancements
SPORT_SPECIFIC_ENHANCEMENTS = {
    "football": [
        "Include questions about famous goals and celebrations",
        "Add questions about tactical formations and strategies",
        "Include questions about World Cup moments and legends",
        "Add questions about club rivalries and derbies",
        "Include questions about transfer market and player movements",
        "Add questions about stadium atmospheres and fan culture",
        "Include questions about refereeing decisions and VAR",
        "Add questions about international competitions and qualifiers",
        "Include questions about youth academies and development",
        "Add questions about football economics and transfers"
    ],
    "basketball": [
        "Include questions about iconic dunks and plays",
        "Add questions about NBA legends and current stars",
        "Include questions about championship moments and dynasties",
        "Add questions about streetball and playground culture",
        "Include questions about international basketball and Olympics",
        "Add questions about coaching philosophies and systems",
        "Include questions about basketball fashion and style",
        "Add questions about basketball movies and pop culture",
        "Include questions about basketball statistics and analytics",
        "Add questions about basketball technology and innovation"
    ],
    "tennis": [
        "Include questions about Grand Slam moments and records",
        "Add questions about tennis rivalries and epic matches",
        "Include questions about tennis fashion and style",
        "Add questions about tennis technology and equipment",
        "Include questions about tennis courts and surfaces",
        "Add questions about tennis etiquette and traditions",
        "Include questions about tennis coaching and training",
        "Add questions about tennis media and commentary",
        "Include questions about tennis business and sponsorships",
        "Add questions about tennis legends and current stars"
    ],
    "cricket": [
        "Include questions about famous innings and bowling spells",
        "Add questions about cricket formats and strategies",
        "Include questions about cricket grounds and conditions",
        "Add questions about cricket commentary and traditions",
        "Include questions about cricket records and statistics",
        "Add questions about cricket rivalries and series",
        "Add questions about cricket equipment and technology",
        "Include questions about cricket legends and current players",
        "Add questions about cricket culture and fan traditions",
        "Add questions about cricket business and leagues"
    ]
}

# Default enhancements for other sports
DEFAULT_SPORT_ENHANCEMENTS = [
    "Include questions about famous moments and achievements",
    "Add questions about current stars and legends",
    "Include questions about rules and regulations",
    "Add questions about equipment and technology",
    "Include questions about venues and atmosphere",
    "Add questions about fan culture and traditions",
    "Include questions about media coverage and commentary",
    "Add questions about business and economics",
    "Include questions about international competitions",
    "Add questions about coaching and strategy"
]