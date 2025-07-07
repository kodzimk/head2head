import asyncio
import aiohttp
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json

logger = logging.getLogger(__name__)

LIKES_FILE = os.path.join(os.path.dirname(__file__), 'likes.json')

class NewsService:
    def __init__(self):
        self.api_key = 'a47eccf6946b22529c1df36e45fb984b'
        self.base_url = "http://api.mediastack.com/v1"
        self.news_cache: List[Dict] = []
        self.likes_data: Dict[str, int] = self.load_likes()  # article_id -> likes_count
        self.last_fetch: Optional[datetime] = None
        self.fetch_interval = timedelta(hours=2)
        
    def load_likes(self) -> Dict[str, int]:
        """Load likes from persistent storage"""
        if os.path.exists(LIKES_FILE):
            try:
                with open(LIKES_FILE, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load likes from file: {e}")
        return {}

    def save_likes(self):
        """Save likes to persistent storage"""
        try:
            with open(LIKES_FILE, 'w') as f:
                json.dump(self.likes_data, f)
        except Exception as e:
            logger.error(f"Failed to save likes to file: {e}")

    async def fetch_sports_news(self) -> List[Dict]:
        """Fetch all sports news from MediaStack API, returning at least 20 articles if possible"""
        if not self.api_key:
            logger.error("MediaStack API key not found")
            return []
            
        try:
            params = {
                'access_key': self.api_key,
                'categories': 'sports',
                'languages': 'en',
                'sort': 'published_desc',
                'limit': 50  # Fetch up to 50
            }
            # Expanded keywords to filter out more restricted and entertainment/celebrity/viral content
            restricted_keywords = [
                'music', 'song', 'album', 'concert', 'band', 'singer', 'rapper', 'pop star', 'playlist', 'track', 'single', 'dj', 'mixtape', 'record label',
                'gambling', 'casino', 'betting', 'poker', 'lottery', 'wager', 'odds', 'bookmaker', 'sportsbook',
                'adult', 'porn', 'sex', 'escort', 'xxx', 'nsfw', 'onlyfans', 'camgirl', 'cam boy', 'camgirl', 'cam site',
                'violence', 'shooting', 'murder', 'crime', 'drugs', 'cocaine', 'heroin', 'marijuana', 'weed', 'meth', 'fentanyl', 'overdose',
                'nude', 'nudity', 'explicit', 'racism', 'hate', 'terror', 'terrorism', 'extremist', 'extremism', 'abuse', 'molest', 'rape', 'incest', 'child porn',
                'prostitute', 'prostitution', 'escort', 'stripper', 'strip club', 'lap dance', 'orgy', 'swinger', 'fetish', 'bdsm', 'bondage', 'kink',
                'suicide', 'self-harm', 'cutting', 'kill', 'stab', 'stabbed', 'beheaded', 'decapitate', 'execution', 'massacre', 'mass shooting',
                'genocide', 'holocaust', 'nazism', 'neo-nazi', 'isis', 'al-qaeda', 'jihad', 'bomb', 'explosion', 'explosive', 'grenade', 'gun', 'firearm',
                'arson', 'burned alive', 'lynching', 'hang', 'hanged', 'strangle', 'strangulation', 'dismember', 'dismemberment', 'torture', 'waterboarding',
                'pedophile', 'pedophilia', 'child abuse', 'child molest', 'child rape', 'child trafficking', 'sex trafficking', 'human trafficking',
                'bestiality', 'zoophilia', 'animal abuse', 'animal cruelty', 'animal torture',
                'incel', 'incels', 'misogyny', 'misogynist', 'homophobia', 'homophobic', 'transphobia', 'transphobic',
                'hate crime', 'hate group', 'white supremacist', 'white supremacy', 'kkk', 'klan', 'neo-nazi', 'skinhead',
                'gang', 'gangster', 'cartel', 'mafia', 'mob', 'organized crime', 'trafficking', 'smuggling', 'smuggler',
                'pro-ana', 'pro-mia', 'anorexia', 'bulimia', 'eating disorder', 'starve', 'starvation',
                'incest', 'child exploitation', 'child pornography', 'revenge porn', 'upskirt', 'downblouse',
                'revenge porn', 'deepfake', 'deep fake', 'fake nudes', 'fake porn',
                # Entertainment/celebrity/viral content
                'wwe', 'wrestling', 'star', 'celebrity', 'model', 'personal message', 'viral', 'breaks the internet',
                'selfie', 'instagram', 'tiktok', 'influencer', 'social media', 'follower', 'followers', 'likes', 'shares', 'trend', 'trending',
                'reality tv', 'reality show', 'bikini', 'lingerie', 'swimsuit', 'fashion nova', 'playboy', 'centerfold', 'cover girl',
                'gossip', 'tabloid', 'paparazzi', 'hollywood', 'bollywood', 'movie star', 'tv star', 'soap opera', 'drama', 'dating', 'affair', 'scandal',
            ]
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/news", params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        if 'data' in data:
                            articles = []
                            seen_urls = set()
                            seen_titles = set()
                            for article in data['data']:
                                text = f"{article.get('title','')} {article.get('description','')}".lower()
                                if any(keyword in text for keyword in restricted_keywords):
                                    continue  # Skip restricted articles
                                url = article.get('url', '').strip().lower()
                                title = article.get('title', '').strip().lower()
                                if url in seen_urls or title in seen_titles:
                                    continue  # Skip duplicates
                                seen_urls.add(url)
                                seen_titles.add(title)
                                article['id'] = f"news_{hash(article.get('url', ''))}"
                                article['likes'] = self.likes_data.get(article['id'], 0)
                                articles.append(article)
                            # Return up to 50, but at least 20 if possible
                            return articles[:50] if len(articles) >= 20 else articles
                        else:
                            logger.error(f"Invalid response format: {data}")
                            return []
                    else:
                        logger.error(f"Failed to fetch news: {response.status}")
                        return []
                        
        except Exception as e:
            logger.error(f"Error fetching sports news: {e}")
            return []
    
    async def update_news_cache(self):
        """Update the news cache with fresh data"""
        try:
            new_news = await self.fetch_sports_news()
            if new_news:
                self.news_cache = new_news
                self.last_fetch = datetime.now()
                logger.info(f"Updated news cache with {len(new_news)} articles")
            else:
                logger.warning("No news fetched, keeping existing cache")
        except Exception as e:
            logger.error(f"Error updating news cache: {e}")
    
    def should_refresh_cache(self) -> bool:
        """Check if cache should be refreshed"""
        if not self.last_fetch:
            return True
        return datetime.now() - self.last_fetch >= self.fetch_interval
    
    async def get_sports_news(self) -> List[Dict]:
        """Get sports news, refreshing cache if needed"""
        if self.should_refresh_cache():
            await self.update_news_cache()
        return self.news_cache
    
    def like_article(self, article_id: str) -> int:
        """Like an article and return updated like count"""
        current_likes = self.likes_data.get(article_id, 0)
        self.likes_data[article_id] = current_likes + 1
        self.save_likes()
        
        # Update the article in cache
        for article in self.news_cache:
            if article.get('id') == article_id:
                article['likes'] = self.likes_data[article_id]
                break
                
        return self.likes_data[article_id]
    
    def unlike_article(self, article_id: str) -> int:
        """Unlike an article and return updated like count"""
        current_likes = self.likes_data.get(article_id, 0)
        if current_likes > 0:
            self.likes_data[article_id] = current_likes - 1
        else:
            self.likes_data[article_id] = 0
        self.save_likes()
        
        # Update the article in cache
        for article in self.news_cache:
            if article.get('id') == article_id:
                article['likes'] = self.likes_data[article_id]
                break
                
        return self.likes_data[article_id]
    
    def get_article_likes(self, article_id: str) -> int:
        """Get like count for an article"""
        return self.likes_data.get(article_id, 0)
    
    async def start_background_refresh(self):
        """Start background task to refresh news every 2 hours"""
        while True:
            try:
                await self.update_news_cache()
                await asyncio.sleep(7200)  # 2 hours in seconds
            except Exception as e:
                logger.error(f"Error in background news refresh: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes before retrying

# Global news service instance
news_service = NewsService() 