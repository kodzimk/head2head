from auth.init import router, SessionLocal, User, UserCreate
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import EmailStr
from sqlalchemy import select

async def user_exists(db: AsyncSession, email: str) -> bool:
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    return user is not None

@router.post("/signup")
async def create_user(user: UserCreate):
    async with SessionLocal() as db:
        if not await user_exists(db, user.email):
            db_user = User(password=user.password, username=user.username, email=user.email)
            db.add(db_user)
            await db.commit()
            await db.refresh(db_user)
            print(db_user)
            return db_user
        return None

@router.get("/signin")
async def check_user(email: EmailStr):
    async with SessionLocal() as db:
        data =  await db.get(User, email)
        return data



