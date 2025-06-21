import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { startBattle } from '../../shared/websockets/websocket';
import { useCurrentQuestionStore } from '../../shared/interface/gloabL_var';
import { newSocket } from '../../app/App';

export default function BattleCountdown() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();
  const [count, setCount] = useState(10);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const {currentQuestion} = useCurrentQuestionStore();

  // Check websocket connection status
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

  // Handle countdown
  useEffect(() => {
    if (count === 0) {
      console.log("Countdown finished, starting battle...");
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        startBattle(id);
      } else {
        console.error("WebSocket not connected, cannot start battle");
        // Fallback: try to navigate to quiz anyway
        setTimeout(() => {
          navigate(`/battle/${id}/quiz`);
        }, 1000);
      }
      return;
    }
    const timer = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, id, navigate]);

  // Navigate to quiz when question is received
  useEffect(() => {
    if(currentQuestion){
      console.log("Question received, navigating to quiz");
      navigate(`/battle/${id}/quiz`);
    }
  }, [currentQuestion, id, navigate]);

  // Fallback: if no question received after countdown, try to navigate anyway
  useEffect(() => {
    if (count === 0 && !currentQuestion) {
      const fallbackTimer = setTimeout(() => {
        console.log("No question received, using fallback navigation");
        navigate(`/battle/${id}/quiz`);
      }, 3000); // Wait 3 seconds after countdown
      
      return () => clearTimeout(fallbackTimer);
    }
  }, [count, currentQuestion, id, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-6xl font-bold text-orange-500 mb-4">{count === 0 ? 'Go!' : count}</div>
      <div className="text-xl text-gray-700 dark:text-gray-200 mb-4">Ready to get smash or get smashed?</div>
      
      {/* Connection status indicator */}
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