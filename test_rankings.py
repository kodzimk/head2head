#!/usr/bin/env python3
"""
Test script to verify ranking consistency between leaderboard and user statistics
"""

import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend', 'src'))

async def test_rankings():
    """Test the ranking system consistency"""
    try:
        from battle.router import update_user_rankings, calculate_user_points
        from db.router import get_leaderboard
        from sqlalchemy import select
        from db.init import SessionLocal
        from models import UserData
        
        print("🔄 Testing ranking system consistency...")
        
        # First, update all rankings
        print("📊 Updating user rankings...")
        success = await update_user_rankings()
        if not success:
            print("❌ Failed to update rankings")
            return
        
        # Get leaderboard data
        print("🏆 Fetching leaderboard data...")
        leaderboard_data = await get_leaderboard()
        
        # Get all users from database
        async with SessionLocal() as db:
            stmt = select(UserData).order_by(UserData.ranking.asc())
            result = await db.execute(stmt)
            users = result.scalars().all()
        
        print(f"\n📈 Found {len(users)} users in database")
        print(f"🏆 Found {len(leaderboard_data)} users in leaderboard")
        
        # Check consistency
        print("\n🔍 Checking consistency between database and leaderboard...")
        inconsistencies = []
        
        for i, user in enumerate(users):
            leaderboard_user = next((u for u in leaderboard_data if u['username'] == user.username), None)
            
            if not leaderboard_user:
                inconsistencies.append(f"❌ User {user.username} not found in leaderboard")
                continue
            
            if user.ranking != leaderboard_user['rank']:
                inconsistencies.append(
                    f"❌ {user.username}: DB rank {user.ranking} != Leaderboard rank {leaderboard_user['rank']}"
                )
            
            # Calculate points for verification
            points = await calculate_user_points(user)
            print(f"✅ {user.username}: Rank {user.ranking}, Points {points}, Wins {user.winBattle}, Win Rate {user.winRate}%")
        
        if inconsistencies:
            print("\n❌ INCONSISTENCIES FOUND:")
            for issue in inconsistencies:
                print(f"  {issue}")
        else:
            print("\n✅ All rankings are consistent!")
        
        # Show top 10 users
        print("\n🏆 TOP 10 USERS:")
        for i, user in enumerate(users[:10], 1):
            points = await calculate_user_points(user)
            print(f"{i:2d}. {user.username:15s} | Rank: {user.ranking:3d} | Points: {points:4d} | Wins: {user.winBattle:2d} | Win Rate: {user.winRate:3d}%")
        
    except Exception as e:
        print(f"❌ Error testing rankings: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_rankings()) 