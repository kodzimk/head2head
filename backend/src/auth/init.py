from fastapi import APIRouter, Request
from ..config import get_next_api_key

auth_router = APIRouter(prefix="/auth",tags=["auth"])

async def api_key_middleware(request: Request, call_next):
    """Middleware to handle API key rotation."""
    # Get the next API key in rotation
    api_key = get_next_api_key()
    
    # Add the API key to request state
    request.state.api_key = api_key
    
    # Continue with the request
    response = await call_next(request)
    return response
