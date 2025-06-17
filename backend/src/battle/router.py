from .init import battle_router,redis_battle
from models import BattleModel
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
    redis_battle.delete(battle_id)
    return {"message": "Battle deleted successfully"}