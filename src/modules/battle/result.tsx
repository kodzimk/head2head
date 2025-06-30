import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { useCurrentQuestionStore, useLoserStore, useResultStore, useScoreStore, useTextStore, useWinnerStore } from '../../shared/interface/gloabL_var';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../shared/interface/user';
import { API_BASE_URL, useGlobalStore } from '../../shared/interface/gloabL_var';

export default function BattleResultPage({user}: {user: User}) {

  const { text, setText } = useTextStore();
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-orange-100 p-4">
        <Card className="w-full max-w-md shadow-xl animate-pulse">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold mb-2">
              {hasResultData ? 'Calculating results...' : 'Loading battle results...'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6 py-12">
              <div className="text-4xl">⏳</div>
              <div className="text-lg text-gray-600">
                {hasResultData 
                  ? 'Please wait while we determine the winner and update your statistics.'
                  : 'Please wait while we load your battle results.'
                }
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-orange-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold mb-2">
            {result === 'win' ? '🎉 Congratulations! You Won! 🎉' : 
             result === 'lose' ? '💪 You Lost - Good Luck Next Time! 💪' : 
             (text !== '' ? text : 'The battle has concluded.')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6">
            <div className="mt-6 text-center">
              {result === 'win' && (
                <div className="text-xl font-semibold text-green-600 mb-4">
                  Amazing performance! You dominated this battle! 🏆
                </div>
              )}
              {result === 'lose' && (
                <div className="text-xl font-semibold text-blue-600 mb-4">
                  Keep practicing and you'll get better! 💪
                </div>
              )}
              {result === 'draw' && (
                <div className="text-xl font-semibold text-orange-600 mb-4">
                  It was a close battle! Well played! 🤝
                </div>
              )}
              <div className="text-lg text-gray-800 mb-2">
                {result === 'win' ? 'You showed incredible knowledge and speed! Well done!' :
                 result === 'lose' ? 'Every battle makes you stronger. Keep learning and growing!' :
                 'Thank you for participating in this exciting battle!'}
              </div>
              <Button className="mt-2 bg-orange-500 hover:bg-orange-600 w-full" onClick={handleBackToDashboard}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 