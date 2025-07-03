DATABASE_URL = "postgresql+asyncpg://postgres:Kais123@db:5432/user_db"

# API Key Configuration
API_KEYS = [
    "AIzaSyA3JnveYgQNYEi8T978o72O9_XcBZK4SYs",  # Replace with your actual API keys
    "AIzaSyCpYEITMlV_m27_66CXTwHBWjQV1atJpzo",
    "AIzaSyBTtYVDO4VwKhMBqTI1SwZH0SeKdI9AH_Q",
    "AIzaSyCXgxp9zjCQFYK5XWDDBej6hrtbaF0Ne5Q",
    "AIzaSyCVt8ILtxE81Fb2XLnHyu_nTjEWHm9qnyQ"
]

# Current key index for rotation
current_key_index = 0

def get_next_api_key():
    """Get the next API key in the rotation."""
    global current_key_index
    key = API_KEYS[current_key_index]
    current_key_index = (current_key_index + 1) % len(API_KEYS)
    return key

# Google API Keys for parallel quiz generation
GOOGLE_API_KEYS = [
    "AIzaSyA3JnveYgQNYEi8T978o72O9_XcBZK4SYs",  # Replace with your actual Google API keys
    "AIzaSyCpYEITMlV_m27_66CXTwHBWjQV1atJpzo",
    "AIzaSyBTtYVDO4VwKhMBqTI1SwZH0SeKdI9AH_Q",
    "AIzaSyCXgxp9zjCQFYK5XWDDBej6hrtbaF0Ne5Q",
    "AIzaSyCVt8ILtxE81Fb2XLnHyu_nTjEWHm9qnyQ"
]

current_google_key_index = 0

def get_next_google_api_key():
    """Get the next Google API key in the rotation."""
    global current_google_key_index
    key = GOOGLE_API_KEYS[current_google_key_index]
    current_google_key_index = (current_google_key_index + 1) % len(GOOGLE_API_KEYS)
    return key
