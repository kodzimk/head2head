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
    try:
        async with SessionLocal() as db:
            stmt_first = update(BattleModel).where(BattleModel.first_opponent == old_username).values(first_opponent=new_username)
            result_first = await db.execute(stmt_first)
            
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
        
        for friend in data.friends:
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
    try:
        async with SessionLocal() as db:
            
            stmt_first = select(BattleModel).where(BattleModel.first_opponent == username)
            result_first = await db.execute(stmt_first)
            battles_as_first = result_first.scalars().all()
            
            
            stmt_second = select(BattleModel).where(BattleModel.second_opponent == username)
            result_second = await db.execute(stmt_second)
            battles_as_second = result_second.scalars().all()
            
            total_battles = len(battles_as_first) + len(battles_as_second)
            
            
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
        
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        filename = f"{email}_{timestamp}{file_extension}"
        file_path = os.path.join(avatar_dir, filename)
        
        
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        
        async with SessionLocal() as db:
            user_model = await db.get(UserData, email)
            if user_model is None:
                raise HTTPException(status_code=404, detail="User not found")
            

            if user_model.avatar and os.path.exists(os.path.join(avatar_dir, os.path.basename(user_model.avatar))):
                    os.remove(os.path.join(avatar_dir, os.path.basename(user_model.avatar)))
            
            relative_path = f"/avatars/{filename}"
            user_model.avatar = relative_path
            await db.commit()
            
            
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
            redis_email.set(email, json.dumps(user_dict))
            redis_username.set(user_model.username, json.dumps(user_dict))
            
        return {"message": "Avatar uploaded successfully", "avatar_path": relative_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def update_data(user: UserDataCreate):
    async with SessionLocal() as db:
        user_model = await db.get(UserData, user.email)

        if user_model is None:
            # Create a new user if not found
            user_model = UserData(
                username=user.username,
                email=user.email,
                totalBattle=user.totalBattle,
                winRate=user.winRate,
                ranking=user.ranking,
                winBattle=user.winBattle,
                favourite=user.favourite,
                streak=user.streak,
                password=user.password,
                friends=user.friends,
                friendRequests=user.friendRequests,
                avatar=user.avatar,
                battles=user.battles,
                invitations=user.invitations
            )
            db.add(user_model)
            await db.commit()
            await db.refresh(user_model)

        old_username = user_model.username
        new_username = user.username.strip()
        
        # Update user model
        user_model.username = new_username
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

        # If username changed, update all references
        if old_username != new_username:
            print(f"Username changed from {old_username} to {new_username}, updating all references...")
            
            # 1. Update friends' friend lists
            for friend_username in user_model.friends:
                try:
                    friend_data = redis_username.get(friend_username)
                    if friend_data:
                        friend_model = json.loads(friend_data)
                        if old_username in friend_model['friends']:
                            friend_model['friends'][friend_model['friends'].index(old_username)] = new_username
                            
                            # Update Redis cache
                            redis_username.set(friend_username, json.dumps(friend_model))
                            redis_email.set(friend_model['email'], json.dumps(friend_model))
                            
                            # Update database
                            async with SessionLocal() as friend_db:
                                db_friend = await friend_db.get(UserData, friend_model['email'])
                                if db_friend:
                                    db_friend.friends = friend_model['friends']
                                    await friend_db.commit()
                                    await friend_db.refresh(db_friend)
                except Exception as e:
                    print(f"Error updating friend {friend_username}: {e}")
            
            # 2. Update friend requests (users who have this user in their friendRequests)
            all_users_stmt = select(UserData)
            all_users_result = await db.execute(all_users_stmt)
            all_users = all_users_result.scalars().all()
            
            for other_user in all_users:
                if old_username in other_user.friendRequests:
                    other_user.friendRequests[other_user.friendRequests.index(old_username)] = new_username
                    
                    # Update Redis cache for this user
                    other_user_dict = {
                        'username': other_user.username,
                        'email': other_user.email,
                        'totalBattle': other_user.totalBattle,
                        'winRate': other_user.winRate,
                        'ranking': other_user.ranking,
                        'winBattle': other_user.winBattle,
                        'favourite': other_user.favourite,
                        'streak': other_user.streak,
                        'password': other_user.password,
                        'friends': other_user.friends,
                        'friendRequests': other_user.friendRequests,
                        'avatar': other_user.avatar,
                        'battles': other_user.battles,
                        'invitations': other_user.invitations
                    }
                    redis_username.set(other_user.username, json.dumps(other_user_dict))
                    redis_email.set(other_user.email, json.dumps(other_user_dict))
            
            # 3. Update battle records
            for battle_id in user_model.battles:
                try:
                    battle_data = await db.get(BattleModel, battle_id)
                    if battle_data:
                        if battle_data.first_opponent == old_username:
                            battle_data.first_opponent = new_username
                        elif battle_data.second_opponent == old_username:
                            battle_data.second_opponent = new_username
                        
                        await db.commit()
                        await db.refresh(battle_data)
                except Exception as e:
                    print(f"Error updating battle {battle_id}: {e}")
            
            # 4. Update invitations (users who have this user in their invitations)
            for other_user in all_users:
                if old_username in other_user.invitations:
                    other_user.invitations[other_user.invitations.index(old_username)] = new_username
                    
                    # Update Redis cache for this user
                    other_user_dict = {
                        'username': other_user.username,
                        'email': other_user.email,
                        'totalBattle': other_user.totalBattle,
                        'winRate': other_user.winRate,
                        'ranking': other_user.ranking,
                        'winBattle': other_user.winBattle,
                        'favourite': other_user.favourite,
                        'streak': other_user.streak,
                        'password': other_user.password,
                        'friends': other_user.friends,
                        'friendRequests': other_user.friendRequests,
                        'avatar': other_user.avatar,
                        'battles': other_user.battles,
                        'invitations': other_user.invitations
                    }
                    redis_username.set(other_user.username, json.dumps(other_user_dict))
                    redis_email.set(other_user.email, json.dumps(other_user_dict))
            
            await db.commit()

        # Create user dictionary for Redis
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
        
        # Update Redis cache
        if old_username != new_username:
            redis_username.delete(old_username)
        redis_email.set(user_model.email, json.dumps(user_dict))
        redis_username.set(user_model.username, json.dumps(user_dict))
        
        return user.friends

@db_router.get("/get-leaderboard")
async def get_leaderboard():
    try:
        async with SessionLocal() as db:
            # Get all users ordered by their stored ranking (which is calculated by the points system)
            stmt = select(UserData).order_by(UserData.ranking.asc())
            result = await db.execute(stmt)
            users = result.scalars().all()
            
            leaderboard_data = []
            for user in users:
                leaderboard_data.append({
                    'rank': user.ranking,  # Use the stored ranking from the points system
                    'username': user.username,
                    'wins': user.winBattle,
                    'totalBattles': user.totalBattle,
                    'winRate': user.winRate,
                    'streak': user.streak,
                    'favoriteSport': user.favourite,
                    'avatar': user.avatar
                })
            
            return leaderboard_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting leaderboard: {str(e)}")

@db_router.get("/get-user-ranking-details")
async def get_user_ranking_details(username: str):
    try:
        async with SessionLocal() as db:
            # Get the user
            stmt = select(UserData).where(UserData.username == username)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Calculate ranking points
            from battle.router import calculate_user_points, get_ranking_tier
            total_points = await calculate_user_points(user)
            tier_info = get_ranking_tier(total_points)
            
            # Calculate individual components
            base_points = user.winBattle * 100
            win_rate_bonus = min(50, user.winRate // 2) if user.winRate > 0 else 0
            streak_bonus = min(100, user.streak * 10) if user.streak > 0 else 0
            experience_bonus = min(25, user.totalBattle // 4) if user.totalBattle > 0 else 0
            
            consistency_bonus = 0
            if user.totalBattle >= 10 and user.winRate >= 70:
                consistency_bonus = 25
            elif user.totalBattle >= 5 and user.winRate >= 80:
                consistency_bonus = 15
            
            new_user_bonus = 0
            if user.totalBattle <= 3 and user.winBattle > 0:
                new_user_bonus = 20
            
            return {
                'username': user.username,
                'rank': user.ranking,
                'total_points': total_points,
                'tier_info': tier_info,
                'breakdown': {
                    'base_points': base_points,
                    'win_rate_bonus': win_rate_bonus,
                    'streak_bonus': streak_bonus,
                    'experience_bonus': experience_bonus,
                    'consistency_bonus': consistency_bonus,
                    'new_user_bonus': new_user_bonus
                },
                'stats': {
                    'wins': user.winBattle,
                    'total_battles': user.totalBattle,
                    'win_rate': user.winRate,
                    'streak': user.streak
                }
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting ranking details: {str(e)}")

@db_router.get("/get-ranking-tiers")
async def get_ranking_tiers():
    """Get information about all ranking tiers"""
    try:
        from battle.router import get_ranking_tier
        
        tiers = [
            {"points": 1000, "tier": "Elite", "color": "purple", "icon": "👑", "description": "Elite Champion"},
            {"points": 500, "tier": "Master", "color": "gold", "icon": "🏆", "description": "Master Player"},
            {"points": 200, "tier": "Expert", "color": "silver", "icon": "🥈", "description": "Expert Competitor"},
            {"points": 100, "tier": "Veteran", "color": "bronze", "icon": "🥉", "description": "Veteran Player"},
            {"points": 50, "tier": "Rising", "color": "blue", "icon": "⭐", "description": "Rising Star"},
            {"points": 0, "tier": "Rookie", "color": "gray", "icon": "🌱", "description": "Rookie Player"}
        ]
        
        return {
            "tiers": tiers,
            "description": "Ranking tiers based on total points earned from battles, win rates, streaks, and consistency"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting ranking tiers: {str(e)}")

@db_router.get("/cleanup-old-usernames")
async def cleanup_old_usernames():
    """Clean up old usernames from friends lists and other references"""
    try:
        async with SessionLocal() as db:
            # Get all users
            all_users_stmt = select(UserData)
            all_users_result = await db.execute(all_users_stmt)
            all_users = all_users_result.scalars().all()
            
            cleanup_stats = {
                "users_checked": 0,
                "friends_lists_updated": 0,
                "friend_requests_updated": 0,
                "invitations_updated": 0,
                "total_old_references_removed": 0
            }
            
            for user in all_users:
                cleanup_stats["users_checked"] += 1
                updated = False
                
                # Check friends list
                original_friends = user.friends.copy()
                user.friends = [friend for friend in user.friends if friend in [u.username for u in all_users]]
                if len(user.friends) != len(original_friends):
                    cleanup_stats["friends_lists_updated"] += 1
                    cleanup_stats["total_old_references_removed"] += len(original_friends) - len(user.friends)
                    updated = True
                
                # Check friend requests
                original_requests = user.friendRequests.copy()
                user.friendRequests = [req for req in user.friendRequests if req in [u.username for u in all_users]]
                if len(user.friendRequests) != len(original_requests):
                    cleanup_stats["friend_requests_updated"] += 1
                    cleanup_stats["total_old_references_removed"] += len(original_requests) - len(user.friendRequests)
                    updated = True
                
                # Check invitations (these are battle IDs, not usernames, so we'll skip for now)
                
                if updated:
                    # Update Redis cache
                    user_dict = {
                        'username': user.username,
                        'email': user.email,
                        'totalBattle': user.totalBattle,
                        'winRate': user.winRate,
                        'ranking': user.ranking,
                        'winBattle': user.winBattle,
                        'favourite': user.favourite,
                        'streak': user.streak,
                        'password': user.password,
                        'friends': user.friends,
                        'friendRequests': user.friendRequests,
                        'avatar': user.avatar,
                        'battles': user.battles,
                        'invitations': user.invitations
                    }
                    redis_username.set(user.username, json.dumps(user_dict))
                    redis_email.set(user.email, json.dumps(user_dict))
            
            await db.commit()
            
            return {
                "message": "Old username cleanup completed",
                "stats": cleanup_stats
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cleaning up old usernames: {str(e)}")

@db_router.post("/recalculate-all-rankings")
async def recalculate_all_rankings():
    """Manually recalculate all user rankings - useful for testing and fixing inconsistencies"""
    try:
        from battle.router import update_user_rankings
        success = await update_user_rankings()
        if success:
            return {
                "message": "All user rankings recalculated successfully",
                "status": "success"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to recalculate rankings")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error recalculating rankings: {str(e)}")

@db_router.post("/reset-user-stats", name="reset user statistics")
async def reset_user_stats(username: str):
    async with SessionLocal() as db:
        stmt = select(UserData).where(UserData.username == username)
        result = await db.execute(stmt)
        user_model = result.scalar_one_or_none()
        if user_model is None:
            raise HTTPException(status_code=404, detail="User not found")
        # Reset stats
        user_model.winBattle = 0
        user_model.winRate = 0
        user_model.totalBattle = 0
        user_model.ranking = 0  # Set to 0 or your default rank value
        user_model.streak = 0
        await db.commit()
        await db.refresh(user_model)
        # Update Redis cache
        user_dict = {
            'username': user_model.username,
            'email': user_model.email,
            'totalBattle': user_model.totalBattle,
            'winRate': user_model.winRate,
            'ranking': user_model.ranking,
            'favourite': user_model.favourite,
            'winBattle': user_model.winBattle,
            'streak': user_model.streak,
            'password': user_model.password,
            'friends': user_model.friends,
            'friendRequests': user_model.friendRequests,
            'avatar': user_model.avatar,
            'battles': user_model.battles,
            'invitations': user_model.invitations
        }
        redis_email.set(user_model.email, json.dumps(user_dict))
        redis_username.set(user_model.username, json.dumps(user_dict))
        return {"message": "User statistics reset successfully"}


