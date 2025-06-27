import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { startBattle } from '../../shared/websockets/websocket';
import { useCurrentQuestionStore } from '../../shared/interface/gloabL_var';
import { newSocket } from '../../app/App';

export default function BattleCountdown() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();
  const [count, setCount] = useState(5);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const { currentQuestion } = useCurrentQuestionStore();
  const [countdownFinished, setCountdownFinished] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (count === 0) {
      setCountdownFinished(true);
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        startBattle(id);
      }
      return;
    }
    const timer = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, id]);

  // Only navigate when both countdown is finished and question is ready
  useEffect(() => {
    if (countdownFinished && currentQuestion) {
      console.log("Navigating to quiz page for battle", id);
      navigate(`/battle/${id}/quiz`);
    }
    // Fallback: if countdown finished but currentQuestion is not set after 2 seconds, force navigation
    if (countdownFinished && !currentQuestion) {
      const timer = setTimeout(() => {
        console.warn("Forcing navigation to quiz page due to missing currentQuestion", id);
        navigate(`/battle/${id}/quiz`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [countdownFinished, currentQuestion, id, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-6xl font-bold text-orange-500 mb-4">{count === 0 ? 'Go!' : count}</div>
      <div className="text-xl text-gray-700 dark:text-gray-200 mb-4">
        Prepare yourself. 
      </div>
      
      <div className={`text-sm px-3 py-1 rounded-full ${
        connectionStatus === 'connected' 
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
          : connectionStatus === 'disconnected'
          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      }`}>
        {connectionStatus === 'connected' ? 'Connected' : 
         connectionStatus === 'disconnected' ? 'Disconnected' : 'Checking...'}
      </div>
      
      {connectionStatus === 'disconnected' && (
        <div className="text-sm text-gray-500 mt-2">
          Trying to reconnect...
        </div>
      )}
    </div>
  );
}