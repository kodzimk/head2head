import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { startBattle } from '../../shared/websockets/websocket';
import { useCurrentQuestionStore } from '../../shared/interface/gloabL_var';
import { newSocket } from '../../app/App';
import { useTranslation } from 'react-i18next';

export default function BattleCountdown() {
  const { t } = useTranslation();
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();
  
  // Precise countdown state and refs
  const [count, setCount] = useState(10);
  const countRef = useRef(10);
  const startTimeRef = useRef<number | null>(null);
  
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const { currentQuestion } = useCurrentQuestionStore();
  const [countdownFinished, setCountdownFinished] = useState(false);
  
  // Audio management
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [canPlaySound, setCanPlaySound] = useState(false);

  // Precise countdown function
  const updateCountdown = useCallback(() => {
    const currentTime = Date.now();
    
    // Calculate elapsed time since start
    if (startTimeRef.current === null) {
      startTimeRef.current = currentTime;
    }
    
    const elapsedSeconds = Math.floor((currentTime - startTimeRef.current) / 1000);
    const newCount = Math.max(0, 10 - elapsedSeconds);
    
    // Update count and handle countdown logic
    setCount(newCount);
    countRef.current = newCount;

    // Play sound precisely at 9 seconds, let it play fully
    if (newCount === 9 && canPlaySound && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(error => {
          console.warn('Could not play countdown sound:', error);
        });
      } catch (error) {
        console.warn('Error playing countdown sound:', error);
      }
    }

    // Handle countdown completion
    if (newCount === 0) {
      // Do not stop the sound
      setCountdownFinished(true);
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        startBattle(id);
      }
      return;
    }
  }, [canPlaySound, id]);

  // Initialize audio
  useEffect(() => {
    const audio = new Audio('/sounds/10 Second Timer.mp4');
    audioRef.current = audio;

    // Optimize audio loading
    audio.preload = 'auto';
    audio.addEventListener('canplaythrough', () => {
      setCanPlaySound(true);
    });

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  // Connection status check
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

  // Precise countdown effect
  useEffect(() => {
    // Use requestAnimationFrame for smoother, more precise timing
    let animationFrameId: number;
    
    const runCountdown = () => {
      updateCountdown();
      
      if (countRef.current > 0) {
        animationFrameId = requestAnimationFrame(runCountdown);
      }
    };

    // Start the countdown
    animationFrameId = requestAnimationFrame(runCountdown);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [updateCountdown]);

  // Navigation effect
  useEffect(() => {
    if (countdownFinished && currentQuestion) {
      console.log("Navigating to quiz page for battle", id);
      navigate(`/${id}/quiz`);
    }
    
    // Fallback navigation
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