import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { Badge } from '../../shared/ui/badge';
import { Textarea } from '../../shared/ui/textarea';
import { 
  ArrowLeft, 
  Heart, 
  MessageSquare, 
  ExternalLink,
  Send,
  User,
  ThumbsUp
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
  const [commentText, setCommentText] = useState('');
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

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

  // Mock current user
  const currentUser = {
    id: 'current-user',
    name: 'You',
    avatar: '/images/placeholder-user.jpg'
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
            isLiked: false,
            comments: [],
            breaking: false,
            importance: 'medium',
            imageUrl: parsedCurrentNews.imageUrl || undefined,
            sourceUrl: parsedCurrentNews.sourceUrl || undefined
          };
          
          setNewsDetail(newsDetail);
          setIsLoading(false);
          return;
        }
        
        // Fallback: try to get news data from localStorage (from forum page)
        const storedNewsData = localStorage.getItem('forumNewsData');
        let newsArticle = null;
        
        if (storedNewsData) {
          const parsedData = JSON.parse(storedNewsData);
          newsArticle = parsedData.articles?.find((article: any) => 
            article.url?.includes(id) || 
            article.title?.toLowerCase().includes(id.toLowerCase()) ||
            article.url?.split('/').pop() === id
          );
        }
        
        // If not found in localStorage, fetch fresh data
        if (!newsArticle) {
          const newsResponse = await newsService.getTopSportsHeadlines({
            pageSize: 20
          });
          
          newsArticle = newsResponse.articles.find(article => 
            article.url?.includes(id) || 
            article.title?.toLowerCase().includes(id.toLowerCase()) ||
            article.url?.split('/').pop() === id
          );
          
          if (!newsArticle) {
            // If still not found, use the first article as fallback
            newsArticle = newsResponse.articles[0];
          }
        }
        
        if (!newsArticle) {
          throw new Error('No news articles available');
        }
        
        // Convert to NewsDetail format
        const newsDetail: NewsDetail = {
          id: id,
          title: newsArticle.title || 'News Article',
          content: newsArticle.content || newsArticle.description || 'No content available',
          description: newsArticle.description || 'No description available',
          author: newsArticle.author || 'Unknown Author',
          source: newsArticle.source?.name || 'Unknown Source',
          timestamp: new Date(newsArticle.publishedAt || Date.now()),
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
            imageUrl: newsArticle.urlToImage || '/images/sports-arena.jpg',
            sourceUrl: newsArticle.url,
            breaking: isBreakingNews(newsArticle.publishedAt),
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

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - timestamp.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 60) {
      return `${diffInMins}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInDays}d ago`;
    }
  };

  const handleLike = () => {
    if (!newsDetail) return;
    
    setNewsDetail(prev => prev ? {
      ...prev,
      isLiked: !prev.isLiked,
      likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1
    } : null);
  };

  const handleCommentLike = (commentId: string) => {
    if (!newsDetail) return;
    
    const updateComments = (comments: NewsComment[]): NewsComment[] => {
      return comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            isLiked: !comment.isLiked,
            likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
          };
        }
        return {
          ...comment,
          replies: updateComments(comment.replies)
        };
      });
    };

    setNewsDetail(prev => prev ? {
      ...prev,
      comments: updateComments(prev.comments)
    } : null);
  };

  const handleSubmitComment = () => {
    if (!commentText.trim() || !newsDetail || commentText.length > 1000) return;
    
    const newComment: NewsComment = {
      id: `comment-${Date.now()}`,
      author: currentUser.name,
      authorAvatar: currentUser.avatar,
      content: commentText,
      timestamp: new Date(),
      likes: 0,
      isLiked: false,
      replies: []
    };

    setNewsDetail(prev => prev ? {
      ...prev,
      comments: [newComment, ...prev.comments]
    } : null);
    
    setCommentText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmitComment();
    }
  };



  const ReplyInput = ({ commentId }: { commentId: string }) => {
    const [localReplyText, setLocalReplyText] = useState('');

    const handleLocalSubmit = () => {
      if (!localReplyText.trim() || localReplyText.length > 1000) return;
      
      const newReply: NewsComment = {
        id: `reply-${Date.now()}`,
        author: currentUser.name,
        authorAvatar: currentUser.avatar,
        content: localReplyText,
        timestamp: new Date(),
        likes: 0,
        isLiked: false,
        replies: []
      };

      const updateComments = (comments: NewsComment[]): NewsComment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: [...comment.replies, newReply]
            };
          }
          return {
            ...comment,
            replies: updateComments(comment.replies)
          };
        });
      };

      setNewsDetail(prev => prev ? {
        ...prev,
        comments: updateComments(prev.comments)
      } : null);
      
      setLocalReplyText('');
      setReplyToComment(null);
    };

    const handleLocalKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleLocalSubmit();
      }
    };

    return (
      <div className="mt-3 p-4 bg-muted/10 rounded-lg border border-border/50">
        <div className="flex items-start gap-3">
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name}
            className="w-8 h-8 rounded-full border border-border flex-shrink-0 mt-1"
          />
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="Share your thoughts on this comment..."
              value={localReplyText}
              onChange={(e) => setLocalReplyText(e.target.value)}
              onKeyDown={handleLocalKeyDown}
              className="min-h-[100px] border-border/50 focus:border-primary/50 resize-none"
              maxLength={1000}
            />
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="text-xs text-muted-foreground">
                  {localReplyText.length}/1000 characters
                </div>
                <div className="text-xs text-muted-foreground/70">
                  <kbd className="px-1 py-0.5 bg-muted text-muted-foreground rounded text-xs">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted text-muted-foreground rounded text-xs">Enter</kbd> to post
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setLocalReplyText('');
                    setReplyToComment(null);
                  }}
                  disabled={!localReplyText.trim()}
                  size="sm"
                >
                  Clear
                </Button>
                <Button
                  onClick={handleLocalSubmit}
                  disabled={!localReplyText.trim() || localReplyText.length > 1000}
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Post Reply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CommentComponent = ({ comment, isReply = false }: { comment: NewsComment; isReply?: boolean }) => (
    <div className={`${isReply ? 'ml-8 mt-3' : 'mb-4'}`}>
      <div className="flex items-start gap-3">
        <img 
          src={comment.authorAvatar} 
          alt={comment.author}
          className="w-8 h-8 rounded-full border border-border"
        />
        <div className="flex-1">
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{comment.author}</span>
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(comment.timestamp)}
              </span>
            </div>
            <p className="text-sm text-foreground">{comment.content}</p>
          </div>
          
          <div className="flex items-center gap-4 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCommentLike(comment.id)}
              className={`text-xs ${comment.isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
            >
              <ThumbsUp className="w-3 h-3 mr-1" />
              {comment.likes}
            </Button>
            
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyToComment(replyToComment === comment.id ? null : comment.id)}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                Reply
              </Button>
            )}
          </div>

          {/* Reply Input */}
          {!isReply && replyToComment === comment.id && (
            <ReplyInput commentId={comment.id} />
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 ml-6 space-y-3">
              {comment.replies.length > 1 && !expandedReplies.has(comment.id) ? (
                // Show first reply + "Show replies" button
                <>
                  <CommentComponent comment={comment.replies[0]} isReply={true} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedReplies(prev => new Set([...prev, comment.id]))}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    Show {comment.replies.length - 1} more replies
                  </Button>
                </>
              ) : (
                // Show all replies
                <>
                  {comment.replies.map(reply => (
                    <CommentComponent key={reply.id} comment={reply} isReply={true} />
                  ))}
                  {comment.replies.length > 1 && expandedReplies.has(comment.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedReplies(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(comment.id);
                        return newSet;
                      })}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      Show less
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

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
            {newsDetail.imageUrl && (
              <div className="rounded-lg overflow-hidden">
                <img 
                  src={newsDetail.imageUrl} 
                  alt={newsDetail.title}
                  className="w-full h-48 sm:h-64 object-cover"
                />
              </div>
            )}
            
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
                
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>{newsDetail.comments.length} comments</span>
                </div>
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
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold">Comments ({newsDetail.comments.length})</h2>
          </CardHeader>
          
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
            {/* Add Comment */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">Share your thoughts</h3>
              <div className="p-3 sm:p-4 bg-muted/10 rounded-lg border border-border/50">
                <div className="flex items-start gap-2 sm:gap-3">
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name}
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-border flex-shrink-0 mt-1"
                  />
                  <div className="flex-1 space-y-2 sm:space-y-3">
                    <Textarea
                      placeholder="Share your thoughts on this news..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="min-h-[80px] sm:min-h-[100px] border-border/50 focus:border-primary/50 resize-none text-sm"
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-muted-foreground">
                          {commentText.length}/1000 characters
                        </div>
                        <div className="text-xs text-muted-foreground/70">
                          <kbd className="px-1 py-0.5 bg-muted text-muted-foreground rounded text-xs">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted text-muted-foreground rounded text-xs">Enter</kbd> to post
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setCommentText('')}
                          disabled={!commentText.trim()}
                          size="sm"
                        >
                          <span className="hidden sm:inline">Clear</span>
                          <span className="sm:hidden">Clear</span>
                        </Button>
                        <Button
                          onClick={handleSubmitComment}
                          disabled={!commentText.trim() || commentText.length > 1000}
                          size="sm"
                        >
                          <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Post Comment</span>
                          <span className="sm:hidden">Post</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {newsDetail.comments.length > 0 ? (
                newsDetail.comments.map(comment => (
                  <CommentComponent key={comment.id} comment={comment} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No comments yet. Be the first to share your thoughts!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 