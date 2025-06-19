import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { useCurrentQuestionStore, useLoserStore, useResultStore, useScoreStore, useTextStore, useWinnerStore } from '../../shared/interface/gloabL_var';
import { useNavigate, useParams } from 'react-router-dom';
import { battleResult } from '../../shared/websockets/websocket';
export default function BattleResultPage() {
  const { text, setText } = useTextStore();
  const { setFirstOpponentScore, setSecondOpponentScore } = useScoreStore();
  const { winner, setWinner } = useWinnerStore();
  const { loser, setLoser } = useLoserStore();
  const { currentQuestion } = useCurrentQuestionStore();
  const [showResult, setShowResult] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams() as { id: string };
  const { result, setResult } = useResultStore();

  useEffect(() => {
    console.log(id)
    setTimeout(() => {
      setShowResult(true); 
      if(text !== ''){
        battleResult(id, winner, loser,result);
      }
    }, 3000);
  }, []);

  const handleBackToDashboard = () => {
    setResult('');
    setFirstOpponentScore(0);
    setSecondOpponentScore(0);
    setWinner('');
    setLoser('');
    setText('');
    navigate(`/`);
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
            {text !== '' ? text : 'The battle was finished'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6">
            <div className="mt-6 text-center">
              <div className="text-xl font-semibold text-gray-800 mb-2">
                {currentQuestion}
              </div>
              <Button className="mt-2 bg-orange-500 hover:bg-orange-600 w-full" onClick={handleBackToDashboard}>Back to Dashboard</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 