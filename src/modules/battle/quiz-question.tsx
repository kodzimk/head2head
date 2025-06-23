import { useState, useEffect } from 'react';
import { Button } from '../../shared/ui/button';
import { Card, CardContent, CardHeader } from '../../shared/ui/card';
import { useParams, useNavigate } from 'react-router-dom';
import { useCurrentQuestionStore, useGlobalStore, useScoreStore, useTextStore } from '../../shared/interface/gloabL_var';
import { checkForWinner, submitAnswer } from '../../shared/websockets/websocket';


const QUESTION_TIME_LIMIT = 10; // 10 seconds per question

export default function QuizQuestionPage() {
  const {id} = useParams() as {id: string};
  const {currentQuestion} = useCurrentQuestionStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const {firstOpponentScore, secondOpponentScore} = useScoreStore();
  const {user} = useGlobalStore();  
  const [showNextQuestion, setShowNextQuestion] = useState(false);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState(3);
  const navigate = useNavigate();
  const {text} = useTextStore();
  
  const isQuizFinished = currentQuestion && currentQuestion['question'] === 'No more questions';

  const getBattleMessage = () => {
    const scoreDiff = firstOpponentScore - secondOpponentScore;
    
    if (scoreDiff > 2) {
      return "🔥 You're DOMINATING! 🔥";
    } else if (scoreDiff > 0) {
      return "💪 You're ahead! Keep it up! 💪";
    } else if (scoreDiff === 0) {
      return "⚔️ It's a TIE! Fight harder! ⚔️";
    } else if (scoreDiff > -2) {
      return "😤 Catch up! You can do it! 😤";
    } else {
      return "😵 You're getting OWNED! 😵";
    }
  };

  const handleSelect = (label: string) => {
    submitAnswer(id, label,user.username);
    setSelected(label);
    setShowNextQuestion(true);
    setNextQuestionCountdown(3);
    checkForWinner(id);
  };

  // Handle "Next question coming..." message with countdown
  useEffect(() => {
    if (showNextQuestion && nextQuestionCountdown > 0) {
      const timer = setTimeout(() => {
        setNextQuestionCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showNextQuestion && nextQuestionCountdown === 0) {
      // Countdown finished, reset state
      setShowNextQuestion(false);
      setTimeLeft(QUESTION_TIME_LIMIT);
    }
  }, [showNextQuestion, nextQuestionCountdown]);

  // Reset state when current question changes (new question received from websocket)
  useEffect(() => {
    console.log("Current question changed:", currentQuestion); // Debug logging
    
    if (currentQuestion && currentQuestion.question && currentQuestion.question !== 'No more questions') {
      console.log("Resetting quiz state for new question - setting timeLeft to:", QUESTION_TIME_LIMIT);
      setSelected(null);
      setShowNextQuestion(false);
      setNextQuestionCountdown(3);
      setTimeLeft(QUESTION_TIME_LIMIT);
    }
  }, [currentQuestion]);

  // Main timer effect - only run when not showing next question and not finished
  useEffect(() => {
    if (isQuizFinished || showNextQuestion) {
      console.log("Timer paused - isQuizFinished:", isQuizFinished, "showNextQuestion:", showNextQuestion);
      return;
    }
    
    if (timeLeft > 0) {
      console.log("Timer running - timeLeft:", timeLeft);
      const timer = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      // Time's up - submit empty answer
      console.log("Time's up, submitting empty answer");
      setSelected(null);
      submitAnswer(id, '', user.username);
      setShowNextQuestion(true);
      setNextQuestionCountdown(3);
      setTimeLeft(QUESTION_TIME_LIMIT);
      checkForWinner(id);
    }
  }, [timeLeft, isQuizFinished, showNextQuestion, id, user.username]);

  // Navigate to result when text is set
  useEffect(() => {
    if (text !== '') {
        navigate(`/battle/${id}/result`);
    }
  }, [text, id, navigate]);

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
                {getBattleMessage()}
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
                  {showNextQuestion && (
                    <div className="text-sm text-yellow-600 font-semibold">
                      Next question in {nextQuestionCountdown} seconds...
                    </div>
                  )}

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
            ) : (
              <>
                <div className="text-base font-semibold mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg break-words leading-relaxed">
                  {currentQuestion?.question || 'Loading question...'}
                </div>
                <div className="grid gap-3 mb-4">
                  {currentQuestion?.answers?.map((ans: any) => (
                    <Button 
                      key={ans.label} 
                      variant={selected === ans.label ? 'default' : 'outline'} 
                      className="w-full h-auto min-h-[50px] p-3 text-left whitespace-normal break-words" 
                      onClick={() => handleSelect(ans.label)} 
                      disabled={showNextQuestion}
                    >
                      <div className="flex items-start gap-2 w-full">
                        <span className="font-bold text-xs flex-shrink-0">{ans.label}.</span>
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