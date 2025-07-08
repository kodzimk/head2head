from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, update, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid
from datetime import datetime
import json
import jwt

from init import get_db, redis_email
from models import (
    DebatePick, DebateComment, DebateVote, CommentLike,
    DebatePickCreate, DebatePickResponse, DebateCommentCreate, 
    DebateCommentResponse, DebateVoteCreate, DebateVoteResponse,
    DebatePickWithVoteResponse, CommentLikeCreate, CommentLikeResponse
)

router = APIRouter(prefix="/selection", tags=["selection"])

SECRET_KEY = """MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEAqCWwNCUir+tatvRa
O0R3VOk9kTq5KY35NmKmlE3Dq280IdHtB87b+clPvs7/QyZHFE9DhQMAUWUOx+0T
zoKsywIDAQABAkAuWAzjomSYFgcvq9N+yFUXix2T/JpyMJZCfhgpgfFvO0mPSdJ8
mXrKwyo5LPf0Ha8ckRvwZyS2MSMmD8D8lNfRAiEA3IjBDjjICXgV7TfesU4MnIYW
X2t3L+SFnCDzU+qcUAMCIQDDMDKBUfQqYzrulxtfjwF/qmiPfwVbXm7es5OQdsJJ
mQIhAJRdRFQHCzyjl0zB+4WZFo7u/novWD3WJbUFze20tnh1AiEAnqjW5PfRGYN/
q+F4hryf4z6Jr9r4Z8TjKnOeR5fBZkECH2tlOpeGdcfA8qouEtD2njNo4P63Ibmu
mffGKz34haM="""
ALGORITHM = "HS256"

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(authorization: str = Header(None)):
    """Get current user from JWT token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        # Extract token from "Bearer <token>" format
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization format")
        
        token = authorization.replace("Bearer ", "")
        payload = decode_access_token(token)
        email = payload.get("sub")
        
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        # Get user data from Redis
        user_data = redis_email.get(email)
        if not user_data:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_dict = json.loads(user_data)
        return {
            "username": user_dict["username"],
            "email": user_dict["email"],
            "display_name": user_dict["username"]  # You can modify this to use a proper display name field
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

@router.get("/picks", response_model=List[DebatePickResponse])
async def get_all_picks(
    category: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all debate picks with optional category filter"""
    query = select(DebatePick).where(DebatePick.is_active == True)
    
    if category:
        query = query.where(DebatePick.category == category)
    
    query = query.order_by(DebatePick.created_at.desc()).offset(offset).limit(limit)
    
    result = await db.execute(query)
    picks = result.scalars().all()
    
    # Convert to response format
    response_picks = []
    for pick in picks:
        response_picks.append(DebatePickResponse(
            id=pick.id,
            category=pick.category,
            option1_name=pick.option1_name,
            option1_image=pick.option1_image,
            option1_description=pick.option1_description,
            option1_votes=pick.option1_votes,
            option2_name=pick.option2_name,
            option2_image=pick.option2_image,
            option2_description=pick.option2_description,
            option2_votes=pick.option2_votes,
            created_at=pick.created_at,
            is_active=pick.is_active
        ))
    
    return response_picks

@router.get("/picks/{pick_id}", response_model=DebatePickResponse)
async def get_pick(
    pick_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific debate pick"""
    query = select(DebatePick).where(DebatePick.id == pick_id)
    result = await db.execute(query)
    pick = result.scalar_one_or_none()
    
    if not pick:
        raise HTTPException(status_code=404, detail="Pick not found")
    
    return DebatePickResponse(
        id=pick.id,
        category=pick.category,
        option1_name=pick.option1_name,
        option1_image=pick.option1_image,
        option1_description=pick.option1_description,
        option1_votes=pick.option1_votes,
        option2_name=pick.option2_name,
        option2_image=pick.option2_image,
        option2_description=pick.option2_description,
        option2_votes=pick.option2_votes,
        created_at=pick.created_at,
        is_active=pick.is_active
    )

@router.post("/picks", response_model=DebatePickResponse)
async def create_pick(
    pick_data: DebatePickCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new debate pick"""
    new_pick = DebatePick(
        id=str(uuid.uuid4()),
        option1_name=pick_data.option1_name,
        option1_description=pick_data.option1_description,
        option2_name=pick_data.option2_name,
        option2_description=pick_data.option2_description,
        category=pick_data.category,
    )
    
    db.add(new_pick)
    await db.commit()
    await db.refresh(new_pick)
    
    return DebatePickResponse(
        id=new_pick.id,
        category=new_pick.category,
        option1_name=new_pick.option1_name,
        option1_image=new_pick.option1_image,
        option1_description=new_pick.option1_description,
        option1_votes=new_pick.option1_votes,
        option2_name=new_pick.option2_name,
        option2_image=new_pick.option2_image,
        option2_description=new_pick.option2_description,
        option2_votes=new_pick.option2_votes,
        created_at=new_pick.created_at,
        is_active=new_pick.is_active
    )



@router.get("/picks/{pick_id}/comments", response_model=List[DebateCommentResponse])
async def get_pick_comments(
    pick_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get comments for a specific pick"""
    # Get top-level comments (no parent_id)
    comments_query = select(DebateComment).where(
        and_(DebateComment.pick_id == pick_id, DebateComment.parent_id.is_(None))
    ).order_by(DebateComment.created_at.desc())
    
    result = await db.execute(comments_query)
    comments = result.scalars().all()
    
    # Convert to response format with likes and replies
    async def convert_comment(comment):
        # Get likes count
        likes_query = select(func.count(CommentLike.id)).where(CommentLike.comment_id == comment.id)
        likes_result = await db.execute(likes_query)
        likes_count = likes_result.scalar()
        
        # Check if current user liked this comment
        user_like_query = select(CommentLike).where(
            and_(CommentLike.comment_id == comment.id, CommentLike.user_id == current_user["username"])
        )
        user_like_result = await db.execute(user_like_query)
        user_liked = user_like_result.scalar_one_or_none() is not None
        
        # Get replies count
        replies_query = select(func.count(DebateComment.id)).where(DebateComment.parent_id == comment.id)
        replies_result = await db.execute(replies_query)
        replies_count = replies_result.scalar()
        
        return DebateCommentResponse(
            id=comment.id,
            pick_id=comment.pick_id,
            parent_id=comment.parent_id,
            author_id=comment.author_id,
            author_name=comment.author_name,
            content=comment.content,
            created_at=comment.created_at,
            likes_count=likes_count,
            user_liked=user_liked,
            replies_count=replies_count,
            replies=[]
        )
    
    # Convert all comments
    response_comments = []
    for comment in comments:
        response_comments.append(await convert_comment(comment))
    
    return response_comments

@router.post("/picks/{pick_id}/comments", response_model=DebateCommentResponse)
async def create_comment(
    pick_id: str,
    comment_data: DebateCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new comment on a pick"""
    # Verify pick exists
    pick_query = select(DebatePick).where(DebatePick.id == pick_id)
    pick_result = await db.execute(pick_query)
    pick = pick_result.scalar_one_or_none()
    
    if not pick:
        raise HTTPException(status_code=404, detail="Pick not found")
    
    # If this is a reply, verify parent comment exists
    if comment_data.parent_id:
        parent_query = select(DebateComment).where(DebateComment.id == comment_data.parent_id)
        parent_result = await db.execute(parent_query)
        parent_comment = parent_result.scalar_one_or_none()
        
        if not parent_comment:
            raise HTTPException(status_code=404, detail="Parent comment not found")
    
    new_comment = DebateComment(
        id=str(uuid.uuid4()),
        pick_id=pick_id,
        parent_id=comment_data.parent_id,
        author_id=current_user["username"],
        author_name=current_user["display_name"],
        content=comment_data.content
    )
    
    db.add(new_comment)
    
    await db.commit()
    await db.refresh(new_comment)
    
    return DebateCommentResponse(
        id=new_comment.id,
        pick_id=new_comment.pick_id,
        parent_id=new_comment.parent_id,
        author_id=new_comment.author_id,
        author_name=new_comment.author_name,
        content=new_comment.content,
        created_at=new_comment.created_at,
        likes_count=0,
        user_liked=False,
        replies_count=0,
        replies=[]
    )

@router.post("/comments/{comment_id}/like", response_model=CommentLikeResponse)
async def like_comment(
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Like a comment"""
    # Check if comment exists
    comment_query = select(DebateComment).where(DebateComment.id == comment_id)
    result = await db.execute(comment_query)
    comment = result.scalar_one_or_none()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check if user already liked this comment
    existing_like_query = select(CommentLike).where(
        and_(CommentLike.comment_id == comment_id, CommentLike.user_id == current_user["username"])
    )
    result = await db.execute(existing_like_query)
    existing_like = result.scalar_one_or_none()
    
    if existing_like:
        raise HTTPException(status_code=400, detail="You have already liked this comment")
    
    # Create new like
        new_like = CommentLike(
            id=str(uuid.uuid4()),
            comment_id=comment_id,
            user_id=current_user["username"]
        )
    
        db.add(new_like)
    await db.commit()
    await db.refresh(new_like)
    
    return CommentLikeResponse(
        id=new_like.id,
        comment_id=new_like.comment_id,
        user_id=new_like.user_id,
        created_at=new_like.created_at
    )

@router.delete("/comments/{comment_id}/like")
async def unlike_comment(
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Unlike a comment"""
    # Find user's like
    like_query = select(CommentLike).where(
        and_(CommentLike.comment_id == comment_id, CommentLike.user_id == current_user["username"])
    )
    result = await db.execute(like_query)
    like = result.scalar_one_or_none()
    
    if not like:
        raise HTTPException(status_code=404, detail="Like not found")
    
    # Delete like
    await db.delete(like)
    await db.commit()
    
    return {"message": "Like removed successfully"}

@router.get("/comments/{comment_id}/replies", response_model=List[DebateCommentResponse])
async def get_comment_replies(
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get replies for a specific comment"""
    # Check if parent comment exists
    parent_query = select(DebateComment).where(DebateComment.id == comment_id)
    result = await db.execute(parent_query)
    parent_comment = result.scalar_one_or_none()
    
    if not parent_comment:
        raise HTTPException(status_code=404, detail="Parent comment not found")
    
    # Get replies
    replies_query = select(DebateComment).where(
        DebateComment.parent_id == comment_id
    ).order_by(DebateComment.created_at.asc())
    
    result = await db.execute(replies_query)
    replies = result.scalars().all()
    
    # Convert to response format
    async def convert_reply(reply):
        # Get likes count
        likes_query = select(func.count(CommentLike.id)).where(CommentLike.comment_id == reply.id)
        likes_result = await db.execute(likes_query)
        likes_count = likes_result.scalar()
        
        # Check if current user liked this reply
        user_like_query = select(CommentLike).where(
            and_(CommentLike.comment_id == reply.id, CommentLike.user_id == current_user["username"])
        )
        user_like_result = await db.execute(user_like_query)
        user_liked = user_like_result.scalar_one_or_none() is not None
        
        return DebateCommentResponse(
            id=reply.id,
            pick_id=reply.pick_id,
            parent_id=reply.parent_id,
            author_id=reply.author_id,
            author_name=reply.author_name,
            content=reply.content,
            created_at=reply.created_at,
            likes_count=likes_count,
            user_liked=user_liked,
            replies_count=0,
            replies=[]
        )
    
    # Convert all replies
    response_replies = []
    for reply in replies:
        response_replies.append(await convert_reply(reply))
    
    return response_replies



@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get all available categories"""
    query = select(DebatePick.category).distinct()
    result = await db.execute(query)
    categories = [row[0] for row in result.fetchall()]
    return {"categories": categories}

@router.post("/seed-debates")
async def seed_debates(db: AsyncSession = Depends(get_db)):
    """Seed the database with daily debate picks for every sport available in the website"""
    
    # Check if any picks already exist for today to avoid duplicates
    today = datetime.utcnow().date()
    
    existing_picks = await db.execute(
        select(DebatePick).where(
            and_(
                func.date(DebatePick.created_at) == today,
                DebatePick.is_active == True
            )
        )
    )
    existing_count = len(existing_picks.scalars().all())
    
    if existing_count > 0:
        return {
            "message": f"Today's debates already exist. Found {existing_count} active debates for {today}.",
            "existing_count": existing_count,
            "date": str(today)
        }
    
    # Reset all engagement data for fresh start
    # Delete all comments
    await db.execute(delete(DebateComment))
    
    # Deactivate all previous debates and reset their vote counts
    await db.execute(
        update(DebatePick).values(
            is_active=False,
            total_votes=0,
            total_comments=0
        )
    )
    
    # Daily debate pools for each sport - will rotate daily
    debate_pools = {
        "football": [
            {
                "option1_name": "Lionel Messi",
                "option1_description": "Argentine professional footballer, widely regarded as one of the greatest players of all time. Winner of 8 Ballon d'Or awards.",
                "option2_name": "Cristiano Ronaldo",
                "option2_description": "Portuguese professional footballer, known for his incredible athleticism and goal-scoring ability. 5-time Ballon d'Or winner.",
            },
            {
                "option1_name": "Pelé",
                "option1_description": "Brazilian football legend, three-time World Cup winner and cultural icon. Scored over 1000 career goals.",
                "option2_name": "Diego Maradona",
                "option2_description": "Argentine football legend, known for his incredible skill and the famous 'Hand of God' goal in 1986 World Cup.",
            },
            {
                "option1_name": "Kylian Mbappé",
                "option1_description": "French professional footballer, World Cup winner and one of the fastest players in the world.",
                "option2_name": "Erling Haaland",
                "option2_description": "Norwegian professional footballer, known for his incredible goal-scoring record and physical presence.",
            }
        ],
        "basketball": [
            {
                "option1_name": "Michael Jordan",
                "option1_description": "Former American professional basketball player, six-time NBA champion and cultural icon. Widely considered the GOAT.",
                "option2_name": "LeBron James",
                "option2_description": "American professional basketball player, four-time NBA champion. Known for his longevity and all-around excellence.",
            },
            {
                "option1_name": "Kobe Bryant",
                "option1_description": "Late American professional basketball player, five-time NBA champion known for his incredible work ethic and 'Mamba Mentality'.",
                "option2_name": "Stephen Curry",
                "option2_description": "American professional basketball player, four-time NBA champion and revolutionary three-point shooter.",
            },
            {
                "option1_name": "Magic Johnson",
                "option1_description": "Former American professional basketball player, five-time NBA champion and legendary point guard.",
                "option2_name": "Larry Bird",
                "option2_description": "Former American professional basketball player, three-time NBA champion and one of the greatest shooters ever.",
            }
        ],
        "tennis": [
            {
                "option1_name": "Serena Williams",
                "option1_description": "American professional tennis player, 23-time Grand Slam singles champion. Dominated women's tennis for over a decade.",
                "option2_name": "Steffi Graf",
                "option2_description": "German former professional tennis player, 22-time Grand Slam champion. Only player to achieve the Golden Slam.",
            },
            {
                "option1_name": "Roger Federer",
                "option1_description": "Swiss former professional tennis player, 20-time Grand Slam champion known for his elegant playing style.",
                "option2_name": "Rafael Nadal",
                "option2_description": "Spanish professional tennis player, 22-time Grand Slam champion and 'King of Clay' at Roland Garros.",
            },
            {
                "option1_name": "Novak Djokovic",
                "option1_description": "Serbian professional tennis player, 24-time Grand Slam champion and former world No. 1.",
                "option2_name": "Andy Murray",
                "option2_description": "British former professional tennis player, three-time Grand Slam champion and Olympic gold medalist.",
            }
        ],
        "baseball": [
            {
                "option1_name": "Babe Ruth",
                "option1_description": "American professional baseball player, legendary home run hitter. Transformed baseball from dead-ball era to live-ball era.",
                "option2_name": "Barry Bonds",
                "option2_description": "American former professional baseball player, all-time home run leader with 762 career home runs.",
            },
            {
                "option1_name": "Mickey Mantle",
                "option1_description": "American professional baseball player, seven-time World Series champion known for his incredible power from both sides of the plate.",
                "option2_name": "Willie Mays",
                "option2_description": "American former professional baseball player, known as the 'Say Hey Kid' and considered one of the greatest all-around players.",
            },
            {
                "option1_name": "Derek Jeter",
                "option1_description": "American former professional baseball player, five-time World Series champion and Yankees legend.",
                "option2_name": "Ken Griffey Jr.",
                "option2_description": "American former professional baseball player, known for his smooth swing and incredible defensive skills.",
            }
        ],
        "hockey": [
            {
                "option1_name": "Wayne Gretzky",
                "option1_description": "Canadian former professional ice hockey player, known as 'The Great One'. Holds numerous NHL records.",
                "option2_name": "Gordie Howe",
                "option2_description": "Canadian professional ice hockey player, known as 'Mr. Hockey'. Played professionally for 32 years.",
            },
            {
                "option1_name": "Mario Lemieux",
                "option1_description": "Canadian former professional ice hockey player, two-time Stanley Cup champion and Pittsburgh Penguins legend.",
                "option2_name": "Maurice Richard",
                "option2_description": "Canadian professional ice hockey player, known as 'Rocket Richard' and first player to score 50 goals in 50 games.",
            },
            {
                "option1_name": "Connor McDavid",
                "option1_description": "Canadian professional ice hockey player, current NHL superstar and multiple Hart Trophy winner.",
                "option2_name": "Sidney Crosby",
                "option2_description": "Canadian professional ice hockey player, three-time Stanley Cup champion and Pittsburgh Penguins captain.",
            }
        ],
        "golf": [
            {
                "option1_name": "Tiger Woods",
                "option1_description": "American professional golfer, 15-time major champion. Dominated golf in the 2000s and one of the greatest athletes ever.",
                "option2_name": "Jack Nicklaus",
                "option2_description": "American retired professional golfer, 18-time major champion. Known as 'The Golden Bear' and considered the greatest golfer.",
            },
            {
                "option1_name": "Arnold Palmer",
                "option1_description": "American professional golfer, seven-time major champion and charismatic 'The King' of golf.",
                "option2_name": "Gary Player",
                "option2_description": "South African former professional golfer, nine-time major champion and member of the 'Big Three'.",
            },
            {
                "option1_name": "Rory McIlroy",
                "option1_description": "Northern Irish professional golfer, four-time major champion and former world No. 1.",
                "option2_name": "Jordan Spieth",
                "option2_description": "American professional golfer, three-time major champion and youngest player to win multiple majors since Tiger Woods.",
            }
        ],
        "cricket": [
            {
                "option1_name": "Sachin Tendulkar",
                "option1_description": "Indian former international cricketer, widely regarded as one of the greatest batsmen. Scored 100 international centuries.",
                "option2_name": "Don Bradman",
                "option2_description": "Australian international cricketer, widely acknowledged as the greatest batsman of all time. Career average of 99.94.",
            },
            {
                "option1_name": "Virat Kohli",
                "option1_description": "Indian international cricketer, former captain and one of the greatest batsmen in modern cricket.",
                "option2_name": "AB de Villiers",
                "option2_description": "South African former international cricketer, known as 'Mr. 360' for his innovative batting style.",
            },
            {
                "option1_name": "MS Dhoni",
                "option1_description": "Indian former international cricketer, legendary captain who led India to World Cup victory in 2011.",
                "option2_name": "Ricky Ponting",
                "option2_description": "Australian former international cricketer, two-time World Cup winning captain and aggressive batsman.",
            }
        ],
        "volleyball": [
            {
                "option1_name": "Karch Kiraly",
                "option1_description": "American volleyball player and coach, only player to win Olympic gold in both indoor and beach volleyball.",
                "option2_name": "Giba",
                "option2_description": "Brazilian former volleyball player, three-time Olympic medalist and World Championship winner.",
            },
            {
                "option1_name": "Misty May-Treanor",
                "option1_description": "American former beach volleyball player, three-time Olympic gold medalist and most successful beach volleyball player.",
                "option2_name": "Kerri Walsh Jennings",
                "option1_description": "American beach volleyball player, three-time Olympic gold medalist and longtime partner of Misty May-Treanor.",
            },
            {
                "option1_name": "Ivan Zaytsev",
                "option1_description": "Italian volleyball player, known as 'The Tsar' and one of the most powerful spikers in the world.",
                "option2_name": "Wilfredo León",
                "option2_description": "Polish volleyball player of Cuban origin, known for his incredible jumping ability and powerful attacks.",
            }
        ],
        "rugby": [
            {
                "option1_name": "Jonah Lomu",
                "option1_description": "New Zealand rugby union player, widely regarded as the first global superstar of rugby. Dominated the 1995 World Cup.",
                "option2_name": "Richie McCaw",
                "option2_description": "New Zealand former rugby union player, two-time World Cup winning captain. Most capped All Black of all time.",
            },
            {
                "option1_name": "Dan Carter",
                "option1_description": "New Zealand former rugby union player, widely regarded as the greatest fly-half of all time.",
                "option2_name": "Johnny Wilkinson",
                "option2_description": "English former rugby union player, 2003 World Cup winner famous for his drop goal in the final.",
            },
            {
                "option1_name": "Brian O'Driscoll",
                "option1_description": "Irish former rugby union player, legendary center and former captain of Ireland and the British & Irish Lions.",
                "option2_name": "Sergio Parisse",
                "option2_description": "Italian former rugby union player, most capped player in rugby history and legendary number 8.",
            }
        ],
        "boxing": [
            {
                "option1_name": "Muhammad Ali",
                "option1_description": "American professional boxer, three-time heavyweight champion. Known as 'The Greatest' and cultural icon.",
                "option2_name": "Mike Tyson",
                "option2_description": "American former professional boxer, youngest heavyweight champion in history. Known for his ferocious power.",
            },
            {
                "option1_name": "Floyd Mayweather Jr.",
                "option1_description": "American former professional boxer, undefeated in 50 professional fights and multiple division champion.",
                "option2_name": "Manny Pacquiao",
                "option2_description": "Filipino former professional boxer, only eight-division world champion and boxing legend.",
            },
            {
                "option1_name": "Sugar Ray Robinson",
                "option1_description": "American professional boxer, widely regarded as the greatest pound-for-pound boxer of all time.",
                "option2_name": "Rocky Marciano",
                "option2_description": "American professional boxer, only heavyweight champion to retire undefeated with 49-0 record.",
            }
        ]
    }
    
    # Calculate which debate to show based on day of year
    import calendar
    day_of_year = datetime.utcnow().timetuple().tm_yday
    
    # Create today's debates
    sample_picks = []
    for sport, debates in debate_pools.items():
        # Rotate through debates based on day of year
        debate_index = (day_of_year - 1) % len(debates)
        selected_debate = debates[debate_index]
        
        pick_data = {
            "id": str(uuid.uuid4()),
            "title": f"{selected_debate['option1_name']} vs {selected_debate['option2_name']}",
            "description": f"Who is the greater athlete? {selected_debate['option1_name']}: {selected_debate['option1_description']} OR {selected_debate['option2_name']}: {selected_debate['option2_description']}",
            "category": "Player Comparison",
            "sport": sport,
            "author_username": "system",
            "author_display_name": "Head2Head System",
            "total_votes": 0,
            "total_comments": 0,
            "created_at": datetime.utcnow(),
            "is_active": True
        }
        sample_picks.append(pick_data)

    # Add picks to database
    for pick_data in sample_picks:
        db_pick = DebatePick(**pick_data)
        db.add(db_pick)

    await db.commit()
    
    # Count debates by category
    categories = {}
    for pick in sample_picks:
        category = pick["category"]
        if category not in categories:
            categories[category] = 0
        categories[category] += 1
    
    return {
        "message": f"Successfully created {len(sample_picks)} fresh debates for {today}!",
        "total_debates": len(sample_picks),
        "debates_by_sport": categories,
        "date": str(today),
        "rotation_info": f"Day {day_of_year} of the year - debates will rotate daily",
        "reset_info": "All previous votes, comments, and likes have been reset to 0"
    } 

@router.post("/picks/{pick_id}/vote", response_model=DebateVoteResponse)
async def vote_on_pick(
    pick_id: str,
    vote_data: DebateVoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Vote on a debate pick"""
    # Validate vote option
    if vote_data.vote_option not in ["option1", "option2"]:
        raise HTTPException(status_code=400, detail="Invalid vote option. Must be 'option1' or 'option2'")
    
    # Check if pick exists
    pick_query = select(DebatePick).where(DebatePick.id == pick_id)
    result = await db.execute(pick_query)
    pick = result.scalar_one_or_none()
    
    if not pick:
        raise HTTPException(status_code=404, detail="Pick not found")
    
    # Check if user already voted
    existing_vote_query = select(DebateVote).where(
        and_(DebateVote.pick_id == pick_id, DebateVote.user_id == current_user["username"])
    )
    result = await db.execute(existing_vote_query)
    existing_vote = result.scalar_one_or_none()
    
    if existing_vote:
        # Update existing vote
        if existing_vote.vote_option == vote_data.vote_option:
            raise HTTPException(status_code=400, detail="You have already voted for this option")
        
        # Remove previous vote
        if existing_vote.vote_option == "option1":
            pick.option1_votes -= 1
        else:
            pick.option2_votes -= 1
        
        # Update vote
        existing_vote.vote_option = vote_data.vote_option
    else:
        # Create new vote
        new_vote = DebateVote(
            id=str(uuid.uuid4()),
            pick_id=pick_id,
            user_id=current_user["username"],
            vote_option=vote_data.vote_option
        )
        db.add(new_vote)
    
    # Update vote count
    if vote_data.vote_option == "option1":
        pick.option1_votes += 1
    else:
        pick.option2_votes += 1
    
    await db.commit()
    
    # Return the vote
    if existing_vote:
        return DebateVoteResponse(
            id=existing_vote.id,
            pick_id=existing_vote.pick_id,
            user_id=existing_vote.user_id,
            vote_option=existing_vote.vote_option,
            created_at=existing_vote.created_at
        )
    else:
        return DebateVoteResponse(
            id=new_vote.id,
            pick_id=new_vote.pick_id,
            user_id=new_vote.user_id,
            vote_option=new_vote.vote_option,
            created_at=new_vote.created_at
        )

@router.delete("/picks/{pick_id}/vote")
async def remove_vote(
    pick_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Remove user's vote from a debate pick"""
    # Check if pick exists
    pick_query = select(DebatePick).where(DebatePick.id == pick_id)
    result = await db.execute(pick_query)
    pick = result.scalar_one_or_none()
    
    if not pick:
        raise HTTPException(status_code=404, detail="Pick not found")
    
    # Find user's vote
    vote_query = select(DebateVote).where(
        and_(DebateVote.pick_id == pick_id, DebateVote.user_id == current_user["username"])
    )
    result = await db.execute(vote_query)
    vote = result.scalar_one_or_none()
    
    if not vote:
        raise HTTPException(status_code=404, detail="No vote found for this user")
    
    # Remove vote count
    if vote.vote_option == "option1":
        pick.option1_votes -= 1
    else:
        pick.option2_votes -= 1
    
    # Delete vote
    await db.delete(vote)
    await db.commit()
    
    return {"message": "Vote removed successfully"}

@router.get("/picks/{pick_id}/vote")
async def get_user_vote(
    pick_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get user's vote for a specific pick"""
    vote_query = select(DebateVote).where(
        and_(DebateVote.pick_id == pick_id, DebateVote.user_id == current_user["username"])
    )
    result = await db.execute(vote_query)
    vote = result.scalar_one_or_none()
    
    if not vote:
        return {"user_vote": None}
    
    return {"user_vote": vote.vote_option}

@router.get("/picks/{pick_id}/with-vote", response_model=DebatePickWithVoteResponse)
async def get_pick_with_user_vote(
    pick_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific debate pick with user's vote information"""
    # Get pick
    pick_query = select(DebatePick).where(DebatePick.id == pick_id)
    result = await db.execute(pick_query)
    pick = result.scalar_one_or_none()
    
    if not pick:
        raise HTTPException(status_code=404, detail="Pick not found")
    
    # Get user's vote
    vote_query = select(DebateVote).where(
        and_(DebateVote.pick_id == pick_id, DebateVote.user_id == current_user["username"])
    )
    result = await db.execute(vote_query)
    vote = result.scalar_one_or_none()
    
    user_vote = vote.vote_option if vote else None
    
    return DebatePickWithVoteResponse(
        id=pick.id,
        category=pick.category,
        option1_name=pick.option1_name,
        option1_image=pick.option1_image,
        option1_description=pick.option1_description,
        option1_votes=pick.option1_votes,
        option2_name=pick.option2_name,
        option2_image=pick.option2_image,
        option2_description=pick.option2_description,
        option2_votes=pick.option2_votes,
        created_at=pick.created_at,
        is_active=pick.is_active,
        user_vote=user_vote
    ) 