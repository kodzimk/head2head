import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { startBattle } from '../../shared/websockets/websocket';
import { useCurrentQuestionStore } from '../../shared/interface/gloabL_var';
import { newSocket } from '../../app/App';
import { useTranslation } from 'react-i18next';

export default function BattleCountdown() {
  const { t } = useTranslation();
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();
  const [count, setCount] = useState(10);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const { currentQuestion } = useCurrentQuestionStore();
  const [countdownFinished, setCountdownFinished] = useState(false);
  
  // Audio refs for countdown sounds
  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  const goAudioRef = useRef<HTMLAudioElement | null>(null);

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
      // Play "go" sound when countdown reaches 0
      if (goAudioRef.current) {
        goAudioRef.current.play().catch(console.error);
      }
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        startBattle(id);
      }
      return;
    }
    
    // Play tick sound for each countdown number (except 0)
    if (count < 10 && tickAudioRef.current) {
      tickAudioRef.current.play().catch(console.error);
    }
    
    const timer = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, id]);

  // Only navigate when both countdown is finished and question is ready
  useEffect(() => {
    if (countdownFinished && currentQuestion) {
      console.log("Navigating to quiz page for battle", id);
      navigate(`/${id}/quiz`);
    }
    // Fallback: if countdown finished but currentQuestion is not set after 2 seconds, force navigation
    if (countdownFinished && !currentQuestion) {
      const timer = setTimeout(() => {
        console.warn("Forcing navigation to quiz page due to missing currentQuestion", id);
        navigate(`/${id}/quiz`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [countdownFinished, currentQuestion, id, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-surface-1 to-surface-2">
      {/* Audio elements for countdown sounds */}
      <audio 
        ref={tickAudioRef}
        preload="auto"
        src="/sounds/countdown-tick.mp3"
      />
      <audio 
        ref={goAudioRef}
        preload="auto"
        src="/sounds/countdown-go.mp3"
      />
      
      <div className="text-6xl font-bold text-primary mb-4 animate-pulse">
        {count === 0 ? t('battles.countdown.go') : count}
      </div>
      <div className="text-xl text-muted-foreground mb-4">
        {t('battles.countdown.prepare')}
      </div>
      
      <div className={`text-sm px-3 py-1 rounded-full ${
        connectionStatus === 'connected' 
          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
          : connectionStatus === 'disconnected'
          ? 'bg-destructive/20 text-destructive border border-destructive/30'
          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
      }`}>
        {connectionStatus === 'connected' ? t('battles.countdown.connected') : 
         connectionStatus === 'disconnected' ? t('battles.countdown.disconnected') : t('battles.countdown.checking')}
      </div>
      
      {connectionStatus === 'disconnected' && (
        <div className="text-sm text-muted-foreground mt-2">
          {t('battles.countdown.reconnecting')}
        </div>
      )}
    </div>
  );
}