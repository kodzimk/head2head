import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { Textarea } from '../../shared/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../../shared/ui/avatar';
import { 
  ChevronLeft, 
  ChevronUp, 
  MessageCircle, 
  Heart, 
  Reply, 
  X,  
  Users,
  RefreshCw,
  Database,
  ChevronRight
} from 'lucide-react';
import Header from '../dashboard/header';
import type { Pick, Comment, VoteResult } from './types';
import { getDailyPicks } from './daily-picks';
import { selectionService } from '../../shared/services/selection-service';
import { Badge } from '../../shared/ui/badge';

export default function Selection() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  
  const [picks, setPicks] = useState<Pick[]>([]);
  const [selectedPick, setSelectedPick] = useState<Pick | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<'option1' | 'option2' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [isSeeding, setIsSeeding] = useState(false);
  
  // Simulate current user
  const currentUser = {
    id: 'current-user',
    name: 'You',
    avatar: 'https://placehold.co/40x40/6366f1/ffffff?text=U'
  };

  useEffect(() => {
    // Load picks from API
    const loadPicks = async () => {
      try {
        setIsLoading(true);
        const apiPicks = await selectionService.getAllPicks();
        const convertedPicks = apiPicks.map(pick => selectionService.convertToPickFormat(pick));
        setPicks(convertedPicks);

      // If we have an ID, find and select that pick
        if (id) {
          const foundPick = convertedPicks.find(p => p.id === id);
          if (foundPick) {
            setSelectedPick(foundPick);
            
            // Load comments for this pick from API
            try {
              const apiComments = await selectionService.getPickComments(id);
              const convertedComments = apiComments.map(comment => selectionService.convertToCommentFormat(comment));
              setComments(convertedComments);
            } catch (error) {
              console.error('Failed to load comments:', error);
              setComments([]);
            }
            
            // Check if user has voted (this info comes from the API)
            const apiPick = apiPicks.find(p => p.id === id);
            if (apiPick?.user_vote) {
              setHasVoted(true);
              setUserVote(apiPick.user_vote);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load picks:', error);
        // Fallback to mock data if API fails
        const dailyPicks = getDailyPicks();
        setPicks(dailyPicks);
      if (id) {
        const foundPick = dailyPicks.find(p => p.id === id);
        if (foundPick) {
          setSelectedPick(foundPick);
          const storedComments = localStorage.getItem(`comments_${id}`);
          if (storedComments) {
            setComments(JSON.parse(storedComments));
          }
          const votedKey = `voted_${id}`;
          const existingVote = localStorage.getItem(votedKey);
          if (existingVote) {
            setHasVoted(true);
            setUserVote(existingVote as 'option1' | 'option2');
          }
        }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPicks();
  }, [id]);

  const calculateVoteResult = (pick: Pick): VoteResult => {
    const totalVotes = pick.option1_votes + pick.option2_votes;
    if (totalVotes === 0) {
      return { option1Percentage: 50, option2Percentage: 50, totalVotes: 0 };
    }
    
    const option1Percentage = (pick.option1_votes / totalVotes) * 100;
    const option2Percentage = (pick.option2_votes / totalVotes) * 100;
    
    return {
      option1Percentage: Math.round(option1Percentage),
      option2Percentage: Math.round(option2Percentage),
      totalVotes
    };
  };

  const handlePickSelect = async (pick: Pick) => {
    setSelectedPick(pick);
    
    try {
      // Load comments for this pick from API
      const apiComments = await selectionService.getPickComments(pick.id);
      const convertedComments = apiComments.map(comment => selectionService.convertToCommentFormat(comment));
      setComments(convertedComments);
      
      // Load pick details to check if user has voted
      const apiPick = await selectionService.getPick(pick.id);
      if (apiPick.user_vote) {
        setHasVoted(true);
        setUserVote(apiPick.user_vote);
      } else {
        setHasVoted(false);
        setUserVote(null);
      }
    } catch (error) {
      console.error('Failed to load pick data:', error);
      // Fallback to localStorage
    const storedComments = localStorage.getItem(`comments_${pick.id}`);
    if (storedComments) {
      setComments(JSON.parse(storedComments));
    } else {
      setComments([]);
    }
    
    const votedKey = `voted_${pick.id}`;
    const existingVote = localStorage.getItem(votedKey);
    if (existingVote) {
      setHasVoted(true);
      setUserVote(existingVote as 'option1' | 'option2');
    } else {
      setHasVoted(false);
      setUserVote(null);
      }
    }
    
    // Update URL without page reload
    window.history.pushState({}, '', `/selection/${pick.id}`);
  };

  const handleVote = async (option: 'option1' | 'option2') => {
    if (!selectedPick || hasVoted) return;

    try {
      // Send vote to API
      const voteResult = await selectionService.voteOnPick(selectedPick.id, option);
      
      // Update local state with new vote counts
    const updatedPick = {
      ...selectedPick,
        option1_votes: Math.round((voteResult.option1_percentage / 100) * voteResult.total_votes),
        option2_votes: Math.round((voteResult.option2_percentage / 100) * voteResult.total_votes)
    };

    setSelectedPick(updatedPick);
    
    // Update the pick in the main list as well
    setPicks(prev => prev.map(p => p.id === updatedPick.id ? updatedPick : p));
    
    setHasVoted(true);
    setUserVote(option);
    
      // Also save to localStorage as fallback
      localStorage.setItem(`voted_${selectedPick.id}`, option);
    } catch (error) {
      console.error('Failed to vote:', error);
      // Fallback to local storage method
      const updatedPick = {
        ...selectedPick,
        [option === 'option1' ? 'option1_votes' : 'option2_votes']: 
          selectedPick[option === 'option1' ? 'option1_votes' : 'option2_votes'] + 1
      };

      setSelectedPick(updatedPick);
      setPicks(prev => prev.map(p => p.id === updatedPick.id ? updatedPick : p));
      setHasVoted(true);
      setUserVote(option);
    localStorage.setItem(`voted_${selectedPick.id}`, option);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedPick) return;

    try {
      // Send comment to API
      const apiComment = await selectionService.createComment(selectedPick.id, commentText);
      const newComment = selectionService.convertToCommentFormat(apiComment);

      const updatedComments = [newComment, ...comments];
      setComments(updatedComments);
      setCommentText('');
      setIsCommenting(false);

      // Also save to localStorage as fallback
      localStorage.setItem(`comments_${selectedPick.id}`, JSON.stringify(updatedComments));
    } catch (error) {
      console.error('Failed to add comment:', error);
      // Fallback to local storage method
    const newComment: Comment = {
      id: Date.now().toString(),
      pickId: selectedPick.id,
      authorId: currentUser.id,
      authorName: currentUser.name,
      content: commentText,
      text: commentText,
      author: currentUser.name,
      likes: [],
      parentId: null,
      replies: [],
      createdAt: new Date()
    };

    const updatedComments = [newComment, ...comments];
    setComments(updatedComments);
    setCommentText('');
    setIsCommenting(false);
    localStorage.setItem(`comments_${selectedPick.id}`, JSON.stringify(updatedComments));
    }
  };

  const handleAddReply = async (parentId: string) => {
    if (!replyText.trim() || !selectedPick) return;

    try {
      // Send reply to API
      const apiReply = await selectionService.createComment(selectedPick.id, replyText, parentId);
      const newReply = selectionService.convertToCommentFormat(apiReply);

      const updatedComments = comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...comment.replies, newReply]
          };
        }
        return comment;
      });

      setComments(updatedComments);
      setReplyText('');
      setReplyingTo(null);

      // Save comments to localStorage
      localStorage.setItem(`comments_${selectedPick.id}`, JSON.stringify(updatedComments));
    } catch (error) {
      console.error('Failed to add reply:', error);
      // Fallback to local storage method
    const newReply: Comment = {
      id: Date.now().toString(),
      pickId: selectedPick.id,
      authorId: currentUser.id,
      authorName: currentUser.name,
      content: replyText,
      text: replyText,
      author: currentUser.name,
      likes: [],
      parentId,
      replies: [],
      createdAt: new Date()
    };

    const updatedComments = comments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...comment.replies, newReply]
        };
      }
      return comment;
    });

    setComments(updatedComments);
    setReplyText('');
    setReplyingTo(null);
    localStorage.setItem(`comments_${selectedPick.id}`, JSON.stringify(updatedComments));
    }
  };

  const handleLikeComment = async (commentId: string, isReply = false, parentId?: string) => {
    const userId = currentUser.id;
    
    try {
      // Send like toggle to API
      const result = await selectionService.toggleCommentLike(commentId);
      
      const updatedComments = comments.map(comment => {
        if (isReply && comment.id === parentId) {
          return {
            ...comment,
            replies: comment.replies.map(reply => {
              if (reply.id === commentId) {
                return {
                  ...reply,
                  likes: result.liked 
                    ? [...reply.likes, userId]
                    : reply.likes.filter(id => id !== userId)
                };
              }
              return reply;
            })
          };
        } else if (!isReply && comment.id === commentId) {
          return {
            ...comment,
            likes: result.liked 
              ? [...comment.likes, userId]
              : comment.likes.filter(id => id !== userId)
          };
        }
        return comment;
      });

      setComments(updatedComments);

      // Save comments to localStorage
      if (selectedPick) {
        localStorage.setItem(`comments_${selectedPick.id}`, JSON.stringify(updatedComments));
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Fallback to local method
    const updatedComments = comments.map(comment => {
      if (isReply && comment.id === parentId) {
        return {
          ...comment,
          replies: comment.replies.map(reply => {
            if (reply.id === commentId) {
              const hasLiked = reply.likes.includes(userId);
              return {
                ...reply,
                likes: hasLiked 
                  ? reply.likes.filter(id => id !== userId)
                  : [...reply.likes, userId]
              };
            }
            return reply;
          })
        };
      } else if (!isReply && comment.id === commentId) {
        const hasLiked = comment.likes.includes(userId);
        return {
          ...comment,
          likes: hasLiked 
            ? comment.likes.filter(id => id !== userId)
            : [...comment.likes, userId]
        };
      }
      return comment;
    });

    setComments(updatedComments);

    if (selectedPick) {
      localStorage.setItem(`comments_${selectedPick.id}`, JSON.stringify(updatedComments));
      }
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const handleSeedDebates = async () => {
    try {
      setIsSeeding(true);
      const result = await selectionService.seedDebates();
      console.log('Seed result:', result);
      
      // Reload picks after seeding
      const apiPicks = await selectionService.getAllPicks();
      const convertedPicks = apiPicks.map(pick => selectionService.convertToPickFormat(pick));
      setPicks(convertedPicks);
      
      if (result.rotation_info) {
        alert(`${result.message}\n\n${result.rotation_info}`);
      } else {
        alert(`Successfully seeded ${result.total_debates} debates for all sports!`);
      }
    } catch (error) {
      console.error('Failed to seed debates:', error);
      alert('Failed to seed debates. Please try again.');
    } finally {
      setIsSeeding(false);
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <Card key={comment.id} className={`bg-muted/50 ${isReply ? 'ml-8' : ''} mb-4`}>
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={`https://placehold.co/32x32/6366f1/ffffff?text=${comment.author?.charAt(0) || 'U'}`} />
            <AvatarFallback>{comment.author?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-medium text-primary">{comment.author}</span>
              {comment.author === currentUser.name && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {t('selection.you')}
                </span>
              )}
            </div>
            <p className="text-foreground mb-3">{comment.content || comment.text}</p>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 ${
                  comment.likes.includes(currentUser.id) ? 'text-red-500' : ''
                }`}
                onClick={() => handleLikeComment(comment.id, isReply, comment.parentId || undefined)}
              >
                <Heart className="w-4 h-4" />
                {comment.likes.length}
              </Button>
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                >
                  <Reply className="w-4 h-4" />
                  {t('selection.reply')}
                </Button>
              )}
            </div>

            {/* Reply Input */}
            {replyingTo === comment.id && (
              <div className="mt-4 space-y-2">
                <Textarea
                  placeholder={t('selection.writeReply')}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[80px] bg-background/50"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText('');
                    }}
                  >
                    {t('selection.cancel')}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleAddReply(comment.id)}
                    disabled={!replyText.trim()}
                  >
                    {t('selection.reply')}
                  </Button>
                </div>
              </div>
            )}

            {/* Replies */}
            {comment.replies.length > 0 && (
              <div className="mt-4">
                {comment.replies.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleReplies(comment.id)}
                    className="mb-3 text-muted-foreground hover:text-foreground"
                  >
                    {expandedReplies.has(comment.id) ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        {t('selection.hideReplies')} {comment.replies.length} {t('selection.replies')}
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1 rotate-180" />
                        {t('selection.showReplies')} {comment.replies.length} {t('selection.replies')}
                      </>
                    )}
                  </Button>
                )}
                {(comment.replies.length === 1 || expandedReplies.has(comment.id)) && (
                  <div className="space-y-4 border-l-2 border-border pl-4">
                    {comment.replies.map(reply => renderComment(reply, true))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading debates...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show seed button if no picks are available
  if (picks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">{t('selection.noActiveDebates')}</h2>
              <p className="text-muted-foreground mb-6">
                {t('selection.noActiveDebatesDesc')}
              </p>
              <Button
                onClick={handleSeedDebates}
                disabled={isSeeding}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {isSeeding ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {t('selection.creatingDebates')}
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    {t('selection.createDebates')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {!selectedPick ? (
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-white font-rajdhani">
                {t('selection.title')}
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                {t('selection.welcomeMessage')}
              </p>
              
              {/* Daily Rotation Info */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <span className="font-medium">{t('selection.dailyInfo')}</span>
                </div>
              </div>
            </div>

      
            {/* Picks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {picks.map((pick) => {
                const voteResult = calculateVoteResult(pick);
                const isNewDebate = voteResult.totalVotes === 0;
                
                return (
                  <Card 
                    key={pick.id} 
                    className="bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer group"
                    onClick={() => handlePickSelect(pick)}
                  >
                    <CardContent className="p-6">
                      {/* Category Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/25">
                          {pick.category.charAt(0).toUpperCase() + pick.category.slice(1)}
                        </Badge>
                        {isNewDebate && (
                          <Badge
                            variant="outline"
                            className="bg-primary/10 text-primary border-primary/20"
                          >
                            {t('selection.freshDebate')}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Options */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12 border-2 border-primary/20">
                            <AvatarImage src={pick.option1_image} alt={pick.option1_name} />
                            <AvatarFallback>{pick.option1_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-semibold text-white">{pick.option1_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {isNewDebate ? 'No votes yet' : `${voteResult.option1Percentage}% (${pick.option1_votes} votes)`}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-center text-muted-foreground font-medium">VS</div>
                        
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12 border-2 border-primary/20">
                            <AvatarImage src={pick.option2_image} alt={pick.option2_name} />
                            <AvatarFallback>{pick.option2_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-semibold text-white">{pick.option2_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {isNewDebate ? 'No votes yet' : `${voteResult.option2Percentage}% (${pick.option2_votes} votes)`}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Total Votes */}
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {isNewDebate ? 'Be the first to vote!' : `${voteResult.totalVotes} total votes`}
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          // Detailed View
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Button
              variant="ghost"
              className="mb-6"
              onClick={() => {
                setSelectedPick(null);
                window.history.pushState({}, '', '/selection');
              }}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {t('selection.backToList')}
            </Button>

            <Card className="overflow-hidden bg-card/50 backdrop-blur-sm mb-8">
              <div className="p-6 space-y-6">
                {/* Voting Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Option 1 */}
                  <div className="text-center space-y-4">
                    <img
                      src={selectedPick.option1_image}
                      alt={selectedPick.option1_name}
                      className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-border"
                    />
                    <h3 className="text-xl font-bold">{selectedPick.option1_name}</h3>
                    <Button
                      size="lg"
                      disabled={hasVoted}
                      onClick={() => handleVote('option1')}
                      className={`w-full ${
                        userVote === 'option1' 
                          ? 'bg-primary hover:bg-primary/90' 
                          : 'bg-muted hover:bg-muted/80'
                      } ${hasVoted ? 'opacity-50 cursor-not-allowed' : ''}`}
                                          >
                        <ChevronUp className="w-5 h-5 mr-2" />
                        {selectedPick.option1_votes.toLocaleString()} {t('selection.votes')}
                        {userVote === 'option1' && ` (${t('selection.yourVote')})`}
                      </Button>
                  </div>

                  {/* Option 2 */}
                  <div className="text-center space-y-4">
                    <img
                      src={selectedPick.option2_image}
                      alt={selectedPick.option2_name}
                      className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-border"
                    />
                    <h3 className="text-xl font-bold">{selectedPick.option2_name}</h3>
                    <Button
                      size="lg"
                      disabled={hasVoted}
                      onClick={() => handleVote('option2')}
                      className={`w-full ${
                        userVote === 'option2' 
                          ? 'bg-primary hover:bg-primary/90' 
                          : 'bg-muted hover:bg-muted/80'
                      } ${hasVoted ? 'opacity-50 cursor-not-allowed' : ''}`}
                                          >
                        <ChevronUp className="w-5 h-5 mr-2" />
                        {selectedPick.option2_votes.toLocaleString()} {t('selection.votes')}
                        {userVote === 'option2' && ` (${t('selection.yourVote')})`}
                      </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-4">
                  {(() => {
                    const voteResult = calculateVoteResult(selectedPick);
                    return (
                      <>
                        <div className="h-4 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-1000 ease-out"
                            style={{ width: `${voteResult.option1Percentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-primary font-medium">
                            {selectedPick.option1_name}: {voteResult.option1Percentage}%
                          </span>
                          <span className="text-muted-foreground font-medium">
                            {selectedPick.option2_name}: {voteResult.option2Percentage}%
                          </span>
                        </div>
                        <div className="text-center text-muted-foreground">
                          <Users className="w-4 h-4 inline mr-1" />
                          {voteResult.totalVotes.toLocaleString()} {t('selection.totalVotes')}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {hasVoted && (
                  <div className="text-center p-4 bg-primary/20 border border-primary/30 rounded-lg">
                    <p className="text-primary font-medium">
                      ✓ {t('selection.thanksForVoting')}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Comments Section */}
            <Card className="overflow-hidden bg-card/50 backdrop-blur-sm">
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">{t('selection.comments')}</h3>
                    <span className="text-sm text-muted-foreground">
                      ({comments.reduce((total, comment) => total + 1 + comment.replies.length, 0)})
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCommenting(!isCommenting)}
                    className="gap-2"
                  >
                    {isCommenting ? (
                      <>
                        <X className="w-4 h-4" />
                        {t('selection.cancel')}
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        {t('selection.addComment')}
                      </>
                    )}
                  </Button>
                </div>

                {/* Add Comment */}
                {isCommenting && (
                  <Card className="bg-muted/30">
                    <div className="p-4 space-y-2">
                      <Textarea
                        placeholder={t('selection.writeComment')}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="min-h-[100px] bg-background/50"
                        autoFocus
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleAddComment}
                          variant="default"
                          disabled={!commentText.trim()}
                        >
                          {t('selection.submit')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Comments List */}
                <div className="space-y-4 mt-6">
                  {comments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{t('selection.noCommentsYet')}</p>
                    </div>
                  ) : (
                    comments.map(comment => renderComment(comment))
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
} 