import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { Badge } from '../../shared/ui/badge';
import { 
  ArrowLeft, 
  Heart, 
  ExternalLink,
  User,
} from 'lucide-react';
import Header from '../dashboard/header';
import { newsService } from '../../shared/services/news-service';
interface NewsComment {
  id: string;
  author: string;
  authorAvatar: string;
  content: string;
  timestamp: Date;
  likes: number;
  isLiked: boolean;
  replies: NewsComment[];
}

interface NewsDetail {
  id: string;
  title: string;
  content: string;
  description: string;
  author: string;
  source: string;
  timestamp: Date;
  sport: string;
  category: string;
  tags: string[];
  likes: number;
  isLiked: boolean;
  comments: NewsComment[];
  imageUrl?: string;
  sourceUrl?: string;
  breaking: boolean;
  importance: 'low' | 'medium' | 'high';
}

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [newsDetail, setNewsDetail] = useState<NewsDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [likedArticles, setLikedArticles] = useState<Set<string>>(new Set());

  // Load liked articles from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('likedArticles');
      if (stored) {
        const likedIds = JSON.parse(stored);
        setLikedArticles(new Set(likedIds));
      }
    } catch (error) {
      console.error('Error loading liked articles:', error);
    }
  }, []);

  // Save liked articles to localStorage
  const saveLikedArticles = (likedIds: Set<string>) => {
    try {
      localStorage.setItem('likedArticles', JSON.stringify(Array.from(likedIds)));
    } catch (error) {
      console.error('Error saving liked articles:', error);
    }
  };

  // Helper functions for content processing
  const extractSport = (text: string): string => {
    const sports = ['Football', 'Basketball', 'Tennis', 'Baseball', 'Soccer', 'Hockey', 'Volleyball', 'Cricket', 'Rugby', 'Golf'];
    const lowerText = text.toLowerCase();
    
    for (const sport of sports) {
      if (lowerText.includes(sport.toLowerCase())) {
        return sport;
      }
    }
    return 'Sports';
  };

  const extractCategory = (title: string): string => {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('transfer') || lowerTitle.includes('trade') || lowerTitle.includes('signing')) {
      return 'Transfer News';
    }
    if (lowerTitle.includes('injury') || lowerTitle.includes('hurt') || lowerTitle.includes('out')) {
      return 'Injury Report';
    }
    if (lowerTitle.includes('contract') || lowerTitle.includes('deal') || lowerTitle.includes('extension')) {
      return 'Contract News';
    }
    if (lowerTitle.includes('championship') || lowerTitle.includes('final') || lowerTitle.includes('cup')) {
      return 'Championship';
    }
    return 'General News';
  };

  const extractTags = (text: string): string[] => {
    const tags: string[] = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('breaking') || lowerText.includes('urgent')) {
      tags.push('Breaking');
    }
    if (lowerText.includes('transfer') || lowerText.includes('trade')) {
      tags.push('Transfer');
    }
    if (lowerText.includes('injury')) {
      tags.push('Injury');
    }
    if (lowerText.includes('contract')) {
      tags.push('Contract');
    }
    
    return tags.length > 0 ? tags : ['Sports'];
  };

  const isBreakingNews = (publishedAt: string): boolean => {
    const published = new Date(publishedAt);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    return published > twoHoursAgo;
  };

  const calculateImportance = (text: string): 'low' | 'medium' | 'high' => {
    const lowerText = text.toLowerCase();
    const highKeywords = ['championship', 'final', 'transfer', 'injury', 'breaking', 'urgent'];
    const mediumKeywords = ['match', 'game', 'player', 'team', 'league'];
    
    for (const keyword of highKeywords) {
      if (lowerText.includes(keyword)) {
        return 'high';
      }
    }
    
    for (const keyword of mediumKeywords) {
      if (lowerText.includes(keyword)) {
        return 'medium';
      }
    }
    
    return 'low';
  };


  useEffect(() => {
    const loadNewsDetail = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        
        // First, try to get the specific news data that was clicked on
        const currentNewsData = localStorage.getItem('currentNewsData');
        
        if (currentNewsData) {
          const parsedCurrentNews = JSON.parse(currentNewsData);
          
          // Convert ForumPost to NewsDetail format
          const newsDetail: NewsDetail = {
            id: parsedCurrentNews.id,
            title: parsedCurrentNews.title,
            content: parsedCurrentNews.content,
            description: parsedCurrentNews.content.substring(0, 200) + '...',
            author: parsedCurrentNews.author,
            source: 'Sports News',
            timestamp: new Date(parsedCurrentNews.timestamp),
            sport: parsedCurrentNews.sport,
            category: parsedCurrentNews.category,
            tags: parsedCurrentNews.tags,
            likes: 0,
            isLiked: likedArticles.has(parsedCurrentNews.id),
            comments: [],
            breaking: false,
            importance: 'medium',
            imageUrl: parsedCurrentNews.imageUrl || undefined,
            sourceUrl: parsedCurrentNews.sourceUrl || undefined
          };
          
          // Debug: Log the news detail data
          console.log('News detail data:', {
            id: newsDetail.id,
            title: newsDetail.title,
            imageUrl: newsDetail.imageUrl,
            sourceUrl: newsDetail.sourceUrl
          });
          
          setNewsDetail(newsDetail);
          setIsLoading(false);
          return;
        }
        
        // Fallback: try to get news data from localStorage (from forum page)
        const storedNewsData = localStorage.getItem('forumNewsData');
        let newsArticle = null;
        
                  if (storedNewsData) {
            const parsedData = JSON.parse(storedNewsData);
            newsArticle = parsedData.data?.find((article: any) => 
              article.url?.includes(id) || 
              article.title?.toLowerCase().includes(id.toLowerCase()) ||
              article.url?.split('/').pop() === id
            );
          }
        
        // If not found in localStorage, fetch fresh data
        if (!newsArticle) {
          const newsResponse = await newsService.getTopSportsHeadlines();
          
                      newsArticle = newsResponse.data.find((article: any) => 
              article.url?.includes(id) || 
              article.title?.toLowerCase().includes(id.toLowerCase()) ||
              article.url?.split('/').pop() === id
            );
            
            if (!newsArticle) {
              // If still not found, use the first article as fallback
              newsArticle = newsResponse.data[0];
            }
        }
        
        if (!newsArticle) {
          throw new Error('No news articles available');
        }
        
                  // Convert to NewsDetail format
          const newsDetail: NewsDetail = {
            id: id,
            title: newsArticle.title || 'News Article',
            content: newsArticle.description || 'No content available',
            description: newsArticle.description || 'No description available',
            author: newsArticle.author || 'Unknown Author',
            source: newsArticle.source || 'Unknown Source',
            timestamp: new Date(newsArticle.published_at || Date.now()),
            sport: extractSport(newsArticle.title + ' ' + newsArticle.description),
            category: extractCategory(newsArticle.title),
            tags: extractTags(newsArticle.title + ' ' + newsArticle.description),
            likes: Math.floor(Math.random() * 1000) + 100,
            isLiked: false,
            comments: [
              {
                id: 'comment-1',
                author: 'SportsFan2024',
                authorAvatar: '/images/placeholder-user.jpg',
                content: 'This is absolutely insane! Never saw this coming. The league is going to be completely different next season.',
                timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
                likes: 23,
                isLiked: false,
                replies: [
                  {
                    id: 'reply-1',
                    author: 'BasketballAnalyst',
                    authorAvatar: '/images/placeholder-user.jpg',
                    content: 'I agree! This changes everything. The salary cap implications alone are mind-blowing.',
                    timestamp: new Date(Date.now() - 45 * 60 * 1000),
                    likes: 8,
                    isLiked: true,
                    replies: []
                  },
                  {
                    id: 'reply-2',
                    author: 'TradeExpert',
                    authorAvatar: '/images/placeholder-user.jpg',
                    content: 'The timing of this trade is perfect. Both teams are getting exactly what they need.',
                    timestamp: new Date(Date.now() - 40 * 60 * 1000),
                    likes: 5,
                    isLiked: false,
                    replies: []
                  },
                  {
                    id: 'reply-3',
                    author: 'FanPerspective',
                    authorAvatar: '/images/placeholder-user.jpg',
                    content: 'As a fan, I\'m excited but also nervous about how this will affect team chemistry.',
                    timestamp: new Date(Date.now() - 35 * 60 * 1000),
                    likes: 12,
                    isLiked: false,
                    replies: []
                  },
                  {
                    id: 'reply-4',
                    author: 'StatsGuru',
                    authorAvatar: '/images/placeholder-user.jpg',
                    content: 'Looking at the numbers, this trade actually makes a lot of sense for both sides.',
                    timestamp: new Date(Date.now() - 30 * 60 * 1000),
                    likes: 7,
                    isLiked: false,
                    replies: []
                  }
                ]
              },
              {
                id: 'comment-2',
                author: 'CoachKnowsAll',
                authorAvatar: '/images/placeholder-user.jpg',
                content: 'From a strategic standpoint, this makes sense for both teams. The front office clearly has a long-term vision.',
                timestamp: new Date(Date.now() - 30 * 60 * 1000),
                likes: 15,
                isLiked: false,
                replies: []
              }
            ],
            imageUrl: newsArticle.image || '/images/sports-arena.jpg',
            sourceUrl: newsArticle.url,
            breaking: isBreakingNews(newsArticle.published_at),
            importance: calculateImportance(newsArticle.title + ' ' + newsArticle.description)
          };
          
          setNewsDetail(newsDetail);
      } catch (error) {
        console.error('Error loading news detail:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNewsDetail();
  }, [id]);


  const handleLike = async () => {
    if (!newsDetail) return;
    
    try {
      let result;
      if (newsDetail.isLiked) {
        result = await newsService.unlikeArticle(newsDetail.id);
      } else {
        result = await newsService.likeArticle(newsDetail.id);
      }
      
      if (result.success) {
        setNewsDetail(prev => prev ? {
          ...prev,
          isLiked: !prev.isLiked,
          likes: result.likes
        } : null);
        
        // Update liked articles set
        const newLikedArticles = new Set(likedArticles);
        if (newsDetail.isLiked) {
          newLikedArticles.delete(newsDetail.id);
        } else {
          newLikedArticles.add(newsDetail.id);
        }
        setLikedArticles(newLikedArticles);
        saveLikedArticles(newLikedArticles);
      }
    } catch (error) {
      console.error('Error handling like:', error);
      // Fallback to local state if backend fails
      setNewsDetail(prev => prev ? {
        ...prev,
        isLiked: !prev.isLiked,
        likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1
      } : null);
      
      // Update liked articles set for fallback
      const newLikedArticles = new Set(likedArticles);
      if (newsDetail.isLiked) {
        newLikedArticles.delete(newsDetail.id);
      } else {
        newLikedArticles.add(newsDetail.id);
      }
      setLikedArticles(newLikedArticles);
      saveLikedArticles(newLikedArticles);
    }
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-lg">Loading news...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!newsDetail) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">News Not Found</h1>
            <p className="text-muted-foreground mb-4">The news article you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/forum')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Forum
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-4xl">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/forum')}
          className="mb-4 sm:mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Back to Forum</span>
          <span className="sm:hidden">Back</span>
        </Button>

        {/* Main Article */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs sm:text-sm">{newsDetail.sport}</Badge>
                  <Badge variant="outline" className="text-xs sm:text-sm">{newsDetail.category}</Badge>
                  {newsDetail.breaking && (
                    <Badge variant="destructive" className="animate-pulse text-xs sm:text-sm">
                      BREAKING
                    </Badge>
                  )}
                </div>
                
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 leading-tight">
                  {newsDetail.title}
                </h1>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{newsDetail.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{newsDetail.source}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
            <div className="rounded-lg overflow-hidden">
              {newsDetail.imageUrl ? (
                <img 
                  src={newsDetail.imageUrl} 
                  alt={newsDetail.title}
                  className="w-full h-48 sm:h-64 object-cover"
                  onError={(e) => {
                    console.error('Image failed to load:', newsDetail.imageUrl);
                    e.currentTarget.src = '/images/sports-arena.jpg';
                  }}
                />
              ) : (
                <img 
                  src="/images/sports-arena.jpg" 
                  alt="Sports Arena"
                  className="w-full h-48 sm:h-64 object-cover"
                />
              )}
            </div>
            
            <div className="prose prose-gray max-w-none">
              <div className="space-y-3 sm:space-y-4 text-foreground leading-relaxed text-sm sm:text-base">
                {newsDetail.content.split('\n\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-1 sm:gap-2">
              {newsDetail.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pt-4 border-t border-border">
              <div className="flex items-center gap-3 sm:gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={`hover:scale-105 transition-all ${
                    newsDetail.isLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-red-500'
                  }`}
                >
                  <Heart className={`w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 ${newsDetail.isLiked ? 'fill-current' : ''}`} />
                  <span className="text-sm">{newsDetail.likes}</span>
                </Button>
              </div>
              
              <div className="flex gap-2">
                {newsDetail.sourceUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={newsDetail.sourceUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Read Original</span>
                      <span className="sm:hidden">Original</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        {/* Removed comments section for news/transfer detail pages */}
      </div>
    </div>
  );
} 