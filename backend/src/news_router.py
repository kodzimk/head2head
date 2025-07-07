from fastapi import APIRouter, HTTPException
from typing import List, Dict
from news_service import news_service

router = APIRouter(prefix="/news", tags=["news"])

@router.get("/sports")
async def get_sports_news() -> Dict:
    """Get sports news from cache"""
    try:
        news = await news_service.get_sports_news()
        return {
            "success": True,
            "data": news,
            "count": len(news),
            "last_updated": news_service.last_fetch.isoformat() if news_service.last_fetch else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {str(e)}")

@router.post("/like/{article_id}")
async def like_article(article_id: str) -> Dict:
    """Like an article"""
    try:
        likes_count = news_service.like_article(article_id)
        return {
            "success": True,
            "article_id": article_id,
            "likes": likes_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to like article: {str(e)}")

@router.post("/unlike/{article_id}")
async def unlike_article(article_id: str) -> Dict:
    """Unlike an article"""
    try:
        likes_count = news_service.unlike_article(article_id)
        return {
            "success": True,
            "article_id": article_id,
            "likes": likes_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unlike article: {str(e)}")

@router.get("/likes/{article_id}")
async def get_article_likes(article_id: str) -> Dict:
    """Get like count for an article"""
    try:
        likes_count = news_service.get_article_likes(article_id)
        return {
            "success": True,
            "article_id": article_id,
            "likes": likes_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get article likes: {str(e)}")

@router.post("/refresh")
async def refresh_news_cache() -> Dict:
    """Manually refresh the news cache"""
    try:
        await news_service.update_news_cache()
        return {
            "success": True,
            "message": "News cache refreshed successfully",
            "last_updated": news_service.last_fetch.isoformat() if news_service.last_fetch else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh news cache: {str(e)}")

@router.get("/status")
async def get_news_status() -> Dict:
    """Get news service status"""
    return {
        "success": True,
        "cache_size": len(news_service.news_cache),
        "last_fetch": news_service.last_fetch.isoformat() if news_service.last_fetch else None,
        "next_refresh": (news_service.last_fetch + news_service.fetch_interval).isoformat() if news_service.last_fetch else None,
        "api_key_configured": bool(news_service.api_key)
    } 