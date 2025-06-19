import { useState, useEffect } from 'react';
import { Button } from '../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { useParams, useNavigate } from 'react-router-dom';
import { useCurrentQuestionStore, useGlobalStore, useLoserStore, useScoreStore, useTextStore, useWinnerStore } from '../../shared/interface/gloabL_var';
import { battleResult, checkForWinner, submitAnswer } from '../../shared/websockets/websocket';


const QUESTION_TIME_LIMIT = 10; // 30 seconds per question
const NEXT_QUESTION_DELAY = 3; // 3 seconds delay

export default function QuizQuestionPage() {
  const {id} = useParams() as {id: string};
  const {currentQuestion} = useCurrentQuestionStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const {firstOpponentScore, secondOpponentScore} = useScoreStore();
  const {user} = useGlobalStore();  
  const [showNextQuestion, setShowNextQuestion] = useState(false);
  const [countdown, setCountdown] = useState(NEXT_QUESTION_DELAY);
  const navigate = useNavigate();
  const {text} = useTextStore();
  // Helper to check if quiz is finished
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
    setCountdown(NEXT_QUESTION_DELAY);
    checkForWinner(id);
  };


  useEffect(() => {
    if (showNextQuestion && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showNextQuestion && countdown === 0) {
      
      moveToNextQuestion();
      setShowNextQuestion(false);
      setTimeLeft(QUESTION_TIME_LIMIT);
      checkForWinner(id);
    }
  }, [showNextQuestion, countdown]);

  const moveToNextQuestion = () => {
    setSelected(null);
    setCountdown(NEXT_QUESTION_DELAY);
  };

  useEffect(() => {
    // Stop timer if quiz is finished or during next question countdown
    if (isQuizFinished || showNextQuestion) {
      return;
    }
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      const handleTimeUp = () => {   
        setSelected(null);
        submitAnswer(id, '',user.username);
        setShowNextQuestion(true);
        setCountdown(NEXT_QUESTION_DELAY);
        checkForWinner(id);
      };
      handleTimeUp();
    }
  }, [timeLeft, currentQuestion, isQuizFinished, showNextQuestion]);

  // Poll for result when finished
  useEffect(() => {
    if (text !== '') {
       
        navigate(`/battle/${id}/result`);
    }
  }, [text]);

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
      <div className="relative z-10 w-full max-w-md">
        {/* Score Display */}
        <div className="w-full mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 backdrop-blur-sm bg-opacity-95">
            <div className="flex justify-between items-center mb-3">
              <div className="text-center flex-1">
                <div className="text-sm text-gray-600 dark:text-gray-400">You</div>
                <div className="text-2xl font-bold text-blue-600">{firstOpponentScore}</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-sm text-gray-600 dark:text-gray-400">Opponent</div>
                <div className="text-2xl font-bold text-red-600">{secondOpponentScore}</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2">
                {getBattleMessage()}
              </div>
            </div>
          </div>
        </div>

        <Card className="w-full backdrop-blur-sm bg-opacity-95">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Compete for GOATNESS</CardTitle>
              {/* Hide timer if quiz is finished */}
              {!isQuizFinished && (
                <div className={`text-lg font-bold ${timeLeft <= 5 ? 'text-red-600' : 'text-gray-600'}`}>{timeLeft}s</div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isQuizFinished ? (
              <div className="text-center py-8">
                <div className="text-2xl font-bold mb-4">You finished your quiz, wait for opponent.</div>
                {showNextQuestion && (
                  <div className="mb-4 text-center text-yellow-600 font-semibold">
                    Next question in {countdown} second{countdown !== 1 ? 's' : ''}...
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="text-lg font-semibold mb-2">{currentQuestion['question']}</div>
                {showNextQuestion && (
                  <div className="mb-4 text-center text-yellow-600 font-semibold">
                    Next question in {countdown} second{countdown !== 1 ? 's' : ''}...
                  </div>
                )}
                <div className="grid gap-3 mb-6">
                  {currentQuestion['answers'].map((ans: any) => (
                    <Button key={ans.label} variant={selected === ans.label ? 'default' : 'outline'} className="w-full justify-start" onClick={() => handleSelect(ans.label)} disabled={showNextQuestion}>
                      <span className="font-bold mr-2">{ans.label}.</span> {ans.text}
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