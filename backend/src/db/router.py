from models import UserData, UserDataCreate, BattleModel
from init import SessionLocal, redis_email, redis_username
from .init import db_router
import json
from fastapi import HTTPException, UploadFile, File
import aiofiles
import os
from datetime import datetime
from auth.router import decode_access_token
from sqlalchemy import select, update

@db_router.post("/update-user",name="update user data")
async def update_user_data(user: UserDataCreate):
    return await update_data(user)

@db_router.post("/update-battles-username",name="update battles for username change")
async def update_battles_username(old_username: str, new_username: str):
    """Update all battle records when a user changes their username"""
    try:
        async with SessionLocal() as db:
            # Update battles where user is first_opponent
            stmt_first = update(BattleModel).where(BattleModel.first_opponent == old_username).values(first_opponent=new_username)
            result_first = await db.execute(stmt_first)
            
            # Update battles where user is second_opponent
            stmt_second = update(BattleModel).where(BattleModel.second_opponent == old_username).values(second_opponent=new_username)
            result_second = await db.execute(stmt_second)
            
            await db.commit()
            
            count_first = result_first.rowcount
            count_second = result_second.rowcount
            total_updated = count_first + count_second
            
            return {
                "message": f"Successfully updated {total_updated} battle records",
                "battles_as_first_opponent": count_first,
                "battles_as_second_opponent": count_second,
                "old_username": old_username,
                "new_username": new_username
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating battle records: {str(e)}")
    
@db_router.delete("/delete-user",name="delete user")
async def delete_user_data(token: str):
    decoded_token = decode_access_token(token)
    email = decoded_token.get("sub")
    async with SessionLocal() as db:
        data = await db.get(UserData, email)
        friends = data.friends
        # Remove user from all friends' friend lists
        for friend in data.friends:
            try:
                friend_data = redis_username.get(friend)
                if friend_data:
                    friend_model = json.loads(friend_data)
                    if data.username in friend_model['friends']:
                        friend_model['friends'].remove(data.username)
                        redis_username.set(friend, json.dumps(friend_model))
                        redis_email.set(friend_model['email'], json.dumps(friend_model))
                        
                        async with SessionLocal() as friend_db:
                            db_friend = await friend_db.get(UserData, friend_model['email'])
                            if db_friend:
                                db_friend.friends = friend_model['friends']
                                await friend_db.commit()
                                await friend_db.refresh(db_friend)
            except Exception as e:
                print(f"Error removing user from friend {friend}: {str(e)}")
                continue

        # Delete the user
        await db.delete(data)
        await db.commit()
        redis_email.delete(email)
        redis_username.delete(data.username)
        return friends
    
@db_router.on_event("shutdown")
async def end_event():
    redis_email.close()
    redis_username.close()

@db_router.get("/get-user")
async def get_user_data(token: str):
        decoded_token = decode_access_token(token)
        email = decoded_token.get("sub")
        redis_data = redis_email.get(email)
        return json.loads(redis_data)

@db_router.get("/get-user-by-username",name="get user by username")
async def get_user_by_username(username: str):
    user = redis_username.get(username)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return json.loads(user)

@db_router.get("/get-battle-stats",name="get battle statistics for user")
async def get_battle_stats(username: str):
    """Get battle statistics for a specific user"""
    try:
        async with SessionLocal() as db:
            # Get battles where user is first_opponent
            stmt_first = select(BattleModel).where(BattleModel.first_opponent == username)
            result_first = await db.execute(stmt_first)
            battles_as_first = result_first.scalars().all()
            
            # Get battles where user is second_opponent
            stmt_second = select(BattleModel).where(BattleModel.second_opponent == username)
            result_second = await db.execute(stmt_second)
            battles_as_second = result_second.scalars().all()
            
            total_battles = len(battles_as_first) + len(battles_as_second)
            
            # Calculate wins, losses, draws
            wins = 0
            losses = 0
            draws = 0
            
            for battle in battles_as_first:
                if battle.first_opponent_score > battle.second_opponent_score:
                    wins += 1
                elif battle.first_opponent_score < battle.second_opponent_score:
                    losses += 1
                else:
                    draws += 1
            
            for battle in battles_as_second:
                if battle.second_opponent_score > battle.first_opponent_score:
                    wins += 1
                elif battle.second_opponent_score < battle.first_opponent_score:
                    losses += 1
                else:
                    draws += 1
            
            return {
                "username": username,
                "total_battles": total_battles,
                "battles_as_first_opponent": len(battles_as_first),
                "battles_as_second_opponent": len(battles_as_second),
                "wins": wins,
                "losses": losses,
                "draws": draws,
                "win_rate": round((wins / total_battles * 100) if total_battles > 0 else 0, 2)
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting battle stats: {str(e)}")

@db_router.post("/upload-avatar")
async def upload_avatar(token: str, file: UploadFile = File(...)):
    decoded_token = decode_access_token(token)
    email = decoded_token.get("sub")
    try:
        avatar_dir = "avatars"
        os.makedirs(avatar_dir, exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        filename = f"{email}_{timestamp}{file_extension}"
        file_path = os.path.join(avatar_dir, filename)
        
        # Save the file
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        # Update user data in database and cache
        async with SessionLocal() as db:
            user_model = await db.get(UserData, email)
            if user_model is None:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Delete old avatar if exists and it's not the default avatar
            if user_model.avatar and os.path.exists(os.path.join(avatar_dir, os.path.basename(user_model.avatar))):
                try:
                    os.remove(os.path.join(avatar_dir, os.path.basename(user_model.avatar)))
                except Exception as e:
                    print(f"Error deleting old avatar: {e}")
            
            # Store relative path for serving
            relative_path = f"/avatars/{filename}"
            user_model.avatar = relative_path
            await db.commit()
            
            # Update Redis cache
            user_dict = {
                'username': user_model.username,
                'email': user_model.email,
                'totalBattle': user_model.totalBattle,
                'winRate': user_model.winRate,
                'ranking': user_model.ranking,
                'winBattle': user_model.winBattle,
                'favourite': user_model.favourite,
                'streak': user_model.streak,
                'password': user_model.password,
                'friends': user_model.friends,
                'friendRequests': user_model.friendRequests,
                'avatar': relative_path,
                'battles': user_model.battles,
                'invitations': user_model.invitations
            }
            print(user_dict)
            redis_email.set(email, json.dumps(user_dict))
            redis_username.set(user_model.username, json.dumps(user_dict))
            
        return {"message": "Avatar uploaded successfully", "avatar_path": relative_path}
    except Exception as e:
        print(f"Avatar upload error: {str(e)}")  # Add detailed error logging
        raise HTTPException(status_code=500, detail=str(e))

async def update_data(user: UserDataCreate):
    async with SessionLocal() as db:
        user_model = await db.get(UserData, user.email)

        if user_model is None:
            raise HTTPException(status_code=404, detail="User not found")

        temp = user_model.username
        user_model.username = user.username.strip()
        user_model.email = user.email
        user_model.totalBattle = user.totalBattle
        user_model.winRate = user.winRate
        user_model.ranking = user.ranking
        user_model.winBattle = user.winBattle
        user_model.favourite = user.favourite
        user_model.streak = user.streak
        user_model.password = user.password
        user_model.friends = user.friends
        user_model.friendRequests = user.friendRequests
        user_model.battles = user.battles
        user_model.invitations = user.invitations
        if user.avatar:
            user_model.avatar = user.avatar

        await db.commit()
        await db.refresh(user_model)

        friend_list = user.friends
        if temp != user.username:
            # Update all battle records where the user participated
            try:
                async with SessionLocal() as battle_db:
                    # Update battles where user is first_opponent
                    stmt_first = update(BattleModel).where(BattleModel.first_opponent == temp).values(first_opponent=user.username)
                    result_first = await battle_db.execute(stmt_first)
                    
                    # Update battles where user is second_opponent
                    stmt_second = update(BattleModel).where(BattleModel.second_opponent == temp).values(second_opponent=user.username)
                    result_second = await battle_db.execute(stmt_second)
                    
                    await battle_db.commit()
                    
                    # Get the count of updated records
                    count_first = result_first.rowcount
                    count_second = result_second.rowcount
                    
                    print(f"Updated {count_first + count_second} battle records for username change from '{temp}' to '{user.username}'")
                    print(f"First opponent updates: {count_first}, Second opponent updates: {count_second}")
            except Exception as e:
                print(f"Error updating battle records: {str(e)}")
                # Continue with the process even if battle update fails

            # Update friends' friend lists
            for friend in user_model.friends:
                try:
                    friend_data = redis_username.get(friend)
                    if not friend_data:
                        raise HTTPException(status_code=404, detail=f"Friend {friend} not found in cache")
                    
                    friend_model = json.loads(friend_data)
                    if temp in friend_model['friends']:
                        friend_model['friends'][friend_model['friends'].index(temp)] = user.username
                        
                        redis_username.set(friend, json.dumps(friend_model))
                        redis_email.set(friend_model['email'], json.dumps(friend_model))
                        
                        async with SessionLocal() as friend_db:
                            db_friend = await friend_db.get(UserData, friend_model['email'])
                            if db_friend:
                                db_friend.friends = friend_model['friends']
                                await friend_db.commit()
                                await friend_db.refresh(db_friend)

                except json.JSONDecodeError:
                    print(f"Error decoding friend data for {friend}")
                    continue
                except Exception as e:
                    print(f"Error updating friend {friend}: {str(e)}")
                    continue

        user_dict = {
            'username': user_model.username,
            'email': user_model.email,
            'totalBattle': user_model.totalBattle,
            'winRate': user_model.winRate,
            'ranking': user_model.ranking,
            'winBattle': user_model.winBattle,
            'favourite': user_model.favourite,
            'streak': user_model.streak,
            'password': user_model.password,
            'friends': user_model.friends,
            'friendRequests': user_model.friendRequests,
            'avatar': user_model.avatar,
            'battles': user_model.battles,
            'invitations': user_model.invitations
        }
        
        redis_username.delete(temp)
        redis_email.set(user_model.email, json.dumps(user_dict))
        redis_username.set(user_model.username, json.dumps(user_dict))
        return friend_list

