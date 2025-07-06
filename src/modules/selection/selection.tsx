import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../shared/ui/avatar';
import { 
  ChevronLeft, 
  ChevronUp, 
  Heart, 
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
import DebateComments from './debate-comments';

export default function Selection() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [picks, setPicks] = useState<Pick[]>([]);
  const [selectedPick, setSelectedPick] = useState<Pick | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<'option1' | 'option2' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [commentsError, setCommentsError] = useState<string | undefined>();
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  
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

  // Handle unauthorized errors
  const handleUnauthorized = useCallback(() => {
    // Clear invalid token
    localStorage.removeItem('access_token');
    
    // Save current location
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    
    // Redirect to login
    navigate('/signin');
  }, [navigate]);

  // Fetch comments for a pick
  const fetchComments = useCallback(async (pickId: string) => {
    setIsLoadingComments(true);
    setCommentsError(undefined);
    
    try {
      const apiComments = await selectionService.getPickComments(pickId);
      const convertedComments = apiComments.map(comment => selectionService.convertToCommentFormat(comment));
      setComments(convertedComments);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      
      // Handle unauthorized error
      if (error instanceof Error && error.message.includes('401')) {
        handleUnauthorized();
        return;
      }
      
      setCommentsError(t('selection.errorLoadingComments'));
      // Fallback to localStorage
      const storedComments = localStorage.getItem(`comments_${pickId}`);
      if (storedComments) {
        setComments(JSON.parse(storedComments));
      } else {
        setComments([]);
      }
    } finally {
      setIsLoadingComments(false);
    }
  }, [t, handleUnauthorized]);

  // Fetch pick details
  const fetchPickDetails = useCallback(async (pickId: string) => {
    try {
      const apiPick = await selectionService.getPick(pickId);
      if (apiPick.user_vote) {
        setHasVoted(true);
        setUserVote(apiPick.user_vote);
      } else {
        setHasVoted(false);
        setUserVote(null);
      }
    } catch (error) {
      console.error('Failed to fetch pick details:', error);
      
      // Handle unauthorized error
      if (error instanceof Error && error.message.includes('401')) {
        handleUnauthorized();
        return;
      }
      
      // Fallback to localStorage
      const votedKey = `voted_${pickId}`;
      const existingVote = localStorage.getItem(votedKey);
      if (existingVote) {
        setHasVoted(true);
        setUserVote(existingVote as 'option1' | 'option2');
      } else {
        setHasVoted(false);
        setUserVote(null);
      }
    }
  }, [handleUnauthorized]);

  // Effect to fetch comments when pick changes
  useEffect(() => {
    if (selectedPick?.id) {
      const controller = new AbortController();
      
      const loadData = async () => {
        try {
          await Promise.all([
            fetchComments(selectedPick.id),
            fetchPickDetails(selectedPick.id)
          ]);
        } catch (error) {
          if (!controller.signal.aborted) {
            console.error('Failed to load data:', error);
          }
        }
      };

      loadData();

      // Update URL without page reload
      window.history.pushState({}, '', `/selection/${selectedPick.id}`);

      return () => {
        controller.abort();
      };
    }
  }, [selectedPick?.id, fetchComments, fetchPickDetails]);

  const handlePickSelect = async (pick: Pick) => {
    setSelectedPick(pick);
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

  const handleAddComment = async (content: string, parentId?: string) => {
    if (!content.trim() || !selectedPick) return;

    try {
      // Send comment to API
       await selectionService.createComment(selectedPick.id, content, parentId);

      // Add small delay before refetching to allow server to process
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refetch all comments to ensure we have the latest state
      await fetchComments(selectedPick.id);
    } catch (error) {
      console.error('Failed to add comment:', error);
      
      // Handle unauthorized error
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          handleUnauthorized();
          return;
        }
        
        // Show specific error message
        if (error.message.includes('500')) {
          setCommentsError(t('selection.errorServerError'));
        } else {
          setCommentsError(t('selection.errorAddingComment'));
        }
      } else {
        setCommentsError(t('selection.errorAddingComment'));
      }
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!selectedPick) return;
    
    // Optimistically update the UI
    setComments(prevComments => {
      return prevComments.map(comment => {
        if (comment.id === commentId) {
          // Toggle like status and update count
          const wasLiked = comment.liked;
          const currentLikes = comment.likes || [];
          const newLikes = wasLiked 
            ? currentLikes.filter(id => id !== currentUser.id)
            : [...currentLikes, currentUser.id];
          
          return {
            ...comment,
            liked: !wasLiked,
            likes: newLikes,
            likes_count: newLikes.length
          };
        }
        return comment;
      });
    });
    
    try {
      // Send like toggle to API
      const result = await selectionService.toggleCommentLike(commentId);
      
      // Update the UI with the actual server state
      setComments(prevComments => {
        return prevComments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              liked: result.liked,
              likes: result.liked 
                ? [...(comment.likes || []), currentUser.id]
                : (comment.likes || []).filter(id => id !== currentUser.id),
              likes_count: result.likes_count
            };
          }
          return comment;
        });
      });
    } catch (error) {
      console.error('Failed to toggle like:', error);
      
      // Revert the optimistic update on error
      setComments(prevComments => {
        return prevComments.map(comment => {
          if (comment.id === commentId) {
            // Toggle back to original state
            const currentLiked = comment.liked;
            const currentLikes = comment.likes || [];
            const newLikes = currentLiked
              ? currentLikes.filter(id => id !== currentUser.id)
              : [...currentLikes, currentUser.id];
              
            return {
              ...comment,
              liked: !currentLiked,
              likes: newLikes,
              likes_count: newLikes.length
            };
          }
          return comment;
        });
      });
      
      // Handle unauthorized error
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          handleUnauthorized();
          return;
        }
        
        // Show specific error message
        if (error.message.includes('500')) {
          setCommentsError(t('selection.errorServerError'));
        } else {
          setCommentsError(t('selection.errorLikingComment'));
        }
      } else {
        setCommentsError(t('selection.errorLikingComment'));
      }
    }
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

                          <div className="flex-1">
                            <div className="font-semibold text-white">{pick.option1_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {isNewDebate ? 'No votes yet' : `${voteResult.option1Percentage}% (${pick.option1_votes} votes)`}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-center text-muted-foreground font-medium">VS</div>
                        
                        <div className="flex items-center gap-3">
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
            <div className="mt-6 pt-6 border-t border-border">
              <DebateComments
                comments={comments}
                onAddComment={handleAddComment}
                onLikeComment={handleLikeComment}
                isLoading={isLoadingComments}
                error={commentsError}
                currentUser={currentUser}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 