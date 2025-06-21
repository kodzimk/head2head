import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { useCurrentQuestionStore, useLoserStore, useResultStore, useScoreStore, useTextStore, useWinnerStore } from '../../shared/interface/gloabL_var';
import { useNavigate, useParams } from 'react-router-dom';
import { battleResult, battleDrawResult } from '../../shared/websockets/websocket';
import { reconnectWebSocket, newSocket } from '../../app/App';
import type { User } from '../../shared/interface/user';

export default function BattleResultPage({user}: {user: User}) {

  const { text, setText } = useTextStore();
  const { setFirstOpponentScore, setSecondOpponentScore } = useScoreStore();
  const { winner, setWinner } = useWinnerStore();
  const { loser, setLoser } = useLoserStore();
  const { currentQuestion, setCurrentQuestion } = useCurrentQuestionStore();
  const [showResult, setShowResult] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const navigate = useNavigate();
  const { id } = useParams() as { id: string };
  const { result, setResult } = useResultStore();

  useEffect(() => {
    console.log(id)
    setTimeout(() => {
      setShowResult(true); 
      if(text !== ''){
        if(result === 'draw'){
          battleDrawResult(id);
        } else {
          battleResult(id, winner, loser, result);
        }
      }
      
      // Reconnect websocket after game completion
      setTimeout(() => {
        console.log("Reconnecting websocket after game completion...");
        reconnectWebSocket();
      }, 1000); // Wait 1 second after sending battle result
    }, 3000);
  }, []);

  // Check connection status
  useEffect(() => {
    const checkConnection = () => {
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleManualReconnect = () => {
    setConnectionStatus('reconnecting');
    reconnectWebSocket();
    setTimeout(() => {
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    }, 2000);
  };

  const handleBackToDashboard = () => {
    // Reset all battle states
    setResult('');
    setFirstOpponentScore(0);
    setSecondOpponentScore(0);
    setWinner('');
    setLoser('');
    setText('');
    setCurrentQuestion(null);
    
    // Ensure websocket is connected before navigating
    if (!newSocket || newSocket.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected, reconnecting before navigation...");
      reconnectWebSocket();
    }
    
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
            {text !== '' ? text : 'The battle was finished'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6">
            <div className="mt-6 text-center">
              <div className="text-xl font-semibold text-gray-800 mb-2">
                {currentQuestion}
              </div>
              
              {/* Connection Status */}
              <div className="mb-4">
                <div className={`text-sm px-3 py-1 rounded-full inline-block mb-2 ${
                  connectionStatus === 'connected' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : connectionStatus === 'reconnecting'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {connectionStatus === 'connected' ? 'Connected' : 
                   connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}
                </div>
                
                {connectionStatus === 'disconnected' && (
                  <Button 
                    onClick={handleManualReconnect}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Reconnect
                  </Button>
                )}
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