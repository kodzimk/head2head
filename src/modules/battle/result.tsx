import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { useCurrentQuestionStore, useLoserStore, useResultStore, useScoreStore, useTextStore, useWinnerStore } from '../../shared/interface/gloabL_var';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../shared/interface/user';
import { API_BASE_URL, useGlobalStore } from '../../shared/interface/gloabL_var';
import { Trophy, Target, TrendingUp, Home } from 'lucide-react';
import { FaceitAvatar } from '../../shared/ui/user-avatar';

export default function BattleResultPage({user}: {user: User}) {

  const {  setText } = useTextStore();
  const { firstOpponentScore, secondOpponentScore, setFirstOpponentScore, setSecondOpponentScore } = useScoreStore();
  const {  setWinner } = useWinnerStore();
  const {  setLoser } = useLoserStore();
  const {  setCurrentQuestion } = useCurrentQuestionStore();
  const [showResult, setShowResult] = useState(false);
  const navigate = useNavigate();
  const { result, setResult } = useResultStore();
  const { setUser } = useGlobalStore();

  // Check if we have the necessary data to show results
  const hasResultData = result && (firstOpponentScore > 0 || secondOpponentScore > 0);

  useEffect(() => {
    // If no result data, redirect to dashboard
    if (!hasResultData) {
      console.log('[Result] No result data found, redirecting to dashboard');
      const username = localStorage.getItem('username');
      if (username) {
        navigate(`/${username}`);
      } else {
        navigate('/');
      }
      return;
    }

    // Show result immediately for better UX
    setShowResult(true);
    
    // Enhanced user data update after battle completion with better error handling
    const updateUserDataAfterBattle = async () => {
      try {
        console.log('[Result] Starting user data update after battle...');
        
        // Fetch updated user data immediately
        const username = localStorage.getItem('username');
        if (username) {
          const userResponse = await fetch(`${API_BASE_URL}/db/get-user-by-username?username=${username}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
          });
          
          if (userResponse.ok) {
            const updatedUserData = await userResponse.json();
            if (updatedUserData) {
              console.log('[Result] Received updated user data:', updatedUserData);
              
              // Validate and create updated user object with proper field mapping
              const updatedUser = {
                ...user,
                username: updatedUserData.username || user.username,
                email: updatedUserData.email || user.email,
                totalBattles: typeof updatedUserData.totalBattle === 'number' ? updatedUserData.totalBattle : parseInt(updatedUserData.totalBattle) || user.totalBattles,
                wins: typeof updatedUserData.winBattle === 'number' ? updatedUserData.winBattle : parseInt(updatedUserData.winBattle) || user.wins,
                winRate: typeof updatedUserData.winRate === 'number' ? updatedUserData.winRate : parseInt(updatedUserData.winRate) || user.winRate,
                rank: typeof updatedUserData.ranking === 'number' ? updatedUserData.ranking : parseInt(updatedUserData.ranking) || user.rank,
                streak: typeof updatedUserData.streak === 'number' ? updatedUserData.streak : parseInt(updatedUserData.streak) || user.streak,
                favoritesSport: updatedUserData.favourite || user.favoritesSport,
                friends: Array.isArray(updatedUserData.friends) ? updatedUserData.friends : user.friends,
                friendRequests: Array.isArray(updatedUserData.friendRequests) ? updatedUserData.friendRequests : user.friendRequests,
                avatar: updatedUserData.avatar || user.avatar,
                battles: Array.isArray(updatedUserData.battles) ? updatedUserData.battles : user.battles,
                invitations: Array.isArray(updatedUserData.invitations) ? updatedUserData.invitations : user.invitations
              };
              
              // Update global store
              if (setUser) {
                setUser(updatedUser);
                console.log('[Result] Updated global user store with validated data');
              }
              
              // Update localStorage with error handling
              try {
                localStorage.setItem('user', JSON.stringify(updatedUser));
                console.log('[Result] Updated localStorage with new user data');
                
                // Also update the username in localStorage if it changed
                if (updatedUserData.username && updatedUserData.username !== username) {
                  localStorage.setItem('username', updatedUserData.username);
                  console.log('[Result] Updated username in localStorage');
                }
              } catch (localStorageError) {
                console.error('[Result] Error updating localStorage:', localStorageError);
              }
            } else {
              console.error('[Result] No user data received from API');
            }
          } else {
            console.error('[Result] Failed to fetch updated user data:', userResponse.status);
          }
        } else {
          console.error('[Result] No username found in localStorage');
        }
        
        // Optional: Repair user battles in background (non-blocking) with better error handling
        try {
          const repairResponse = await fetch(`${API_BASE_URL}/db/repair-user-battles`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (repairResponse.ok) {
            console.log('[Result] Successfully repaired user battles/stats');
          } else {
            console.warn('[Result] Failed to repair user battles, continuing with direct update');
          }
        } catch (repairError) {
          console.warn('[Result] Error during repair (non-critical):', repairError);
        }
        
      } catch (error) {
        console.error('[Result] Error updating user data after battle:', error);
      }
    };

    // Update user data immediately
    updateUserDataAfterBattle();
  }, [hasResultData, navigate]);

  const handleBackToDashboard = () => {
    // Clean up all battle-related state
    setResult('');
    setFirstOpponentScore(0);
    setSecondOpponentScore(0);
    setWinner('');
    setLoser('');
    setText('');
    setCurrentQuestion(null);
    setShowResult(false);
    
    // Navigate back to dashboard
    const username = localStorage.getItem('username');
    if (username) {
      navigate(`/${username}`);
    } else {
      navigate('/');
    }
  };


  if (!showResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-surface-1 to-surface-2">
        <div className="absolute inset-0 bg-gaming-pattern opacity-20"></div>
        <div className="relative z-10 max-w-md mx-auto p-6">
          <Card className="w-full bg-card/95 backdrop-blur-md border-border/50 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              </div>
              <CardTitle className="text-xl font-bold text-card-foreground">
                {hasResultData ? 'Calculating Results' : 'Loading Battle Results'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-muted-foreground mb-4">
                  {hasResultData 
                    ? 'Determining the winner and updating your statistics...'
                    : 'Loading your battle results and statistics...'
                  }
                </div>
                <div className="bg-accent/10 rounded-lg px-4 py-3 border border-accent/20">
                  <div className="text-sm text-accent font-medium">
                    This may take a few moments
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isWin = result === 'win';
  const isLose = result === 'lose';
  const isDraw = result === 'draw';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-surface-1 to-surface-2">
      {/* Enhanced background pattern */}
      <div className="absolute inset-0 bg-gaming-pattern opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-transparent to-surface-2/60"></div>
      
      <div className="relative z-10 w-full max-w-lg px-4">
        <Card className="w-full bg-card/95 backdrop-blur-md border-border/50 shadow-xl">
          <CardHeader className="text-center pb-6">
            {/* Result Icon */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isWin ? 'bg-success/20' : isLose ? 'bg-destructive/20' : 'bg-warning/20'
            }`}>
              {isWin ? (
                <Trophy className="w-10 h-10 text-success" />
              ) : isLose ? (
                <Target className="w-10 h-10 text-destructive" />
              ) : (
                <TrendingUp className="w-10 h-10 text-warning" />
              )}
            </div>
            
            {/* Result Title */}
            <CardTitle className={`text-2xl font-bold mb-2 ${
              isWin ? 'text-success' : isLose ? 'text-destructive' : 'text-warning'
            }`}>
              {isWin ? '🎉 Victory! 🎉' : 
               isLose ? '💪 Good Fight! 💪' : 
               '🤝 Draw! 🤝'}
            </CardTitle>
            
            {/* Result Subtitle */}
            <div className={`text-lg font-semibold ${
              isWin ? 'text-success/80' : isLose ? 'text-destructive/80' : 'text-warning/80'
            }`}>
              {isWin ? 'Outstanding Performance!' : 
               isLose ? 'Keep Training!' : 
               'Evenly Matched!'}
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Score Display */}
            <div className="mb-6">
              <div className="bg-surface-1/50 border border-border/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <FaceitAvatar user={user} size="xl" status="online" />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">You</div>
                      <div className="text-lg font-bold text-card-foreground">{user.username}</div>
                    </div>
                  </div>
                  <div className={`text-3xl font-bold px-4 py-2 rounded-lg ${
                    isWin ? 'text-success bg-success/10' : 'text-primary bg-primary/10'
                  }`}>
                    {firstOpponentScore}
                  </div>
                </div>
                
                <div className="flex items-center justify-center my-2">
                  <div className="text-sm font-medium text-muted-foreground bg-accent/20 rounded-full px-3 py-1">
                    VS
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center border-2 border-border/30">
                      <span className="text-lg font-bold text-muted-foreground">?</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Opponent</div>
                      <div className="text-lg font-bold text-card-foreground">Anonymous</div>
                    </div>
                  </div>
                  <div className={`text-3xl font-bold px-4 py-2 rounded-lg ${
                    isLose ? 'text-destructive bg-destructive/10' : 'text-muted-foreground bg-muted/10'
                  }`}>
                    {secondOpponentScore}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Message */}
            <div className={`text-center mb-6 p-4 rounded-xl border ${
              isWin ? 'bg-success/5 border-success/20 text-success' :
              isLose ? 'bg-destructive/5 border-destructive/20 text-destructive' :
              'bg-warning/5 border-warning/20 text-warning'
            }`}>
              <div className="font-semibold mb-1">
                {isWin ? 'Incredible knowledge and speed!' :
                 isLose ? 'Every battle makes you stronger!' :
                 isDraw ? 'Perfectly matched knowledge!' : 'Well matched opponents!'}
              </div>
              <div className="text-sm opacity-80">
                {isWin ? 'You dominated this trivia challenge!' :
                 isLose ? 'Keep practicing and learning!' :
                 isDraw ? 'Both players showed equal expertise!' : 'Great effort from both players!'}
              </div>
              
              {/* Enhanced Draw Statistics */}
              {isDraw && (
                <div className="mt-3 pt-3 border-t border-warning/20">
                  <div className="text-xs text-warning/70 space-y-1">
                    <div>🎯 Both players answered {firstOpponentScore} questions correctly</div>
                    <div>⏱️ Similar response times and accuracy</div>
                    <div>🤝 Draws count toward total battles but don't break win streaks</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="space-y-3">              
              <Button 
                variant="outline"
                onClick={handleBackToDashboard}
                className="w-full h-12 text-base font-medium border-border/50 hover:bg-accent/50"
              >
                <Home className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 