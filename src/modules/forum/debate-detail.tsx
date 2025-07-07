import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { Badge } from '../../shared/ui/badge';
import { Textarea } from '../../shared/ui/textarea';
import { 
  ArrowLeft, 
  MessageSquare, 
  Share2, 
  Clock, 
  Send,
  User,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import Header from '../dashboard/header';

interface DebateComment {
  id: string;
  author: string;
  authorAvatar: string;
  content: string;
  timestamp: Date;
  likes: number;
  isLiked: boolean;
  stance: 'for' | 'against' | 'neutral';
  replies?: DebateComment[];
}

interface DebateDetail {
  id: string;
  title: string;
  description: string;
  author: string;
  authorAvatar: string;
  timestamp: Date;
  sport: string;
  category: string;
  tags: string[];
  votesFor: number;
  votesAgainst: number;
  userVote: 'for' | 'against' | null;
  comments: DebateComment[];
  imageUrl?: string;
  importance: 'low' | 'medium' | 'high';
}

export default function DebateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [debateDetail, setDebateDetail] = useState<DebateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentStance, setCommentStance] = useState<'for' | 'against' | 'neutral'>('neutral');
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  // Mock current user
  const currentUser = {
    id: 'current-user',
    name: 'You',
    avatar: '/images/placeholder-user.jpg'
  };

  useEffect(() => {
    const loadDebateDetail = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        
        // Mock debate data
        const mockDebate: DebateDetail = {
          id: id,
          title: 'Should VAR be removed from football?',
          description: `Video Assistant Referee (VAR) has been a controversial addition to football since its introduction. While it aims to reduce errors in decision-making, many argue it disrupts the flow of the game and removes the human element from football.

Key Points For:
- Reduces referee errors
- Makes the game more fair
- Provides clarity on difficult decisions

Key Points Against:
- Disrupts game flow
- Removes spontaneity
- Controversial interpretations still exist
- Affects match atmosphere

What's your stance on this debate?`,
          author: 'SportsFan2024',
          authorAvatar: '/images/placeholder-user.jpg',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          sport: 'Football',
          category: 'Rules & Regulations',
          tags: ['VAR', 'Football', 'Rules', 'Technology'],
          votesFor: 245,
          votesAgainst: 189,
          userVote: null,
          comments: [
            {
              id: 'comment-1',
              author: 'FootballPurist',
              authorAvatar: '/images/placeholder-user.jpg',
              content: "VAR is killing the spontaneous joy of football. A goal is scored and you can't even celebrate properly anymore.",
              timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
              likes: 23,
              isLiked: false,
              stance: 'against',
              replies: [
                {
                  id: 'reply-1',
                  author: 'VARSupporter',
                  authorAvatar: '/images/placeholder-user.jpg',
                  content: 'But what about all the wrong decisions that VAR has corrected? The benefits outweigh the drawbacks.',
                  timestamp: new Date(Date.now() - 30 * 60 * 1000),
                  likes: 8,
                  isLiked: false,
                  stance: 'for'
                },
                {
                  id: 'reply-2',
                  author: 'FootballFan',
                  authorAvatar: '/images/placeholder-user.jpg',
                  content: 'I agree with VARSupporter. The technology has prevented many injustices.',
                  timestamp: new Date(Date.now() - 25 * 60 * 1000),
                  likes: 5,
                  isLiked: false,
                  stance: 'for'
                },
                {
                  id: 'reply-3',
                  author: 'Traditionalist',
                  authorAvatar: '/images/placeholder-user.jpg',
                  content: 'Football was fine for 100+ years without VAR. Why change what works?',
                  timestamp: new Date(Date.now() - 20 * 60 * 1000),
                  likes: 12,
                  isLiked: false,
                  stance: 'against'
                },
                {
                  id: 'reply-4',
                  author: 'Referee',
                  authorAvatar: '/images/placeholder-user.jpg',
                  content: 'As a referee, VAR has made my job much easier and more accurate.',
                  timestamp: new Date(Date.now() - 15 * 60 * 1000),
                  likes: 15,
                  isLiked: false,
                  stance: 'for'
                }
              ]
            },
            {
              id: 'comment-2',
              author: 'TechInSport',
              authorAvatar: '/images/placeholder-user.jpg',
              content: 'Technology improves accuracy. Would you rather have wrong decisions affecting match outcomes?',
              timestamp: new Date(Date.now() - 45 * 60 * 1000),
              likes: 18,
              isLiked: false,
              stance: 'for'
            }
          ],
          imageUrl: '/images/sports-arena.jpg',
          importance: 'high'
        };

        await new Promise(resolve => setTimeout(resolve, 1000));
        setDebateDetail(mockDebate);
      } catch (error) {
        console.error('Error loading debate detail:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDebateDetail();
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

  const handleVote = (stance: 'for' | 'against') => {
    if (!debateDetail) return;

    setDebateDetail(prev => {
      if (!prev) return null;

      const updateVotes = () => {
        if (prev.userVote === stance) {
          // Remove vote
          return {
            votesFor: stance === 'for' ? prev.votesFor - 1 : prev.votesFor,
            votesAgainst: stance === 'against' ? prev.votesAgainst - 1 : prev.votesAgainst,
            userVote: null
          };
        } else {
          // Add/change vote
          return {
            votesFor: stance === 'for' 
              ? prev.votesFor + 1 
              : prev.userVote === 'for' 
                ? prev.votesFor - 1 
                : prev.votesFor,
            votesAgainst: stance === 'against'
              ? prev.votesAgainst + 1
              : prev.userVote === 'against'
                ? prev.votesAgainst - 1
                : prev.votesAgainst,
            userVote: stance
          };
        }
      };

      const { votesFor, votesAgainst, userVote } = updateVotes();

      return {
        ...prev,
        votesFor,
        votesAgainst,
        userVote
      };
    });
  };

  const handleCommentLike = (commentId: string) => {
    if (!debateDetail) return;
    
    setDebateDetail(prev => {
      if (!prev) return null;
      
      return {
        ...prev,
        comments: prev.comments.map(comment => 
          comment.id === commentId
            ? {
                ...comment,
                isLiked: !comment.isLiked,
                likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
              }
            : comment
        )
      };
    });
  };

  const handleSubmitComment = () => {
    if (!commentText.trim() || !debateDetail || commentText.length > 1000) return;
    
    const newComment: DebateComment = {
      id: `comment-${Date.now()}`,
      author: currentUser.name,
      authorAvatar: currentUser.avatar,
      content: commentText,
      timestamp: new Date(),
      likes: 0,
      isLiked: false,
      stance: commentStance
    };

    setDebateDetail(prev => prev ? {
      ...prev,
      comments: [newComment, ...prev.comments]
    } : null);
    
    setCommentText('');
    setCommentStance('neutral');
  };

  const handleSubmitReply = (commentId: string) => {
    if (!replyText.trim() || !debateDetail || replyText.length > 500) return;
    
    const newReply: DebateComment = {
      id: `reply-${Date.now()}`,
      author: currentUser.name,
      authorAvatar: currentUser.avatar,
      content: replyText,
      timestamp: new Date(),
      likes: 0,
      isLiked: false,
      stance: 'neutral'
    };

    setDebateDetail(prev => {
      if (!prev) return null;
      
      return {
        ...prev,
        comments: prev.comments.map(comment => 
          comment.id === commentId
            ? {
                ...comment,
                replies: [...(comment.replies || []), newReply]
              }
            : comment
        )
      };
    });
    
    setReplyText('');
    setReplyToComment(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent, commentId: string) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmitReply(commentId);
    }
  };

  const CommentComponent = ({ comment }: { comment: DebateComment }) => (
    <div className="mb-4">
      <div className="flex items-start gap-3">
        <img 
          src={comment.authorAvatar} 
          alt={comment.author}
          className="w-8 h-8 rounded-full border border-border"
        />
        <div className="flex-1">
          <div className={`bg-muted/30 rounded-lg p-3 ${
            comment.stance === 'for' 
              ? 'border-l-4 border-l-green-500'
              : comment.stance === 'against'
                ? 'border-l-4 border-l-red-500'
                : ''
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{comment.author}</span>
              <Badge variant={
                comment.stance === 'for' 
                  ? 'success' 
                  : comment.stance === 'against'
                    ? 'destructive'
                    : 'secondary'
              }>
                {comment.stance === 'for' ? 'For' : comment.stance === 'against' ? 'Against' : 'Neutral'}
              </Badge>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyToComment(replyToComment === comment.id ? null : comment.id)}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Reply
            </Button>
          </div>

          {/* Reply Input */}
          {replyToComment === comment.id && (
            <div className="mt-3 p-3 bg-muted/20 rounded-lg border border-border/50">
              <div className="flex items-start gap-3">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full border border-border flex-shrink-0 mt-1"
                />
                <div className="flex-1 space-y-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => handleReplyKeyDown(e, comment.id)}
                    placeholder="Write a reply..."
                    className="min-h-[80px] resize-none text-sm"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {replyText.length}/500 characters
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyText('');
                          setReplyToComment(null);
                        }}
                        disabled={!replyText.trim()}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSubmitReply(comment.id)}
                        disabled={!replyText.trim() || replyText.length > 500}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 ml-6 space-y-3">
              {comment.replies.length > 2 && !expandedReplies.has(comment.id) ? (
                // Show first 2 replies + "Show More" button
                <>
                  {comment.replies.slice(0, 2).map(reply => (
                    <div key={reply.id} className="flex items-start gap-2">
                      <img 
                        src={reply.authorAvatar} 
                        alt={reply.author}
                        className="w-6 h-6 rounded-full border border-border"
                      />
                      <div className="flex-1">
                        <div className="bg-muted/20 rounded-lg p-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-xs">{reply.author}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(reply.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-foreground">{reply.content}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCommentLike(reply.id)}
                            className={`text-xs ${reply.isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
                          >
                            <ThumbsUp className="w-2 h-2 mr-1" />
                            {reply.likes}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedReplies(prev => new Set([...prev, comment.id]))}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    Show {comment.replies.length - 2} more replies
                  </Button>
                </>
              ) : (
                // Show all replies
                <>
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="flex items-start gap-2">
                      <img 
                        src={reply.authorAvatar} 
                        alt={reply.author}
                        className="w-6 h-6 rounded-full border border-border"
                      />
                      <div className="flex-1">
                        <div className="bg-muted/20 rounded-lg p-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-xs">{reply.author}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(reply.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-foreground">{reply.content}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCommentLike(reply.id)}
                            className={`text-xs ${reply.isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
                          >
                            <ThumbsUp className="w-2 h-2 mr-1" />
                            {reply.likes}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {comment.replies.length > 2 && expandedReplies.has(comment.id) && (
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
            <span className="ml-2 text-lg">Loading debate...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!debateDetail) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Debate Not Found</h1>
            <p className="text-muted-foreground mb-4">The debate you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/forum')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Forum
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalVotes = debateDetail.votesFor + debateDetail.votesAgainst;
  const forPercentage = totalVotes > 0 ? Math.round((debateDetail.votesFor / totalVotes) * 100) : 50;
  const againstPercentage = 100 - forPercentage;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/forum')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Forum
        </Button>

        {/* Main Debate */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary">{debateDetail.sport}</Badge>
                  <Badge variant="outline">{debateDetail.category}</Badge>
                </div>
                
                <h1 className="text-3xl font-bold mb-4 leading-tight">
                  {debateDetail.title}
                </h1>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{debateDetail.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatTimeAgo(debateDetail.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {debateDetail.imageUrl && (
              <div className="rounded-lg overflow-hidden">
                <img 
                  src={debateDetail.imageUrl} 
                  alt={debateDetail.title}
                  className="w-full h-64 object-cover"
                />
              </div>
            )}
            
            <div className="prose prose-gray max-w-none">
              <div className="space-y-4 text-foreground leading-relaxed">
                {debateDetail.description.split('\n\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {debateDetail.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>

            {/* Voting Section */}
            <div className="border border-border rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold mb-2">Cast Your Vote</h3>
              
              <div className="flex gap-4">
                <Button
                  onClick={() => handleVote('for')}
                  variant={debateDetail.userVote === 'for' ? 'default' : 'outline'}
                  className="flex-1 border-green-500 hover:bg-green-500/90 hover:text-white"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  For ({forPercentage}%)
                </Button>
                
                <Button
                  onClick={() => handleVote('against')}
                  variant={debateDetail.userVote === 'against' ? 'default' : 'outline'}
                  className="flex-1 border-red-500 hover:bg-red-500/90 hover:text-white"
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Against ({againstPercentage}%)
                </Button>
              </div>

              {/* Vote Progress Bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${forPercentage}%` }}
                />
              </div>

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{debateDetail.votesFor} votes</span>
                <span>{debateDetail.votesAgainst} votes</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="w-5 h-5" />
                  <span>{debateDetail.comments.length} comments</span>
                </div>
              </div>
              
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold">Comments ({debateDetail.comments.length})</h2>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Add Comment */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Share your thoughts</h3>
              <div className="p-4 bg-muted/10 rounded-lg border border-border/50">
                <div className="flex items-start gap-3">
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full border border-border flex-shrink-0 mt-1"
                  />
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={commentStance === 'for' ? 'default' : 'outline'}
                        onClick={() => setCommentStance('for')}
                        className="border-green-500 hover:bg-green-500/90 hover:text-white"
                      >
                        <ThumbsUp className="w-3 h-3 mr-1" />
                        For
                      </Button>
                      <Button
                        size="sm"
                        variant={commentStance === 'against' ? 'default' : 'outline'}
                        onClick={() => setCommentStance('against')}
                        className="border-red-500 hover:bg-red-500/90 hover:text-white"
                      >
                        <ThumbsDown className="w-3 h-3 mr-1" />
                        Against
                      </Button>
                      <Button
                        size="sm"
                        variant={commentStance === 'neutral' ? 'default' : 'outline'}
                        onClick={() => setCommentStance('neutral')}
                      >
                        Neutral
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Share your thoughts on this debate..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="min-h-[100px] border-border/50 focus:border-primary/50 resize-none"
                    />
                    <div className="flex items-center justify-between">
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
                          Clear
                        </Button>
                        <Button
                          onClick={handleSubmitComment}
                          disabled={!commentText.trim() || commentText.length > 1000}
                          size="sm"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Post Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {debateDetail.comments.length > 0 ? (
                debateDetail.comments.map(comment => (
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