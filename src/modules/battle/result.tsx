import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { useCurrentQuestionStore, useLoserStore, useResultStore, useScoreStore, useTextStore, useWinnerStore } from '../../shared/interface/gloabL_var';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../shared/interface/user';
import { API_BASE_URL, useGlobalStore } from '../../shared/interface/gloabL_var';

export default function BattleResultPage({user}: {user: User}) {

  const { text, setText } = useTextStore();
  const {  setFirstOpponentScore, setSecondOpponentScore } = useScoreStore();
  const { setWinner } = useWinnerStore();
  const { setLoser } = useLoserStore();
  const {  setCurrentQuestion } = useCurrentQuestionStore();
  const [showResult, setShowResult] = useState(false);
  const navigate = useNavigate();
  const { result, setResult } = useResultStore();
  const { setUser } = useGlobalStore();

  useEffect(() => {
    // Enhanced user data update after battle completion
    const updateUserDataAfterBattle = async () => {
      try {
        console.log('[Result] Starting user data update after battle...');
        
        // First, repair user battles to ensure data consistency
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
        
        // Fetch updated user data
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
              
              // Create updated user object with proper field mapping
              const updatedUser = {
                ...user,
                username: updatedUserData.username,
                email: updatedUserData.email,
                totalBattles: updatedUserData.totalBattle || 0,
                wins: updatedUserData.winBattle || 0,
                winRate: updatedUserData.winRate || 0,
                streak: updatedUserData.streak || 0,
                ranking: updatedUserData.ranking || 0,
                favourite: updatedUserData.favourite || '',
                friends: updatedUserData.friends || [],
                friendRequests: updatedUserData.friendRequests || [],
                avatar: updatedUserData.avatar || '',
                battles: updatedUserData.battles || [],
                invitations: updatedUserData.invitations || []
              };
              
              // Update global store
              if (setUser) {
                setUser(updatedUser);
                console.log('[Result] Updated global user store');
              }
              
              // Update localStorage
              localStorage.setItem('user', JSON.stringify(updatedUser));
              console.log('[Result] Updated localStorage with new user data');
              
              // Also update the username in localStorage if it changed
              if (updatedUserData.username && updatedUserData.username !== username) {
                localStorage.setItem('username', updatedUserData.username);
                console.log('[Result] Updated username in localStorage');
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
      } catch (error) {
        console.error('[Result] Error updating user data after battle:', error);
      }
    };

    // Update user data and show result after a short delay
    const timer = setTimeout(() => {
      updateUserDataAfterBattle();
      setShowResult(true);
    }, 2000); // Reduced delay for better UX

    return () => clearTimeout(timer);
  }, [user, setUser]);

  const handleBackToDashboard = () => {
    // Clean up all battle-related state
    setResult('');
    setFirstOpponentScore(0);
    setSecondOpponentScore(0);
    setWinner('');
    setLoser('');
    setText('');
    setCurrentQuestion(null);
    
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
              Calculating results...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6 py-12">
              <div className="text-4xl">⏳</div>
              <div className="text-lg text-gray-600">Please wait while we determine the winner and update your statistics.</div>
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