import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { Badge } from '../../shared/ui/badge';
import { Textarea } from '../../shared/ui/textarea';
import { 
  ArrowLeft, 
  MessageSquare, 
  Clock, 
  Send,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import Header from '../dashboard/header';
import { debateService} from '../../shared/services/debate-service';
import { useGlobalStore } from '../../shared/interface/gloabL_var';

interface DebateComment {
  id: string;
  author: string;
  authorAvatar: string;
  content: string;
  timestamp: Date;
  likes: number;
  isLiked: boolean;
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
  userVote: 'option1' | 'option2' | null;
  comments: DebateComment[];
  imageUrl?: string;
  importance: 'low' | 'medium' | 'high';
}

export default function DebateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useGlobalStore();

  const [debateDetail, setDebateDetail] = useState<DebateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<{ [commentId: string]: string }>({});
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
      
      // Check if user is authenticated
      const hasToken = !!localStorage.getItem('access_token');
      const hasUsername = !!localStorage.getItem('username');
      
      if (!hasToken || !hasUsername) {
        navigate('/sign-in');
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Load real debate data from backend with user vote
        const [debateData, commentsData] = await Promise.all([
          debateService.getDebateWithVote(id),
          debateService.getDebateComments(id)
        ]);

        // Convert backend data to UI format
        const debateDetail: DebateDetail = {
          id: debateData.id,
          title: `${debateData.option1_name} vs ${debateData.option2_name}`,
          description: `${debateData.option1_description || ''}\n\n${debateData.option2_description || ''}`,
          author: 'System',
          authorAvatar: '/images/placeholder-user.jpg',
          timestamp: new Date(debateData.created_at),
          sport: debateData.category,
          category: debateData.category,
          tags: [debateData.category],
          votesFor: debateData.option1_votes,
          votesAgainst: debateData.option2_votes,
          userVote: debateData.user_vote || null,
          comments: commentsData.map(comment => ({
            id: comment.id,
            author: comment.author_name,
            authorAvatar: '/images/placeholder-user.jpg',
            content: comment.content,
            timestamp: new Date(comment.created_at),
            likes: comment.likes_count,
            isLiked: comment.user_liked,
            replies: []
          })),
          imageUrl: '/images/sports-arena.jpg',
          importance: 'high'
        };

        // Load replies for all comments
        const commentsWithReplies = await Promise.all(
          commentsData.map(async (comment) => {
            try {
              const replies = await debateService.getCommentReplies(comment.id);
              const uiReplies: DebateComment[] = replies.map(reply => ({
                id: reply.id,
                author: reply.author_name,
                authorAvatar: '/images/placeholder-user.jpg',
                content: reply.content,
                timestamp: new Date(reply.created_at),
                likes: reply.likes_count,
                isLiked: reply.user_liked
              }));
              return { ...comment, replies: uiReplies };
            } catch (error) {
              return { ...comment, replies: [] };
            }
          })
        );

        // Update the debate detail with replies
        debateDetail.comments = commentsWithReplies.map(comment => ({
          id: comment.id,
          author: comment.author_name,
          authorAvatar: '/images/placeholder-user.jpg',
          content: comment.content,
          timestamp: new Date(comment.created_at),
          likes: comment.likes_count,
          isLiked: comment.user_liked,
          replies: comment.replies || []
        }));

        setDebateDetail(debateDetail);
      } catch (error: any) {
        if (error.message?.includes('Authorization header missing') || error.message?.includes('401')) {
          // Only redirect if not authenticated
          const hasToken = !!localStorage.getItem('access_token');
          const hasUsername = !!localStorage.getItem('username');
          
          if (!hasToken || !hasUsername) {
            navigate('/sign-in');
          } else {
            console.error('Authentication error but user has token/username:', error);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDebateDetail();
  }, [id, user, navigate]);


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

  const handleVote = async (stance: 'option1' | 'option2') => {
    if (!debateDetail) return;
    
    try {
      // If user already voted for this option, remove the vote
      if (debateDetail.userVote === stance) {
        await debateService.removeVote(debateDetail.id);
        
        // Update local state
        setDebateDetail(prev => prev ? {
          ...prev,
          userVote: null,
          votesFor: stance === 'option1' ? prev.votesFor - 1 : prev.votesFor,
          votesAgainst: stance === 'option2' ? prev.votesAgainst - 1 : prev.votesAgainst
        } : null);
      } else {
        // Vote for the new option
        await debateService.voteOnDebate(debateDetail.id, stance);
        
        // Update local state
        setDebateDetail(prev => {
          if (!prev) return null;
          
          let newVotesFor = prev.votesFor;
          let newVotesAgainst = prev.votesAgainst;
          
          // Remove previous vote if exists
          if (prev.userVote === 'option1') {
            newVotesFor -= 1;
          } else if (prev.userVote === 'option2') {
            newVotesAgainst -= 1;
          }
          
          // Add new vote
          if (stance === 'option1') {
            newVotesFor += 1;
          } else {
            newVotesAgainst += 1;
          }
          
          return {
            ...prev,
            userVote: stance,
            votesFor: newVotesFor,
            votesAgainst: newVotesAgainst
          };
        });
      }
    } catch (error) {
      alert(`Voting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!debateDetail) return;
    
    try {
      // Find the comment in the list
      const comment = debateDetail?.comments.find(c => c.id === commentId);
      if (!comment) return;

      if (comment.isLiked) {
        // Unlike the comment
        await debateService.unlikeComment(commentId);
        
        // Update local state
        setDebateDetail(prev => prev ? {
          ...prev,
          comments: prev.comments.map(c => 
            c.id === commentId 
              ? { ...c, likes: c.likes - 1, isLiked: false }
              : c
          )
        } : null);
      } else {
        // Like the comment
        await debateService.likeComment(commentId);
        
        // Update local state
        setDebateDetail(prev => prev ? {
          ...prev,
          comments: prev.comments.map(c => 
            c.id === commentId 
              ? { ...c, likes: c.likes + 1, isLiked: true }
              : c
          )
        } : null);
      }
    } catch (error) {
      alert(`Failed to like comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReplyLike = async (commentId: string, replyId: string) => {
    if (!debateDetail) return;
    
    try {
      // Find the comment and reply
      const comment = debateDetail?.comments.find(c => c.id === commentId);
      if (!comment || !comment.replies) return;
      
      const reply = comment.replies.find(r => r.id === replyId);
      if (!reply) return;

      if (reply.isLiked) {
        // Unlike the reply
        await debateService.unlikeComment(replyId);
        
        // Update local state
        setDebateDetail(prev => prev ? {
          ...prev,
          comments: prev.comments.map(c => 
            c.id === commentId 
              ? {
                  ...c,
                  replies: c.replies?.map(r => 
                    r.id === replyId 
                      ? { ...r, likes: r.likes - 1, isLiked: false }
                      : r
                  )
                }
              : c
          )
        } : null);
      } else {
        // Like the reply
        await debateService.likeComment(replyId);
        
        // Update local state
        setDebateDetail(prev => prev ? {
          ...prev,
          comments: prev.comments.map(c => 
            c.id === commentId 
              ? {
                  ...c,
                  replies: c.replies?.map(r => 
                    r.id === replyId 
                      ? { ...r, likes: r.likes + 1, isLiked: true }
                      : r
                  )
                }
              : c
          )
        } : null);
      }
    } catch (error) {
      alert(`Failed to like reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !debateDetail || commentText.length > 1000) return;
    
    try {
      const newComment = await debateService.addComment({
        pick_id: debateDetail.id,
        content: commentText
      });

      const uiComment: DebateComment = {
        id: newComment.id,
        author: newComment.author_name,
        authorAvatar: '/images/placeholder-user.jpg',
        content: newComment.content,
        timestamp: new Date(newComment.created_at),
        likes: newComment.likes_count,
        isLiked: newComment.user_liked
      };

      setDebateDetail(prev => prev ? {
        ...prev,
        comments: [uiComment, ...prev.comments]
      } : null);
      
      setCommentText('');
    } catch (error) {
    }
  };

  const handleSubmitReply = async (commentId: string) => {
    if (!replyTexts[commentId] || !replyTexts[commentId].trim() || !debateDetail || replyTexts[commentId].length > 500) {
      // Show error or prevent submission
      return;
    }

    try {
      const newReply = await debateService.addComment({
        pick_id: debateDetail.id,
        parent_id: commentId,
        content: replyTexts[commentId]
      });

      // Create UI reply object
      const uiReply: DebateComment = {
        id: newReply.id,
        author: newReply.author_name,
        authorAvatar: user?.avatar || '/images/placeholder-user.jpg',
        content: newReply.content,
        timestamp: new Date(newReply.created_at),
        likes: 0,
        isLiked: false
      };

      // Update state to add the new reply
      setDebateDetail(prev => {
        if (!prev) return null;

        const updatedComments = prev.comments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), uiReply]
            };
          }
          return comment;
        });

        return {
          ...prev,
          comments: updatedComments
        };
      });

      // Clear reply text for this comment
      setReplyTexts(prev => ({
        ...prev,
        [commentId]: ''
      }));

      // Close reply input
      setReplyToComment(null);
    } catch (error) {
      console.error('Failed to submit reply:', error);
      alert('Failed to submit reply. Please try again.');
    }
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

  const CommentComponent = ({ comment }: { comment: DebateComment }) => {
    console.log('Rendering comment', comment.id, 'replyToComment:', replyToComment);
    return (
      <div className="mb-4">
        <div className="flex items-start gap-3">
          <img 
            src={comment.authorAvatar} 
            alt={comment.author}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-border"
          />
          <div className="flex-1">
            <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{comment.author}</span>
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
                onClick={() => {
                  if (replyToComment === comment.id) {
                    setReplyToComment(null);
                  } else {
                    setReplyToComment(comment.id);
                    // Ensure reply text is initialized
                    setReplyTexts(prev => ({
                      ...prev,
                      [comment.id]: prev[comment.id] || ''
                    }));
                  }
                }}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                {replyToComment === comment.id ? t('forum.cancel') : t('forum.reply')}
              </Button>
            </div>

            {/* Reply Input */}
            {replyToComment === comment.id && (
              <div className="mt-3 p-3 bg-muted/20 rounded-lg border border-border/50">
                <div className="flex items-start gap-3">
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name}
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-border flex-shrink-0 mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <Textarea
                      ref={(input) => {
                        // Automatically focus the input when it appears
                        if (input && replyToComment === comment.id) {
                          input.focus();
                          // Set cursor to the end of the text
                          input.setSelectionRange(input.value.length, input.value.length);
                        }
                      }}
                      value={replyTexts[comment.id] || ''}
                      onChange={(e) => {
                        // Ensure correct text input
                        const newValue = e.target.value;
                        setReplyTexts((prev) => ({ 
                          ...prev, 
                          [comment.id]: newValue 
                        }));
                      }}
                      onKeyDown={(e) => handleReplyKeyDown(e, comment.id)}
                      placeholder={t('forum.writeReply')}
                      className="min-h-[80px] resize-none text-sm"
                      maxLength={500}
                      autoFocus={replyToComment === comment.id}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReplyTexts((prev) => ({ ...prev, [comment.id]: '' }));
                            setReplyToComment(null);
                          }}
                        >
                          {t('forum.cancel')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSubmitReply(comment.id)}
                          disabled={!replyTexts[comment.id] || replyTexts[comment.id].length > 500}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          {t('forum.reply')}
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
                {/* Reply count and toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                  </span>
                  {comment.replies.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (expandedReplies.has(comment.id)) {
                          setExpandedReplies(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(comment.id);
                            return newSet;
                          });
                        } else {
                          setExpandedReplies(prev => new Set([...prev, comment.id]));
                        }
                      }}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      {expandedReplies.has(comment.id) ? 'Show less' : `Show more ${comment.replies.length - 1} replies`}
                    </Button>
                  )}
                </div>

                {/* Display replies */}
                {comment.replies.length === 1 || expandedReplies.has(comment.id) ? (
                  // Show all replies
                  comment.replies.map(reply => (
                    <div key={reply.id} className="flex items-start gap-2">
                      <img 
                        src={reply.authorAvatar} 
                        alt={reply.author}
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-border"
                      />
                      <div className="flex-1">
                        <div className="bg-muted/20 rounded-lg p-2 sm:p-4">
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
                            onClick={() => handleReplyLike(comment.id, reply.id)}
                            className={`text-xs ${reply.isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
                          >
                            <ThumbsUp className="w-2 h-2 mr-1" />
                            {reply.likes}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  // Show first reply only
                  comment.replies?.[0] && (
                    <div className="flex items-start gap-2">
                      <img 
                        src={comment.replies?.[0]?.authorAvatar} 
                        alt={comment.replies?.[0]?.author}
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-border"
                      />
                      <div className="flex-1">
                        <div className="bg-muted/20 rounded-lg p-2 sm:p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-xs">{comment.replies?.[0]?.author}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(comment.replies?.[0]?.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-foreground">{comment.replies?.[0]?.content}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReplyLike(comment.id, comment.replies?.[0]?.id || '')}
                            className={`text-xs ${comment.replies?.[0]?.isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
                          >
                            <ThumbsUp className="w-2 h-2 mr-1" />
                            {comment.replies?.[0]?.likes}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-lg">{t('forum.loadingDebate')}</span>
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
              {t('forum.backToForum')}
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
      
      <div className="container mx-auto px-4 py-6 max-w-4xl overflow-x-hidden">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/forum')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('forum.backToForum')}
        </Button>

        {/* Main Debate */}
        <Card className="mb-8">
          <CardHeader className="pb-2 sm:pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 sm:mb-3 flex-wrap">
                  <Badge variant="secondary" className="text-xs sm:text-sm">{debateDetail.sport}</Badge>
                </div>
                <h1 className="text-xl sm:text-3xl font-bold mb-2 sm:mb-4 leading-tight break-words line-clamp-2">{debateDetail.title}</h1>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatTimeAgo(debateDetail.timestamp)}</span>
                  </div>
                </div>
                <div className="mt-6 grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-muted/20 rounded-lg border border-border">
                  <h3 className="text-lg font-semibold mb-3 text-primary">
                    {debateDetail.title.split(' vs ')[0]} 
                  </h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {debateDetail.description.split('\n\n')[0]}
                  </p>
                </div>
                <div className="p-4 bg-muted/20 rounded-lg border border-border">
                  <h3 className="text-lg font-semibold mb-3 text-primary">
                    {debateDetail.title.split(' vs ')[1]} 
                  </h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {debateDetail.description.split('\n\n')[1]}
                  </p>
                </div>
              </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6">
            <div className="flex flex-wrap gap-2">
              {debateDetail.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs sm:text-sm">#{tag}</Badge>
              ))}
            </div>

            {/* Voting Section */}
            <div className="border border-border rounded-lg p-3 sm:p-6 space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold mb-2">{t('forum.castYourVote')}</h3>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Button
                  onClick={() => handleVote('option1')}
                  variant={debateDetail.userVote === 'option1' ? 'default' : 'outline'}
                  className="flex-1 w-full sm:w-auto border-green-500 hover:bg-green-500/90 hover:text-white text-xs sm:text-base"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  {debateDetail.title.split(' vs ')[0]} ({forPercentage}%)
                </Button>
                <Button
                  onClick={() => handleVote('option2')}
                  variant={debateDetail.userVote === 'option2' ? 'default' : 'outline'}
                  className="flex-1 w-full sm:w-auto border-red-500 hover:bg-red-500/90 hover:text-white text-xs sm:text-base"
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  {debateDetail.title.split(' vs ')[1]} ({againstPercentage}%)
                </Button>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden flex w-full">
                <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${forPercentage}%` }} />
                <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${againstPercentage}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{debateDetail.votesFor} {t('forum.votes')}</span>
                <span>{debateDetail.votesAgainst} {t('forum.votes')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold">{t('forum.commentsSection')} ({debateDetail.comments.length})</h2>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Add Comment */}
            <div className="space-y-4">
              <div className="p-4 bg-muted/10 rounded-lg border border-border/50">
                <div className="flex items-start gap-3">
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-border flex-shrink-0 mt-1"
                  />
                  <div className="flex-1 space-y-3">
                    <Textarea
                      placeholder={t('forum.shareYourThoughtsOnDebate')}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="min-h-[100px] border-border/50 focus:border-primary/50 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setCommentText('')}
                          disabled={!commentText.trim()}
                          size="sm"
                        >
                          {t('forum.clear')}
                        </Button>
                        <Button
                          onClick={handleSubmitComment}
                          disabled={!commentText.trim() || commentText.length > 1000}
                          size="sm"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {t('forum.postComment')}
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
                  <p>{t('forum.noCommentsYet')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 