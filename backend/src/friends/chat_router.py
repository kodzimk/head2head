from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.init import get_db
from models import Chat
from typing import List

chat_router = APIRouter()

@chat_router.get("/chat/history", response_model=List[dict])
def get_chat_history(
    sender: str, 
    receiver: str, 
    db: Session = Depends(get_db)
):
    try:
        chat_id = f"{sender}_{receiver}"
        messages = db.query(Chat).filter(
            (Chat.chat_id == chat_id) & 
            ((Chat.sender == sender) | (Chat.receiver == sender)) &
            ((Chat.sender == receiver) | (Chat.receiver == receiver))
        ).order_by(Chat.timestamp).all()
        
        return [msg.to_dict() for msg in messages]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 