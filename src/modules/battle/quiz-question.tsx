/**
 * Refactored: Uses per-battle WebSocket for quiz logic.
 * - On quiz_ready: set questions and currentQuestion
 * - On answer_result: move to next question
 * - Add logging for debugging
 */
import { useState, useEffect, useRef } from 'react';
import { Button } from '../../shared/ui/button';
import { Card, CardContent, CardHeader } from '../../shared/ui/card';
import { useParams, useNavigate } from 'react-router-dom';
import { useCurrentQuestionStore, useGlobalStore, useScoreStore, useTextStore, useWinnerStore, useLoserStore, useResultStore } from '../../shared/interface/gloabL_var';
import { BattleWebSocket } from '../../shared/websockets/battle-websocket';

const QUESTION_TIME_LIMIT = 10; // 10 seconds per question

export default function QuizQuestionPage() {
  const { id } = useParams() as { id: string };
  const { user } = useGlobalStore();  
  const { setCurrentQuestion, currentQuestion } = useCurrentQuestionStore();
  const { firstOpponentScore, secondOpponentScore, setFirstOpponentScore, setSecondOpponentScore } = useScoreStore();
  const { setText } = useTextStore();
  const { setWinner } = useWinnerStore();
  const { setLoser } = useLoserStore();
  const { setResult } = useResultStore();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [showNextQuestion, setShowNextQuestion] = useState(false);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState(3);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const navigate = useNavigate();
  const wsRef = useRef<BattleWebSocket | null>(null);
  const questionsRef = useRef<any[]>([]); // Use ref to avoid stale closure
  const currentIndexRef = useRef<number>(0); // Track current index in ref

  // Setup per-battle WebSocket
  useEffect(() => {
    const ws = new BattleWebSocket(id, user.username);
    wsRef.current = ws;
    
    // Track connection status
    const originalOnOpen = ws.ws.onopen;
    const originalOnClose = ws.ws.onclose;
    
    ws.ws.onopen = (event) => {
      setConnectionStatus('connected');
      console.log(`[BATTLE_WS] Connected to battle ${id} as ${user.username}`);
      if (originalOnOpen) originalOnOpen.call(ws.ws, event);
    };
    
    ws.ws.onclose = (event) => {
      setConnectionStatus('disconnected');
      console.log(`[BATTLE_WS] Disconnected from battle ${id}`);
      if (originalOnClose) originalOnClose.call(ws.ws, event);
    };
    
    // Add connection status handling
    const handleMessage = (data: any) => {
      console.log('[BATTLE_WS] Received message:', data);
      
      if (data.type === 'error') {
        console.error('[BATTLE_WS] Error from server:', data.message);
        alert(`Battle error: ${data.message}`);
        return;
      }
      
      if (data.type === 'quiz_ready') {
        console.log(`[Quiz] Quiz ready with ${data.questions?.length || 0} questions:`, data.questions);
        if (!data.questions || data.questions.length === 0) {
          console.error('[Quiz] No questions received from server!');
          alert('No questions received from server. Please try again.');
          return;
        }
        console.log('[Quiz] Setting questions state with:', data.questions);
        setQuestions(data.questions);
        questionsRef.current = data.questions; // Store in ref
        console.log('[Quiz] Setting currentIndex to 0');
        setCurrentIndex(0);
        currentIndexRef.current = 0; // Set ref immediately
        console.log('[Quiz] Setting currentQuestion to first question');
        setCurrentQuestion(data.questions[0]);
        setSelected(null);
        setShowNextQuestion(false);
        setNextQuestionCountdown(3);
        setTimeLeft(QUESTION_TIME_LIMIT);
        console.log('[Quiz] Quiz ready, first question:', data.questions[0]);
        console.log('[Quiz] Initial currentIndex set to 0');
      }
      
      if (data.type === 'answer_submitted') {
        console.log('[Quiz] Answer submitted:', data);
        console.log('[Quiz] This user answered:', data.user === user.username);
        console.log('[Quiz] Current state - currentIndex:', currentIndex, 'currentIndexRef.current:', currentIndexRef.current);
        
        // Update scores immediately
        if (data.scores) {
          // Find the opponent's username and score
          const opponentUsername = Object.keys(data.scores).find(name => name !== user.username);
          const userScore = data.scores[user.username] || 0;
          const opponentScore = opponentUsername ? (data.scores[opponentUsername] || 0) : 0;
          
          console.log(`[Quiz] Score update - User: ${user.username} (${userScore}), Opponent: ${opponentUsername} (${opponentScore})`);
          
          setFirstOpponentScore(userScore);
          setSecondOpponentScore(opponentScore);
        }
        
        // Start countdown immediately if this user answered
        if (data.user === user.username && data.start_countdown) {
          console.log('[Quiz] Starting countdown for this user');
          setShowNextQuestion(true);
          setNextQuestionCountdown(3);
        }
      }
      
      if (data.type === 'next_question') {
        console.log('[Quiz] Next question:', data);
        
        // Update to the new question
        setCurrentIndex(data.question_index);
        setCurrentQuestion(data.question);
        setSelected(null);
        setShowNextQuestion(false);
        setNextQuestionCountdown(0);
        setTimeLeft(QUESTION_TIME_LIMIT);
        
        // Update scores
        if (data.scores) {
          // Find the opponent's username and score
          const opponentUsername = Object.keys(data.scores).find(name => name !== user.username);
          const userScore = data.scores[user.username] || 0;
          const opponentScore = opponentUsername ? (data.scores[opponentUsername] || 0) : 0;
          
          console.log(`[Quiz] Next question score update - User: ${user.username} (${userScore}), Opponent: ${opponentUsername} (${opponentScore})`);
          
          setFirstOpponentScore(userScore);
          setSecondOpponentScore(opponentScore);
        }
      }
      
      if (data.type === 'waiting_for_opponent') {
        console.log('[Quiz] Waiting for opponent:', data);
        setWaitingForOpponent(true);
        setShowNextQuestion(false);
      }
      
      if (data.type === 'battle_finished') {
        console.log('[Quiz] Battle finished:', data);
        
        // Update final scores
        if (data.final_scores) {
          // Find the opponent's username and score
          const opponentUsername = Object.keys(data.final_scores).find(name => name !== user.username);
          const userScore = data.final_scores[user.username] || 0;
          const opponentScore = opponentUsername ? (data.final_scores[opponentUsername] || 0) : 0;
          
          console.log(`[Quiz] Final score update - User: ${user.username} (${userScore}), Opponent: ${opponentUsername} (${opponentScore})`);
          
          setFirstOpponentScore(userScore);
          setSecondOpponentScore(opponentScore);
          
          // Determine winner/loser
          if (userScore > opponentScore) {
            setWinner(user.username);
            setLoser(opponentUsername || 'Unknown');
            setResult('win');
            setText('Congratulations! You won the battle!');
          } else if (userScore < opponentScore) {
            setWinner(opponentUsername || 'Unknown');
            setLoser(user.username);
            setResult('lose');
            setText('Good luck next time!');
          } else {
            setWinner('');
            setLoser('');
            setResult('draw');
            setText('It\'s a draw!');
          }
        }
        
        // Update user stats if provided in the event
        if (data.updated_users && data.updated_users[user.username]) {
          const updatedStats = data.updated_users[user.username];
          console.log('[Quiz] Updating user stats:', updatedStats);
          
          // Update the global user store with new stats
          user.totalBattles = updatedStats.totalBattle;
          user.wins = updatedStats.winBattle;
          user.winRate = updatedStats.winRate;
          user.streak = updatedStats.streak;
          
          // Update localStorage if needed
          const userData = JSON.parse(localStorage.getItem('user') || '{}');
          userData.totalBattles = updatedStats.totalBattle;
          userData.wins = updatedStats.winBattle;
          userData.winRate = updatedStats.winRate;
          userData.streak = updatedStats.streak;
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        // Trigger a global event to refresh battle data in other components
        console.log('[Quiz] Dispatching battleFinished event with data:', { 
          battleId: id, 
          finalScores: data.final_scores,
          updated_users: data.updated_users,
          battle: data.battle
        });
        window.dispatchEvent(new CustomEvent('battleFinished', { 
          detail: { 
            battleId: id, 
            finalScores: data.final_scores,
            updated_users: data.updated_users,
            battle: data.battle
          } 
        }));
        console.log('[Quiz] battleFinished event dispatched successfully');
        
        // Navigate to result page
        navigate(`/battle/${id}/result`);
      }
    };
    
    ws.onMessage(handleMessage);
    
    return () => {
      console.log('[BATTLE_WS] Cleaning up WebSocket connection');
      ws.close();
    };
    // eslint-disable-next-line
  }, [id, user.username]);

  // Monitor currentIndex changes
  useEffect(() => {
    console.log(`[Quiz] currentIndex changed to: ${currentIndex}`);
  }, [currentIndex]);

  // Monitor questions state changes
  useEffect(() => {
    console.log(`[Quiz] questions state changed: length=${questions.length}`, questions);
  }, [questions]);

  // Timer effect - only for auto-submission if no answer selected
  useEffect(() => {
    if (!currentQuestion || showNextQuestion) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - auto-submit first answer if no answer selected
          if (!selected) {
            const firstAnswer = currentQuestion.answers?.[0]?.label;
            if (firstAnswer) {
              handleAnswerSubmit(firstAnswer);
            }
          }
          return QUESTION_TIME_LIMIT;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion, showNextQuestion, selected]);

  // Countdown to next question
  useEffect(() => {
    if (!showNextQuestion || nextQuestionCountdown <= 0) {
      return;
    }

    const countdownTimer = setInterval(() => {
      setNextQuestionCountdown((prev) => {
        if (prev <= 1) {
          console.log('[Quiz] Countdown finished, calling advanceToNextQuestion');
          setShowNextQuestion(false);
          // Automatically advance to next question
          advanceToNextQuestion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [showNextQuestion, nextQuestionCountdown]);

  const handleSelect = (label: string) => {
    if (selected === label) {
      setSelected(null);
    } else {
      setSelected(label);
      // Immediately submit the answer when an option is selected
      handleAnswerSubmit(label);
    }
  };

  const handleAnswerSubmit = (answer: string) => {
    if (!wsRef.current || !currentQuestion) {
      console.error('[Quiz] Cannot submit answer: WebSocket not connected or no current question');
      return;
    }

    const currentQuestionIndex = currentIndexRef.current;
    console.log(`[Quiz] Submitting answer: ${answer} for question ${currentQuestionIndex}`);
    console.log(`[Quiz] Current question index: ${currentQuestionIndex}, questions length: ${questionsRef.current.length}`);
    console.log(`[Quiz] currentIndex state: ${currentIndex}, currentIndexRef.current: ${currentIndexRef.current}`);
    console.log(`[Quiz] Current question:`, currentQuestion);
    
    // Send answer to backend
    wsRef.current.send({
      type: 'submit_answer',
      username: user.username,
      answer: answer,
      question_index: currentQuestionIndex
    });

    // Don't clear selected here - keep it highlighted
  };

  const advanceToNextQuestion = () => {
    console.log(`[Quiz] Advancing to next question from index ${currentIndex}`);
    console.log(`[Quiz] Before advance - currentIndex: ${currentIndex}, currentIndexRef.current: ${currentIndexRef.current}`);
    
    if (questionsRef.current.length === 0) {
      console.error('[Quiz] Questions ref is empty! Cannot advance.');
      return;
    }
    
    const nextIndex = currentIndex + 1;
    console.log(`[Quiz] Next index: ${nextIndex}, total questions: ${questionsRef.current.length}`);
    
    if (nextIndex < questionsRef.current.length) {
      // Move to next question
      console.log(`[Quiz] Moving to question ${nextIndex}`);
      setCurrentIndex(nextIndex);
      currentIndexRef.current = nextIndex; // Update ref immediately
      setCurrentQuestion(questionsRef.current[nextIndex]);
      setSelected(null);
      setShowNextQuestion(false);
      setNextQuestionCountdown(3);
      setTimeLeft(QUESTION_TIME_LIMIT);
      setWaitingForOpponent(false); // Reset waiting state
      console.log('[Quiz] Advanced to next question successfully');
      console.log(`[Quiz] After advance - currentIndex: ${nextIndex}, currentIndexRef.current: ${currentIndexRef.current}`);
      console.log(`[Quiz] New question:`, questionsRef.current[nextIndex]);
    } else {
      // Last question reached - don't set waiting state here, only when actually answering
      console.log('[Quiz] Last question reached - user can still answer');
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // UI rendering logic (same as before, but uses questions/currentQuestion)
  if (!questions.length || !currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className={`text-sm px-3 py-1 rounded-full mb-4 ${
          connectionStatus === 'connected' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : connectionStatus === 'connecting'
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {connectionStatus === 'connected' ? 'Connected' : 
           connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </div>
        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></span>
        <span className="ml-2">Waiting for questions from server...</span>
      </div>
    );
  }

  const isQuizFinished = !currentQuestion || currentQuestion.question === 'No more questions';

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center relative"
      style={{
        backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><pattern id="sport" patternUnits="userSpaceOnUse" width="200" height="200"><rect width="200" height="200" fill="%23f8fafc"/><circle cx="100" cy="100" r="80" fill="%23e2e8f0" opacity="0.3"/><circle cx="100" cy="100" r="60" fill="%23cbd5e1" opacity="0.2"/><circle cx="100" cy="100" r="40" fill="%23a1a1aa" opacity="0.1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23sport)"/></svg>')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      <div className="relative z-10 w-full max-w-lg px-4">
        
        <div className="w-full mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 backdrop-blur-sm bg-opacity-95">
            <div className="flex justify-between items-center mb-2">
              <div className="text-center flex-1">
                <div className="text-xs text-gray-600 dark:text-gray-400">You</div>
                <div className="text-xl font-bold text-blue-600">{firstOpponentScore}</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-xs text-gray-600 dark:text-gray-400">Opponent</div>
                <div className="text-xl font-bold text-red-600">{secondOpponentScore}</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1">
                {showNextQuestion ? `Next question in ${nextQuestionCountdown} seconds...` :
                 `Question ${currentIndex + 1} of ${questions.length}`}
              </div>
            </div>
          </div>
        </div>

        <Card className="w-full backdrop-blur-sm bg-opacity-95">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              {!isQuizFinished && (
                <div className="flex items-center gap-4">
                  <div className={`text-lg font-bold ${timeLeft <= 5 ? 'text-red-600' : 'text-gray-600'}`}>{timeLeft}s</div>
                  <div className="text-sm text-gray-600">
                    Question {currentIndex + 1} of {questions.length}
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {isQuizFinished ? (
              <div className="text-center py-6">
                <div className="text-xl font-bold mb-3">You finished your quiz, wait for opponent.</div>
                {showNextQuestion && (
                  <div className="mb-3 text-center text-yellow-600 font-semibold">
                    Next question in {nextQuestionCountdown} seconds...
                  </div>
                )}
              </div>
            ) : showNextQuestion ? (
              // Show countdown to next question
              <div className="text-center py-6">
                <div className="text-lg font-semibold">
                  Next question in {nextQuestionCountdown} seconds...
                </div>
              </div>
            ) : waitingForOpponent ? (
              // Show waiting for opponent state
              <div className="text-center py-6">
                <div className="text-lg font-semibold mb-3">
                  Waiting for opponent to finish...
                </div>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
              </div>
            ) : (
              <>
                <div className="text-base font-semibold mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg break-words leading-relaxed">
                  {currentQuestion?.question}
                </div>
                <div className="grid gap-3 mb-4">
                  {currentQuestion?.answers?.map((ans: any, idx: number) => (
                    <Button
                      key={ans.label || String.fromCharCode(65 + idx)}
                      variant={selected === (ans.label || String.fromCharCode(65 + idx)) ? 'default' : 'outline'}
                      className="w-full h-auto min-h-[50px] p-3 text-left whitespace-normal break-words"
                      onClick={() => handleSelect(ans.label || String.fromCharCode(65 + idx))}
                      disabled={showNextQuestion}
                    >
                      <div className="flex items-start gap-2 w-full">
                        <span className="font-bold text-xs flex-shrink-0">{ans.label || String.fromCharCode(65 + idx)}.</span>
                        <span className="text-xs leading-relaxed">{ans.text}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}