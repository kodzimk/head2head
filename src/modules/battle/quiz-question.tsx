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
import type { Question } from '../../shared/interface/question';

const QUESTION_TIME_LIMIT = 10; // 10 seconds per question

export default function QuizQuestionPage() {
  const { id } = useParams() as { id: string };
  const { user, setUser } = useGlobalStore();  
  const { setCurrentQuestion, currentQuestion } = useCurrentQuestionStore();
  const { firstOpponentScore, secondOpponentScore, setFirstOpponentScore, setSecondOpponentScore } = useScoreStore();
  const { setText } = useTextStore();
  const { setWinner } = useWinnerStore();
  const { setLoser } = useLoserStore();
  const { setResult } = useResultStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [showNextQuestion, setShowNextQuestion] = useState(false);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState(7);
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [battleFinished, setBattleFinished] = useState(false);
  const [answerSubmitted, setAnswerSubmitted] = useState(false); // Track if answer was submitted
  const [userFinishedAllQuestions, setUserFinishedAllQuestions] = useState(false); // Track if user finished all questions
  const navigate = useNavigate();
  const wsRef = useRef<BattleWebSocket | null>(null);
  const questionsRef = useRef<any[]>([]); // Use ref to avoid stale closure
  const currentIndexRef = useRef<number>(0); // Track current index in ref

  // Motivational messages array
  const motivationalMessages = {
    winning: [
      "You're cooking! 🔥",
      "You're on fire! 🔥",
      "You're unstoppable! ⚡",
      "Keep the momentum going! ⚡",
      "You've got this! 🎯",
      "Don't let up! 🚀",
      "Keep pushing! 💯",
      "Show them what you've got! 🏆",
      "You're dominating! 👑",
      "Stay in the zone! 🎯"
    ],
    losing: [
      "Hurry up, you can comeback! 💪",
      "Don't give up! 💪",
      "You can turn this around! 🔄",
      "Stay focused! 🧠",
      "Keep fighting! ⚔️",
      "You've got this! 🎯",
      "Comeback time! 🚀",
      "Show your strength! 💪",
      "Never surrender! 🛡️",
      "Rise to the challenge! ⬆️"
    ],
    tied: [
      "It's anyone's game! 🎯",
      "Stay focused! 🧠",
      "You've got this! 🎯",
      "Keep pushing! 💯",
      "Don't let up! 🚀",
      "Show them what you've got! 🏆",
      "Stay in the zone! 🎯",
      "Keep the momentum going! ⚡",
      "You're doing great! 👍",
      "Stay strong! 💪"
    ]
  };

  // Get random motivational message based on score
  const getRandomMotivationalMessage = () => {
    const userScore = firstOpponentScore;
    const opponentScore = secondOpponentScore;
    
    if (userScore > opponentScore) {
      // User is winning
      const messages = motivationalMessages.winning;
      return messages[Math.floor(Math.random() * messages.length)];
    } else if (userScore < opponentScore) {
      // User is losing
      const messages = motivationalMessages.losing;
      return messages[Math.floor(Math.random() * messages.length)];
    } else {
      // Scores are tied
      const messages = motivationalMessages.tied;
      return messages[Math.floor(Math.random() * messages.length)];
    }
  };

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
      if (data.type === 'error') {
        console.error('[BATTLE_WS] Error from server:', data.message);
        alert(`Battle error: ${data.message}`);
        return;
      }
      
      if (data.type === 'quiz_ready') {
        if (!data.questions || data.questions.length === 0) {
          console.error('[Quiz] No questions received from server!');
          alert('No questions received from server. Please try again.');
          return;
        }
        setQuestions(data.questions);
        questionsRef.current = data.questions; // Store in ref
        setCurrentIndex(0);
        currentIndexRef.current = 0; // Set ref immediately
        setCurrentQuestion(data.questions[0]);
        setSelected(null);
        setShowNextQuestion(false);
        setNextQuestionCountdown(7);
        setMotivationalMessage(getRandomMotivationalMessage());
        setTimeLeft(QUESTION_TIME_LIMIT);
        setUserFinishedAllQuestions(false); // Reset when quiz starts
      }
      
      if (data.type === 'answer_submitted') {
        console.log('[BATTLE_WS] Answer submitted:', data);
        
        // Update scores
        if (data.scores) {
          setFirstOpponentScore(data.scores[user.username] || 0);
          const opponentUsername = Object.keys(data.scores).find(name => name !== user.username);
          setSecondOpponentScore(opponentUsername ? data.scores[opponentUsername] : 0);
        }
        
        // Check if this was the last question
        const currentQuestionIndex = currentIndexRef.current;
        if (currentQuestionIndex >= questionsRef.current.length - 1) {
          setUserFinishedAllQuestions(true);
          console.log('[BATTLE_WS] User finished all questions');
        }
        
        // Start 3-second countdown for next question
        if (data.start_countdown) {
          setShowNextQuestion(true);
          setNextQuestionCountdown(3);
          setMotivationalMessage(getRandomMotivationalMessage());
        }
      }
      
      if (data.type === 'opponent_answered') {
        console.log('[BATTLE_WS] Opponent answered:', data);
        
        // Only update scores, no other action needed
        if (data.scores) {
          setFirstOpponentScore(data.scores[user.username] || 0);
          const opponentUsername = Object.keys(data.scores).find(name => name !== user.username);
          setSecondOpponentScore(opponentUsername ? data.scores[opponentUsername] : 0);
        }
      }
      
      if (data.type === 'next_question') {
        console.log('[BATTLE_WS] Next question received:', data);
        
        // Update scores
        if (data.scores) {
          setFirstOpponentScore(data.scores[user.username] || 0);
          const opponentUsername = Object.keys(data.scores).find(name => name !== user.username);
          setSecondOpponentScore(opponentUsername ? data.scores[opponentUsername] : 0);
        }
        
        // Set the new question
        if (data.question) {
          setCurrentQuestion(data.question);
          setCurrentIndex(data.question_index || 0);
          currentIndexRef.current = data.question_index || 0;
          setSelected(null);
          setTimeLeft(QUESTION_TIME_LIMIT);
          setAnswerSubmitted(false);
        }
      }
      
      if (data.type === 'waiting_for_opponent') {
        console.log('[BATTLE_WS] Waiting for opponent message received:', data);
        setWaitingForOpponent(true);
        setShowNextQuestion(false);
        
        // Update scores if provided
        if (data.scores) {
          setFirstOpponentScore(data.scores[user.username] || 0);
          const opponentUsername = Object.keys(data.scores).find(name => name !== user.username);
          setSecondOpponentScore(opponentUsername ? data.scores[opponentUsername] : 0);
        }
        
        // Set a timeout to show a message if waiting too long
        setTimeout(() => {
          if (waitingForOpponent && !battleFinished) {
            setText('Still waiting for opponent... This may take a moment.');
          }
        }, 5000);
      }
      
      if (data.type === 'battle_finished') {
        console.log('[BATTLE_WS] Battle finished message received:', data);
        
        // Set battle as finished to prevent further interactions
        setBattleFinished(true);
        setWaitingForOpponent(false);
        setShowNextQuestion(false);
        setUserFinishedAllQuestions(false); // Reset when battle is finished
        
        // Set final scores
        const userScore = data.final_scores[user.username] || 0;
        const opponentUsername = Object.keys(data.final_scores).find(name => name !== user.username);
        const opponentScore = opponentUsername ? data.final_scores[opponentUsername] : 0;
        
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
        
        // Update user stats if provided in the event
        if (data.updated_users && data.updated_users[user.username]) {
          const updatedStats = data.updated_users[user.username];
          
          // Update the global user store with new stats using setUser
          const updatedUser = {
            ...user,
            totalBattles: updatedStats.totalBattle,
            wins: updatedStats.winBattle,
            winRate: updatedStats.winRate,
            streak: updatedStats.streak,
          };
          
          // Update global store
          if (setUser) {
            setUser(updatedUser);
          }
          
          // Update localStorage
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        // Trigger a global event to refresh battle data in other components
        const battleFinishedEvent = new CustomEvent('battleFinished', {
          detail: {
            battleId: id,
            finalScores: data.final_scores,
            winner: data.winner,
            loser: data.loser,
            result: data.result,
            updatedUsers: data.updated_users
          }
        });
        window.dispatchEvent(battleFinishedEvent);
        
        console.log('[BATTLE_WS] Navigating to result page immediately...');
        // Navigate to result page immediately after setting battle finished state
        navigate(`/battle/${id}/result`);
      }
    };
    
    ws.onMessage(handleMessage);
    
    return () => {
      console.log('[BATTLE_WS] Cleaning up WebSocket connection');
      if (wsRef.current) {
        wsRef.current.close();
      }
      // Clean up battle finished state
      setBattleFinished(false);
    };
    // eslint-disable-next-line
  }, [id, user.username]);

  // Monitor currentIndex changes
  useEffect(() => {
    // currentIndex changed
  }, [currentIndex]);

  // Monitor questions state changes
  useEffect(() => {
    // questions state changed
  }, [questions]);

  // Timer effect - only for auto-submission if no answer selected
  useEffect(() => {
    if (!currentQuestion || showNextQuestion || battleFinished || answerSubmitted) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - auto-submit first answer if no answer selected
          if (!selected) {
            handleAnswerSubmit('');
          }
          return QUESTION_TIME_LIMIT;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion, showNextQuestion, selected, battleFinished, answerSubmitted]);

  // Countdown to next question
  useEffect(() => {
    if (!showNextQuestion || nextQuestionCountdown <= 0 || battleFinished) {
      return;
    }

    const countdownTimer = setInterval(() => {
      setNextQuestionCountdown((prev) => {
        if (prev <= 1) {
          setShowNextQuestion(false);
          setMotivationalMessage('');
          setAnswerSubmitted(false);
          // Automatically advance to next question
          advanceToNextQuestion();
          return 0;
        }
        // Change motivational message every second
        setMotivationalMessage(getRandomMotivationalMessage());
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [showNextQuestion, nextQuestionCountdown, battleFinished]);

  const handleSelect = (label: string) => {
    if (battleFinished || answerSubmitted) {
      return;
    }
    
    if (selected === label) {
      setSelected(null);
    } else {
      setSelected(label);
      // Immediately submit the answer when an option is selected
      handleAnswerSubmit(label);
    }
  };

  const handleAnswerSubmit = (answer: string) => {
    if (!wsRef.current || !currentQuestion || battleFinished || answerSubmitted) {
      return;
    }

    const currentQuestionIndex = currentIndexRef.current;
    
    if (currentQuestionIndex >= questionsRef.current.length) {
      return;
    }

    // Mark as answered to prevent double submission
    setAnswerSubmitted(true);
    setSelected(answer);

    // Send answer to server
    wsRef.current.send({
      type: 'submit_answer',
      battle_id: id,
      username: user.username,
      answer: answer,
      question_index: currentQuestionIndex
    });
  };

  const advanceToNextQuestion = () => {
    if (questionsRef.current.length === 0 || battleFinished) {
      return;
    }
    
    // Don't advance locally - wait for server to send next question
    // Just reset the state for the next question
    setSelected(null);
    setShowNextQuestion(false);
    setNextQuestionCountdown(3);
    setMotivationalMessage(getRandomMotivationalMessage());
    setTimeLeft(QUESTION_TIME_LIMIT);
    setWaitingForOpponent(false);
    setAnswerSubmitted(false);
    
    console.log('[BATTLE_WS] Waiting for server to send next question...');
  };

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

  // Show battle finished overlay if battle is finished
  if (battleFinished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative">
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="relative z-10 w-full max-w-lg px-4">
          <Card className="w-full backdrop-blur-sm bg-opacity-95">
            <CardHeader className="pb-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-2">🏆 Battle Finished! 🏆</div>
                <div className="text-sm text-gray-600">Redirecting to results...</div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <div className="text-lg font-semibold mb-2">Calculating final results...</div>
                <div className="text-sm text-gray-600">Please wait while we determine the winner and update your statistics.</div>
              </div>
            </CardContent>
          </Card>
        </div>
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
                {userFinishedAllQuestions ? (
                  <div className="flex items-center justify-center gap-2">
                    <span>Waiting for opponent...</span>
                  </div>
                ) : showNextQuestion ? (
                  <div className="flex items-center justify-center gap-2">
                    <span>Next question in:</span>
                    <span className="text-lg font-bold text-orange-600">{nextQuestionCountdown}</span>
                  </div>
                ) : (
                  motivationalMessage
                )}
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
            ) : userFinishedAllQuestions ? (
              // Show waiting for opponent state when user finished all questions
              <div className="text-center py-6">
                <div className="text-lg font-semibold mb-3">
                  Waiting for opponent to finish...
                </div>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
              </div>
            ) : showNextQuestion ? (
              // Show countdown to next question
              <div className="text-center py-6">
                <div className="text-lg font-semibold mb-3">
                  Next question coming up...
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
                      disabled={showNextQuestion || answerSubmitted || battleFinished}
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