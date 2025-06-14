from init import router, SessionLocal, UserDataCreate, UserData
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import EmailStr
from sqlalchemy import select

async def user_exists(db: AsyncSession, email: str) -> bool:
    stmt = select(UserData).where(UserData.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    return user is not None

    
@router.post("/signup")
async def create_user_data(user: UserDataCreate):
    async with SessionLocal() as db:
        if not await user_exists(db, user.email):
            db_user = UserData(
                username=user.username,
                email=user.email,
                totalBattle=user.totalBattle,
                winRate=user.winRate,
                ranking=user.ranking,
                winBattle=user.winBattle,
                favourite=user.favourite,
                streak=user.streak,
            )
            db.add(db_user)
            await db.commit()
            await db.refresh(db_user)
            return db_user
        return None

@router.get("/signin")
async def get_user_data(email: EmailStr):
    async with SessionLocal() as db:
        data = await db.get(UserData, email)
        return data






