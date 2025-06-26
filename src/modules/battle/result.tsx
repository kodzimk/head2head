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
    // Call repair-user-battles on result page load
    const repairUserBattles = async () => {
      try {
        await fetch(`${API_BASE_URL}/db/repair-user-battles`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('[Result] Repaired user battles/stats');
        // Fetch updated user data
        const username = localStorage.getItem('username');
        if (username) {
          const res = await fetch(`${API_BASE_URL}/db/get-user-by-username?username=${username}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
          });
          if (res.ok) {
            const updatedUser = await res.json();
            if (updatedUser) {
              setUser && setUser({
                ...user,
                ...updatedUser,
                totalBattles: updatedUser.totalBattle,
                wins: updatedUser.winBattle,
                winRate: updatedUser.winRate,
                streak: updatedUser.streak,
                // add other mapped fields if needed
              });
              localStorage.setItem('user', JSON.stringify({
                ...user,
                ...updatedUser,
                totalBattles: updatedUser.totalBattle,
                wins: updatedUser.winBattle,
                winRate: updatedUser.winRate,
                streak: updatedUser.streak,
              }));
              console.log('[Result] Updated user data after repair');
            }
          } else {
            console.error('[Result] Failed to fetch updated user data after repair');
          }
        }
      } catch (err) {
        console.error('[Result] Failed to repair user battles:', err);
      }
    };
    repairUserBattles();
    setTimeout(() => {
      setShowResult(true); 
      // Note: Battle result is already processed by the backend WebSocket handler
      // with the correct scores when the battle finishes
    }, 3000);
  }, []);


  

  const handleBackToDashboard = () => {
    setResult('');
    setFirstOpponentScore(0);
    setSecondOpponentScore(0);
    setWinner('');
    setLoser('');
    setText('');
    setCurrentQuestion(null);
    
    navigate(`/${user.username}`);
  }

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
              <div className="text-lg text-gray-600">Please wait while we determine the winner.</div>
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