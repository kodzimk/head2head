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
import { useCurrentQuestionStore, useGlobalStore, useScoreStore, useTextStore, useWinnerStore, useLoserStore, useResultStore, useOpponentStore } from '../../shared/interface/gloabL_var';
import { BattleWebSocket } from '../../shared/websockets/battle-websocket';
import type { Question } from '../../shared/interface/question';
import axios from 'axios';
import { API_BASE_URL } from '../../shared/interface/gloabL_var';
import { useTranslation } from 'react-i18next';

const QUESTION_TIME_LIMIT = 10; // 10 seconds per question

export default function QuizQuestionPage() {
  const { t } = useTranslation();
  const { id } = useParams() as { id: string };
  const { user, setUser } = useGlobalStore();  
  const { setCurrentQuestion, currentQuestion } = useCurrentQuestionStore();
  const { firstOpponentScore, secondOpponentScore, setFirstOpponentScore, setSecondOpponentScore } = useScoreStore();
  const { setText } = useTextStore();
  const { setWinner } = useWinnerStore();
  const { setLoser } = useLoserStore();
  const { setResult } = useResultStore();
  const { setOpponent } = useOpponentStore();
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
  const opponentDataFetched = useRef<boolean>(false); // Track if opponent data was already fetched

  // Function to fetch and set opponent data
  const fetchOpponentData = async (opponentUsername: string) => {
    if (opponentDataFetched.current || !opponentUsername) return;
    
    try {
      console.log('[BATTLE_WS] Fetching opponent data for:', opponentUsername);
      const response = await axios.get(`${API_BASE_URL}/db/get-user-by-username?username=${opponentUsername}`);
      const opponentAvatar = response.data.avatar || '';
      
      setOpponent(opponentUsername, opponentAvatar);
      opponentDataFetched.current = true;
      console.log('[BATTLE_WS] Opponent data set:', opponentUsername, opponentAvatar);
    } catch (error) {
      console.error('[BATTLE_WS] Error fetching opponent data:', error);
      // Set opponent with username only if fetch fails
      setOpponent(opponentUsername, '');
      opponentDataFetched.current = true;
    }
  };

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
    ],
    drawPending: [
      "Perfect balance! 🤝",
      "Evenly matched! ⚖️",
      "What a battle! 🔥",
      "Neck and neck! 🏁",
      "This is intense! ⚡",
      "Both playing great! 👏",
      "Anyone's game! 🎯",
      "So close! 🤏",
      "Amazing competition! 🏆",
      "Keep it up! 💪"
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
    } else if (userScore === opponentScore && userScore > 0) {
      // Tied with score > 0 (active draw situation)
      const messages = motivationalMessages.drawPending;
      return messages[Math.floor(Math.random() * messages.length)];
    } else {
      // Scores are tied at 0 or default case
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
          
          // Fetch opponent data when first determined
          if (opponentUsername) {
            fetchOpponentData(opponentUsername);
          }
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
        
        // Set waiting state
        setWaitingForOpponent(true);
        setShowNextQuestion(false);
        setUserFinishedAllQuestions(true);
        
        // Update scores if provided
        if (data.scores) {
          const userScore = data.scores[user.username] || 0;
          const opponentUsername = Object.keys(data.scores).find(name => name !== user.username);
          const opponentScore = opponentUsername ? data.scores[opponentUsername] : 0;
          
          setFirstOpponentScore(userScore);
          setSecondOpponentScore(opponentScore);
        }
        
        // Set appropriate waiting message
        if (data.message) {
          setText(data.message);
        } else {
          setText('Waiting for opponent to finish...');
        }
        
        // Set a timeout to show a message if waiting too long
        setTimeout(() => {
          if (waitingForOpponent && !battleFinished) {
            setText('Still waiting for opponent... This may take a moment.');
          }
        }, 10000); // Increased to 10 seconds
      }
      
      if (data.type === 'battle_finished') {
        console.log('[BATTLE_WS] Battle finished message received:', data);
        
        // Validate battle finished data
        if (!data.final_scores || !data.result) {
          console.error('[BATTLE_WS] Invalid battle finished data:', data);
          return;
        }
        
        // Set battle as finished to prevent further interactions
        setBattleFinished(true);
        setWaitingForOpponent(false);
        setShowNextQuestion(false);
        setUserFinishedAllQuestions(false); // Reset when battle is finished
        
        // Set final scores with validation
        const userScore = data.final_scores[user.username] || 0;
        const opponentUsername = Object.keys(data.final_scores).find(name => name !== user.username);
        const opponentScore = opponentUsername ? data.final_scores[opponentUsername] : 0;
        
        // Validate scores are numeric
        const validatedUserScore = typeof userScore === 'number' ? userScore : parseInt(userScore) || 0;
        const validatedOpponentScore = typeof opponentScore === 'number' ? opponentScore : parseInt(opponentScore) || 0;
        
        setFirstOpponentScore(validatedUserScore);
        setSecondOpponentScore(validatedOpponentScore);
        
        // Determine winner/loser with proper validation
        let winner = '';
        let loser = '';
        let result = 'draw';
        let resultText = '';
        
        if (validatedUserScore > validatedOpponentScore) {
          winner = user.username;
          loser = opponentUsername || 'Unknown';
          result = 'win';
          resultText = 'Congratulations! You won the battle!';
        } else if (validatedUserScore < validatedOpponentScore) {
          winner = opponentUsername || 'Unknown';
          loser = user.username;
          result = 'lose';
          resultText = 'Good luck next time!';
        } else {
          // Enhanced Draw case with detailed analysis
          winner = '';
          loser = '';
          result = 'draw';
          
          // Enhanced draw messages based on score
          const drawMessages = [
            'It\'s a perfect draw!',
            'Evenly matched opponents!',
            'What a close battle!',
            'Both players showed great knowledge!',
            'A tie shows equal expertise!',
            'Perfectly balanced battle!'
          ];
          
          // Special messages for different score ranges
          if (validatedUserScore === 0 && validatedOpponentScore === 0) {
            resultText = 'Neither player scored - time to practice more!';
          } else if (validatedUserScore >= 8) {
            resultText = 'High-scoring draw! Both players are experts!';
          } else if (validatedUserScore >= 5) {
            resultText = 'Solid performance from both players - it\'s a draw!';
          } else {
            resultText = drawMessages[Math.floor(Math.random() * drawMessages.length)];
          }
          
          console.log(`[BATTLE_WS] Draw detected: ${user.username} (${validatedUserScore}) vs ${opponentUsername} (${validatedOpponentScore})`);
        }
        
        setWinner(winner);
        setLoser(loser);
        setResult(result);
        setText(resultText);
        
        // Update user stats if provided in the event with validation
        if (data.updated_users && data.updated_users[user.username]) {
          const updatedStats = data.updated_users[user.username];
          
          // Validate updated stats
          if (updatedStats && typeof updatedStats === 'object') {
            const validatedStats = {
              totalBattle: typeof updatedStats.totalBattle === 'number' ? updatedStats.totalBattle : parseInt(updatedStats.totalBattle) || 0,
              winBattle: typeof updatedStats.winBattle === 'number' ? updatedStats.winBattle : parseInt(updatedStats.winBattle) || 0,
              winRate: typeof updatedStats.winRate === 'number' ? updatedStats.winRate : parseInt(updatedStats.winRate) || 0,
              streak: typeof updatedStats.streak === 'number' ? updatedStats.streak : parseInt(updatedStats.streak) || 0,
            };
            
            console.log('[BATTLE_WS] Updating user stats with validated data:', validatedStats);
            
            // Update the global user store with new stats using setUser
            const updatedUser = {
              ...user,
              totalBattles: validatedStats.totalBattle,
              wins: validatedStats.winBattle,
              winRate: validatedStats.winRate,
              streak: validatedStats.streak,
            };
            
            // Update global store
            if (setUser) {
              setUser(updatedUser);
              console.log('[BATTLE_WS] Updated global user store with new stats');
            }
            
            // Update localStorage
            try {
              localStorage.setItem('user', JSON.stringify(updatedUser));
              console.log('[BATTLE_WS] Updated localStorage with new user stats');
            } catch (error) {
              console.error('[BATTLE_WS] Error updating localStorage:', error);
            }
          } else {
            console.warn('[BATTLE_WS] Invalid updated stats format:', updatedStats);
          }
        } else {
          console.log('[BATTLE_WS] No updated user stats provided in battle finished message');
        }
        
        // Trigger a global event to refresh battle data in other components with enhanced data
        try {
          const battleFinishedEvent = new CustomEvent('battleFinished', {
            detail: {
              battleId: id,
              finalScores: data.final_scores,
              winner: data.winner || winner,
              loser: data.loser || loser,
              result: data.result || result,
              updatedUsers: data.updated_users,
              timestamp: data.timestamp || Date.now(),
              processingStatus: data.processing_status || 'completed',
              userScore: validatedUserScore,
              opponentScore: validatedOpponentScore
            }
          });
          window.dispatchEvent(battleFinishedEvent);
          console.log('[BATTLE_WS] Dispatched battleFinished event with enhanced data');
        } catch (error) {
          console.error('[BATTLE_WS] Error dispatching battleFinished event:', error);
        }
        
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-surface-1 to-surface-2">
        <div className="absolute inset-0 bg-gaming-pattern opacity-20"></div>
        <div className="relative z-10 max-w-md mx-auto p-6">
          <Card className="bg-card/95 backdrop-blur-md border-border/50 shadow-xl">
            <CardContent className="p-6">
              <div className="text-center">
                <div className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full mb-6 border ${
                  connectionStatus === 'connected' 
                    ? 'bg-success/10 text-success border-success/30' 
                    : connectionStatus === 'connecting'
                    ? 'bg-warning/10 text-warning border-warning/30'
                    : 'bg-destructive/10 text-destructive border-destructive/30'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-success animate-pulse' :
                    connectionStatus === 'connecting' ? 'bg-warning animate-spin' : 'bg-destructive'
                  }`}></div>
                  {connectionStatus === 'connected' ? 'Connected' : 
                   connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                </div>
                
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                </div>
                
                <div className="text-lg font-semibold text-card-foreground mb-2">
                  Loading Battle Questions
                </div>
                <div className="text-muted-foreground">
                  Preparing your trivia challenge...
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show battle finished overlay if battle is finished
  if (battleFinished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative bg-gradient-to-br from-background via-surface-1 to-surface-2">
        <div className="absolute inset-0 bg-gaming-pattern opacity-20"></div>
        <div className="absolute inset-0 bg-background/80"></div>
        <div className="relative z-10 w-full max-w-lg px-4">
          <Card className="w-full bg-card/95 backdrop-blur-md border-border/50 shadow-xl">
            <CardHeader className="pb-4 text-center">
              <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🏆</span>
              </div>
              <div className="text-2xl font-bold text-success mb-2">Battle Completed!</div>
              <div className="text-muted-foreground">Calculating your results...</div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                </div>
                <div className="text-lg font-semibold text-card-foreground mb-2">Processing Final Results</div>
                <div className="text-muted-foreground">
                  Determining the winner and updating your statistics...
                </div>
                <div className="mt-4 bg-accent/10 rounded-lg px-4 py-3 border border-accent/20">
                  <div className="text-sm text-accent font-medium">
                    You'll be redirected to the results page shortly
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background bg-gaming-pattern">
      <main className="container-gaming py-8">
        <Card className="card-surface max-w-4xl mx-auto">
          <CardHeader className="responsive-padding">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-muted-foreground">
                  {t('quiz.question')} {currentIndex + 1}/{questions.length}
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  {t('quiz.timeLeft')}: {timeLeft}s
                </div>
              </div>
              <div className={`text-sm font-medium ${
                connectionStatus === 'connected' 
                  ? 'text-green-500' 
                  : connectionStatus === 'disconnected'
                  ? 'text-red-500'
                  : 'text-yellow-500'
              }`}>
                {connectionStatus === 'connected' 
                  ? t('battles.countdown.connected')
                  : connectionStatus === 'disconnected'
                  ? t('battles.countdown.disconnected')
                  : t('battles.countdown.checking')
                }
              </div>
            </div>
          </CardHeader>
          <CardContent className="responsive-padding space-y-6">
            {/* Question */}
            {currentQuestion && (
              <div className="space-y-6">
                <div className="text-xl font-semibold">
                  {currentQuestion.question}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentQuestion.answers.map((answer, index) => (
                    <Button
                      key={index}
                      variant={selected === answer.label ? "default" : "outline"}
                      className={`h-auto py-4 px-6 text-left justify-start ${
                        selected === answer.label ? 'bg-primary text-primary-foreground' : ''
                      }`}
                      onClick={() => handleSelect(answer.label)}
                      disabled={answerSubmitted || showNextQuestion}
                    >
                      {answer.text}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            {!showNextQuestion && !answerSubmitted && (
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleAnswerSubmit(selected || '')}
                disabled={!selected}
              >
                {t('quiz.submitAnswer')}
              </Button>
            )}

            {/* Next Question Countdown */}
            {showNextQuestion && !userFinishedAllQuestions && (
              <div className="text-center space-y-4">
                <div className="text-2xl font-bold">
                  {selected === currentQuestion?.correctAnswer 
                    ? t('quiz.correct')
                    : t('quiz.incorrect')
                  }
                </div>
                <div className="text-lg">
                  {t('quiz.nextQuestion')} {nextQuestionCountdown}s
                </div>
              </div>
            )}

            {/* Motivational Message */}
            {motivationalMessage && (
              <div className="text-center text-lg font-semibold text-primary">
                {motivationalMessage}
              </div>
            )}

            {/* Waiting for Opponent */}
            {waitingForOpponent && (
              <div className="text-center text-lg font-semibold text-primary">
                {t('battles.waitingForOpponent')}
              </div>
            )}

            {/* Battle Finished */}
            {battleFinished && (
              <div className="text-center space-y-4">
                <div className="text-2xl font-bold">
                  {t('quiz.finalResults')}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-lg font-semibold">{t('quiz.yourScore')}</div>
                    <div className="text-3xl font-bold text-primary">{firstOpponentScore}</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{t('quiz.opponentScore')}</div>
                    <div className="text-3xl font-bold text-primary">{secondOpponentScore}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}