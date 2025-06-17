from .init import battle_router,redis_battle
from models import BattleModel
from init import SessionLocal
from fastapi import  Query
import json
import uuid

@battle_router.post("/create")
async def create_battle(first_opponent: str, sport: str = Query(...), duration: int = Query(...)):
    battle_id = str(uuid.uuid4())
    battle = BattleModel(
        id=battle_id,
        first_opponent=first_opponent,
        second_opponent='',
        sport=sport,
        duration=duration,
        first_opponent_score=0,
        second_opponent_score=0
    )
    json_battle = json.dumps(battle.to_json())
    redis_battle.set(battle_id, json_battle)

    return battle.to_json()



@battle_router.delete("/delete")
async def delete_battle(battle_id: str):
    async with SessionLocal() as session:
        battle_data = redis_battle.get(battle_id)
        battle_dict = json.loads(battle_data)   
        battle = BattleModel(
            id=battle_id,
            first_opponent=battle_dict["first_opponent"],
            second_opponent=battle_dict["second_opponent"],
            sport=battle_dict["sport"],
            duration=battle_dict["duration"],
            first_opponent_score=battle_dict["first_opponent_score"],
            second_opponent_score=battle_dict["second_opponent_score"]
        )
        session.add(battle)
        await session.commit()
        await session.refresh(battle)
        
    
    redis_battle.delete(battle_id)
    return {"message": "Battle deleted successfully"}