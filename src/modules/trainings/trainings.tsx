import { useState, useEffect } from "react";
import {useGlobalStore } from "../../shared/interface/gloabL_var";
import Header from "../dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { Button } from "../../shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../shared/ui/select";
import { Label } from "../../shared/ui/label";
import { 
  Trophy, 
  Target, 
  Zap, 
  Sword, 
  Brain, 
  BarChart3,
  BookOpen,
  CheckCircle,
  XCircle,
  Play,
  SkipForward,
  RefreshCw,
} from "lucide-react";

interface TrainingStats {
  username: string;
  total_answers: number;
  total_incorrect: number;
  accuracy_rate: number;
  training_sessions: number;
  training_questions: number;
  training_correct: number;
  training_accuracy: number;
  sport_stats: Array<{ sport: string; count: number }>;
  message?: string;
}

interface IncorrectAnswer {
  id: string;
  question_text: string;
  user_answer: string;
  correct_answer: string;
  sport: string;
  level: string;
  answered_at: string;
  battle_id: string;
}

interface TrainingQuestion {
  question: string;
  answers: Array<{ label: string; text: string; correct?: boolean }>;
  correctAnswer: string;
  sport: string;
  level: string;
  originalAnswerId?: string;
}


export default function TrainingsPage() {
  const { user } = useGlobalStore();
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>("incorrect_answers");
  const [trainingStats, setTrainingStats] = useState<TrainingStats | null>(null);
  const [incorrectAnswers, setIncorrectAnswers] = useState<IncorrectAnswer[]>([]);
  const [isTrainingActive, setIsTrainingActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [trainingQuestions, setTrainingQuestions] = useState<TrainingQuestion[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sports = [
    { value: "football", label: "Football", icon: <Trophy className="w-5 h-5" /> },
    { value: "basketball", label: "Basketball", icon: <Target className="w-5 h-5" /> },
    { value: "tennis", label: "Tennis", icon: <Zap className="w-5 h-5" /> },
    { value: "cricket", label: "Cricket", icon: <Sword className="w-5 h-5" /> },
    { value: "baseball", label: "Baseball", icon: <Target className="w-5 h-5" /> },
    { value: "volleyball", label: "Volleyball", icon: <Zap className="w-5 h-5" /> },
    { value: "boxing", label: "Boxing", icon: <Sword className="w-5 h-5" /> },
  ];

  const levels = [
    { value: "easy", label: "Easy", color: "bg-green-500" },
    { value: "medium", label: "Medium", color: "bg-yellow-500" },
    { value: "hard", label: "Hard", color: "bg-red-500" }
  ];

  const questionTypes = [
    { 
      value: "mixed", 
      label: "Mixed Questions", 
      description: "5 questions from 5 different sports",
      icon: <Brain className="w-5 h-5" /> 
    },
    { 
      value: "random", 
      label: "Random  Questions", 
      description: "Random questions from selected sport",
      icon: <Zap className="w-5 h-5" /> 
    },
  ];

  // Fetch training stats and incorrect answers on component mount
  useEffect(() => {
    if (user?.username && user.username.trim() !== "") {
      fetchTrainingStats();
      fetchIncorrectAnswers();     
    } else {
      setError("Please sign in to access training features.");
    }
  }, [user?.username]);

  const fetchTrainingStats = async () => {
    if (!user?.username || user.username.trim() === "") {
      return;
    }
    
    try {
      const url = `/api/training/training-stats/${user.username}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const stats = await response.json();
        
        // If all stats are zero, show a message about no data
        if (stats.total_answers === 0 && stats.total_incorrect === 0 && stats.training_sessions === 0) {
          setTrainingStats({
            ...stats,
            message: "No training data yet. Complete some battles or training sessions to see your stats!"
          });
        } else {
          setTrainingStats(stats);
        }
        setError(null); // Clear any previous errors
      } else {

        setError(`Failed to load training statistics. Please try again.`);
      }
    } catch (error) {
      setError(`Network error while loading training statistics. Please check your connection.`);
    }
  };

  const fetchIncorrectAnswers = async () => {
    if (!user?.username || user.username.trim() === "") {
      return;
    }
    
    try {
      const params = new URLSearchParams();
      if (selectedSport && selectedSport !== "all") params.append('sport', selectedSport);
      if (selectedLevel && selectedLevel !== "all") params.append('level', selectedLevel);
      params.append('limit', '50');

      const url = `/api/training/incorrect-answers/${user.username}?${params}`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setIncorrectAnswers(data.incorrect_answers || []);
      } else {
        console.error("Failed to fetch incorrect answers:", response.status, response.statusText);
      }
    } catch (error) {
    }
  };

  const generateRandomQuestions = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedSport && selectedSport !== "all") params.append('sport', selectedSport);
      params.append('level', selectedLevel !== "all" ? selectedLevel : "medium");
      params.append('count', '5');

      const url = `/api/training/generate-random-questions?${params}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.questions || [];
      } else {
        return [];
      }
    } catch (error) {
      return [];
    }
  };

  const startTrainingSession = async () => {
    if (!user?.username) return;

    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('username', user.username);
      params.append('session_type', selectedQuestionType);
      if (selectedSport !== "all") params.append('sport', selectedSport);
      if (selectedLevel !== "all") params.append('level', selectedLevel);

      const response = await fetch(`/api/training/start-session?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const session = await response.json();
        setCurrentSession(session.session_id);
        
        // Prepare training questions based on type
        if (selectedQuestionType === 'incorrect_answers') {
          await prepareIncorrectAnswersQuestions();
        } else if (selectedQuestionType === 'random') {
          await prepareRandomQuestions();
        } else {
          // For mixed questions, you could generate new questions or use a different source
          await prepareMixedQuestions();
        }
        
        setIsTrainingActive(true);
        setCurrentQuestionIndex(0);
        setTimeLeft(15);
        setShowFeedback(false);
        setSelectedAnswer(null);
      } else {
        console.error("Failed to start training session:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("Error response body:", errorText);
      }
    } catch (error) {
      console.error('Error starting training session:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepareIncorrectAnswersQuestions = async () => {
    if (incorrectAnswers.length === 0) {
      // Create sample questions when no incorrect answers exist
      const sampleQuestions: TrainingQuestion[] = [
        {
          question: "What is the capital of France?",
          answers: [
            { label: 'A', text: 'Paris', correct: true },
            { label: 'B', text: 'London', correct: false },
            { label: 'C', text: 'Berlin', correct: false },
            { label: 'D', text: 'Madrid', correct: false }
          ],
          correctAnswer: 'Paris',
          sport: 'general',
          level: 'easy'
        },
        {
          question: "Which planet is closest to the Sun?",
          answers: [
            { label: 'A', text: 'Venus', correct: false },
            { label: 'B', text: 'Mercury', correct: true },
            { label: 'C', text: 'Earth', correct: false },
            { label: 'D', text: 'Mars', correct: false }
          ],
          correctAnswer: 'Mercury',
          sport: 'general',
          level: 'easy'
        }
      ];
      setTrainingQuestions(sampleQuestions);
      return;
    }
    
    // Convert incorrect answers to training questions
    const questions: TrainingQuestion[] = incorrectAnswers.map((answer, index) => {
      // Create multiple choice options (this is a simplified version)
      const options = [
        { label: 'A', text: answer.correct_answer, correct: true },
        { label: 'B', text: answer.user_answer, correct: false },
        { label: 'C', text: `Option ${index + 3}`, correct: false },
        { label: 'D', text: `Option ${index + 4}`, correct: false }
      ];

      // Shuffle options
      const shuffledOptions = options.sort(() => Math.random() - 0.5);

      return {
        question: answer.question_text,
        answers: shuffledOptions,
        correctAnswer: answer.correct_answer,
        sport: answer.sport,
        level: answer.level,
        originalAnswerId: answer.id
      };
    });

    setTrainingQuestions(questions);
  };

  const prepareMixedQuestions = async () => {
    // Get available sports (excluding "all")
    const availableSports = sports.filter(sport => sport.value !== "all").map(sport => sport.value);
    
    // Select 5 different sports randomly
    const selectedSports = [];
    const shuffledSports = [...availableSports].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < Math.min(5, shuffledSports.length); i++) {
      selectedSports.push(shuffledSports[i]);
    }
    
    // Generate one question from each sport
    const mixedQuestions: TrainingQuestion[] = [];
    
    for (const sport of selectedSports) {
      try {
        // Generate one question for this sport
        const params = new URLSearchParams();
        params.append('sport', sport);
        params.append('level', selectedLevel !== "all" ? selectedLevel : "medium");
        params.append('count', '1');

        const url = `/api/training/generate-random-questions?${params}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          const questions = data.questions || [];
          
          if (questions.length > 0) {
            mixedQuestions.push(questions[0]);
          } else {
          }
        } else {
        }
      } catch (error) {
      }
    }
    
    if (mixedQuestions.length > 0) {
      setTrainingQuestions(mixedQuestions);
    } else {
      const sampleQuestions: TrainingQuestion[] = [
        {
          question: "What is the capital of France?",
          answers: [
            { label: 'A', text: 'Paris', correct: true },
            { label: 'B', text: 'London', correct: false },
            { label: 'C', text: 'Berlin', correct: false },
            { label: 'D', text: 'Madrid', correct: false }
          ],
          correctAnswer: 'Paris',
          sport: 'general',
          level: 'easy'
        },
        {
          question: "Which planet is closest to the Sun?",
          answers: [
            { label: 'A', text: 'Venus', correct: false },
            { label: 'B', text: 'Mercury', correct: true },
            { label: 'C', text: 'Earth', correct: false },
            { label: 'D', text: 'Mars', correct: false }
          ],
          correctAnswer: 'Mercury',
          sport: 'general',
          level: 'easy'
        },
        {
          question: "What is 2 + 2?",
          answers: [
            { label: 'A', text: '3', correct: false },
            { label: 'B', text: '4', correct: true },
            { label: 'C', text: '5', correct: false },
            { label: 'D', text: '6', correct: false }
          ],
          correctAnswer: '4',
          sport: 'general',
          level: 'easy'
        },
        {
          question: "What color is the sky?",
          answers: [
            { label: 'A', text: 'Blue', correct: true },
            { label: 'B', text: 'Red', correct: false },
            { label: 'C', text: 'Green', correct: false },
            { label: 'D', text: 'Yellow', correct: false }
          ],
          correctAnswer: 'Blue',
          sport: 'general',
          level: 'easy'
        },
        {
          question: "How many continents are there?",
          answers: [
            { label: 'A', text: '5', correct: false },
            { label: 'B', text: '6', correct: false },
            { label: 'C', text: '7', correct: true },
            { label: 'D', text: '8', correct: false }
          ],
          correctAnswer: '7',
          sport: 'general',
          level: 'easy'
        }
      ];
      setTrainingQuestions(sampleQuestions);
    }
  };

  const prepareRandomQuestions = async () => {
    // Generate random AI questions
    const randomQuestions = await generateRandomQuestions();
    
    if (randomQuestions.length > 0) {
      setTrainingQuestions(randomQuestions);
    } else {
      await prepareIncorrectAnswersQuestions();
    }
  };

  const handleAnswerSelect = (label: string) => {
    if (showFeedback) return;
    setSelectedAnswer(label);
  };

  const handleAnswerSubmit = async () => {
    if (!currentSession || !trainingQuestions[currentQuestionIndex] || !selectedAnswer) return;

    const question = trainingQuestions[currentQuestionIndex];
    
    // Find the selected answer text based on the label
    const selectedAnswerObj = question.answers.find(ans => ans.label === selectedAnswer);
    if (!selectedAnswerObj) return;
    
    const selectedAnswerText = selectedAnswerObj.text;
    const isAnswerCorrect = selectedAnswerText === question.correctAnswer;
    
    setIsCorrect(isAnswerCorrect);
    setShowFeedback(true);

    // Submit answer to backend
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('session_id', currentSession);
      params.append('username', user?.username || '');
      params.append('question_text', question.question);
      params.append('user_answer', selectedAnswerText);
      params.append('correct_answer', question.correctAnswer);
      params.append('sport', question.sport);
      params.append('level', question.level);
      if (question.originalAnswerId) {
        params.append('original_answer_id', question.originalAnswerId);
      }

      const response = await fetch(`/api/training/submit-answer?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Answer submitted successfully:", result);
      } else {
        console.error("Failed to submit answer:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("Error response body:", errorText);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    }

    // Remove auto-advance - user will click "Next Question" button
  };

  const handleAnswerSubmitTimeout = async () => {
    if (!currentSession || !trainingQuestions[currentQuestionIndex]) return;

    const question = trainingQuestions[currentQuestionIndex];
    
    // Set feedback state for timeout
    setSelectedAnswer(null);
    setIsCorrect(false);
    setShowFeedback(true);
    
    // Submit timeout answer to backend
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('session_id', currentSession);
      params.append('username', user?.username || '');
      params.append('question_text', question.question);
      params.append('user_answer', 'TIMEOUT'); // Special marker for timeout
      params.append('correct_answer', question.correctAnswer);
      params.append('sport', question.sport);
      params.append('level', question.level);
      if (question.originalAnswerId) {
        params.append('original_answer_id', question.originalAnswerId);
      }

      const response = await fetch(`/api/training/submit-answer?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Timeout answer submitted successfully:", result);
      } else {
        console.error("Failed to submit timeout answer:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("Error response body:", errorText);
      }
    } catch (error) {
      console.error('Error submitting timeout answer:', error);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < trainingQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setTimeLeft(15);
    } else {
      // Training session completed
      completeTrainingSession();
    }
  };

  const completeTrainingSession = async () => {
    if (!currentSession) return;

    try {
      const response = await fetch(`/api/training/complete-session/${currentSession}`, {
        method: 'POST'
      });

      if (response.ok) {
        // Reset state
        setIsTrainingActive(false);
        setCurrentSession(null);
        setTrainingQuestions([]);
        setCurrentQuestionIndex(0);
        
        // Refresh stats with detailed logging
        await fetchTrainingStats();
      } else {
        console.error("Failed to complete training session:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("Error response body:", errorText);
      }
    } catch (error) {
      console.error('Error completing training session:', error);
    }
  };

  const skipQuestion = () => {
    nextQuestion();
  };

  // Filter incorrect answers when sport/level changes
  useEffect(() => {
    fetchIncorrectAnswers();
  }, [selectedSport, selectedLevel]);

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isTrainingActive && !showFeedback && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            // Time's up - auto-submit first answer or show timeout
            handleAnswerSubmitTimeout();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTrainingActive, showFeedback, timeLeft]);

  if (isTrainingActive) {
    const currentQuestion = trainingQuestions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-background bg-gaming-pattern">
      <Header user={user} />
      <main className="container-gaming py-8">
        <div className="max-w-4xl mx-auto">
            {/* Training Header */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <h1 className="text-heading-2 text-foreground">
                  Training Session
                </h1>
                <p className="text-responsive-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {trainingQuestions.length}
                </p>
              </div>
            </div>

            {/* Timer and Controls */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="flex items-center justify-center sm:justify-start gap-4">
                <div className="text-center">
                  <div className={`text-2xl sm:text-3xl font-bold ${
                    timeLeft <= 5 ? 'text-red-600 animate-pulse' : 
                    timeLeft <= 10 ? 'text-orange-600' : 
                    'text-blue-600'
                  }`}>
                    {timeLeft}s
                  </div>
                  <div className="text-responsive-xs text-muted-foreground">Time Left</div>
                </div>
              </div>
              
              <div className="flex justify-center sm:justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={skipQuestion}
                  className="px-3 py-2 sm:px-4 sm:py-2"
                >
                  <SkipForward className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Skip</span>
                </Button>
              </div>
            </div>

            {/* Question Card */}
            <Card className="mb-4 sm:mb-6">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
                  Training Question
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentQuestion && (
                  <>
                    <div className="text-responsive-sm font-semibold p-3 sm:p-4 bg-card rounded-lg break-words leading-relaxed border">
                      {currentQuestion.question}
                    </div>
                    
                    <div className="grid gap-2 sm:gap-3">
                      {currentQuestion.answers.map((ans) => (
                        <Button
                          key={ans.label}
                          variant={
                            showFeedback
                              ? ans.correct
                                ? 'default'
                                : selectedAnswer === ans.label && !ans.correct
                                ? 'destructive'
                                : 'outline'
                              : selectedAnswer === ans.label
                              ? 'default'
                              : 'outline'
                          }
                          className={`w-full h-auto min-h-[60px] sm:min-h-[50px] p-3 sm:p-4 text-left whitespace-normal break-words ${
                            showFeedback && ans.correct 
                              ? 'bg-green-100 dark:bg-green-900 border border-green-500 text-green-900 dark:text-green-100' 
                              : showFeedback && selectedAnswer === ans.label && !ans.correct
                              ? 'bg-red-100 dark:bg-red-900 border-red-500 text-red-900 dark:text-red-100'
                              : ''
                          }`}
                          onClick={() => handleAnswerSelect(ans.label)}
                          disabled={showFeedback}
                        >
                          <div className="flex items-start gap-2 w-full">
                            <span className="font-bold text-sm sm:text-xs flex-shrink-0">{ans.label}.</span>
                            <span className="text-sm sm:text-xs leading-relaxed">{ans.text}</span>
                            {showFeedback && ans.correct && (
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 ml-auto flex-shrink-0" />
                            )}
                            {showFeedback && selectedAnswer === ans.label && !ans.correct && (
                              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 ml-auto flex-shrink-0" />
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>

                    {/* Submit Answer Button */}
                    {!showFeedback && selectedAnswer && (
                      <div className="flex justify-center pt-2">
                        <Button
                          onClick={handleAnswerSubmit}
                          className="px-6 sm:px-8 py-2 sm:py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm sm:text-base w-full sm:w-auto"
                        >
                          Submit Answer
                        </Button>
                      </div>
                    )}

                    {showFeedback && (
                      <div className={`p-3 sm:p-4 rounded-lg mb-4 ${
                        isCorrect 
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      }`}>
                        <div className="flex items-center gap-2 mb-3">
                          {isCorrect ? (
                            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                          )}
                          <span className={`text-base sm:text-lg font-bold ${
                            isCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                          }`}>
                            {isCorrect ? 'Correct! 🎉' : 'Incorrect! ❌'}
                          </span>
                        </div>
                        {!isCorrect && (
                          <div className="mb-4 space-y-2">
                            {selectedAnswer ? (
                              <>
                                <p className="text-responsive-xs text-muted-foreground">
                                  Your answer: <span className="font-semibold text-destructive">
                                    {currentQuestion.answers.find(ans => ans.label === selectedAnswer)?.text || selectedAnswer}
                                  </span>
                                </p>
                                <p className="text-responsive-xs text-muted-foreground">
                                  Correct answer: <span className="font-semibold text-green-600">{currentQuestion.correctAnswer}</span>
                                </p>
                                <p className="text-responsive-xs text-muted-foreground/70 italic">
                                  Don't worry! This is a learning opportunity. Review the correct answer and try to understand why it's right.
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-responsive-xs text-muted-foreground">
                                  <span className="font-semibold text-orange-600">⏰ Time's up!</span> You didn't select an answer in time.
                                </p>
                                <p className="text-responsive-xs text-muted-foreground">
                                  Correct answer: <span className="font-semibold text-green-600">{currentQuestion.correctAnswer}</span>
                                </p>
                                <p className="text-responsive-xs text-muted-foreground/70 italic">
                                  Try to answer faster next time! The timer is set to 15 seconds per question.
                                </p>
                              </>
                            )}
                          </div>
                        )}
                        {isCorrect && (
                                                  <p className="text-responsive-xs text-green-600 dark:text-green-400 mb-4">
                          Great job! You got this one right! 🎯
                        </p>
                        )}
                        
                        {/* Next Question Button */}
                        <div className="flex justify-center">
                          <Button
                            onClick={nextQuestion}
                            className={`px-4 sm:px-6 py-2 text-sm sm:text-base w-full sm:w-auto ${
                              isCorrect 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {currentQuestionIndex < trainingQuestions.length - 1 ? (
                              <>
                                <SkipForward className="w-4 h-4 mr-2" />
                                Next Question
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Complete Training
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-gaming-pattern">
      <Header user={user} />
      <main className="container-gaming py-8">
        <div className="max-w-4xl mx-auto">

          {/* Only show training content if user is authenticated */}
          {user?.username && user.username.trim() !== "" && (
            <>
              <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-heading-1 text-foreground mb-2 sm:mb-4">
                  Sports Training Center
                </h1>
                <p className="text-responsive-base text-muted-foreground px-2">
                  Practice with your previously incorrect answers and improve your knowledge
                </p>
              </div>

              <div className="grid gap-4 sm:gap-6">
                {/* Training Setup */}
                <Card>
                  <CardHeader className="pb-4 sm:pb-6">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
                      Training Setup
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="sport" className="text-sm sm:text-base">Select Sport</Label>
                        <Select value={selectedSport} onValueChange={setSelectedSport}>
                          <SelectTrigger className="h-10 sm:h-11">
                            <SelectValue placeholder="Choose sport" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Sports</SelectItem>
                            {sports.map((sport) => (
                              <SelectItem key={sport.value} value={sport.value}>
                                <div className="flex items-center gap-2">
                                  {sport.icon}
                                  <span className="text-sm sm:text-base">{sport.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="level" className="text-sm sm:text-base">Difficulty Level</Label>
                        <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                          <SelectTrigger className="h-10 sm:h-11">
                            <SelectValue placeholder="Choose level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            {levels.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${level.color}`}></div>
                                  <span className="text-sm sm:text-base">{level.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm sm:text-base">Training Mode</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {questionTypes.map((type) => (
                          <Button
                            key={type.value}
                            variant={selectedQuestionType === type.value ? "default" : "outline"}
                            className="flex flex-col items-center gap-2 h-auto p-3 sm:p-4 relative min-h-[80px] sm:min-h-[100px]"
                            onClick={() => setSelectedQuestionType(type.value)}
                          >
                            <div className="flex items-center gap-2">
                              {type.icon}
                              <span className="font-semibold text-sm sm:text-base">{type.label}</span>
                            </div>
                            <div className="text-xs text-muted-foreground text-center leading-tight">
                              {type.description}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-center pt-2">
                      <Button
                        onClick={startTrainingSession}
                        disabled={selectedSport === 'all' || selectedLevel === 'all' || selectedQuestionType === 'all' || loading}
                        className="px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base w-full sm:w-auto"
                      >
                        {loading ? (
                          <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            Start Training Session
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Training Stats */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-lg sm:text-xl">
                        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
                        Your Training Stats
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          fetchTrainingStats();
                        }}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span className="hidden sm:inline">Refresh</span>
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {trainingStats ? (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                          <div className="text-center">
                            <div className="text-responsive-lg font-bold text-blue-600">{trainingStats.total_answers || 0}</div>
                            <div className="text-responsive-xs text-muted-foreground">Total Answers</div>
                          </div>
                          <div className="text-center">
                            <div className="text-responsive-lg font-bold text-destructive">{trainingStats.total_incorrect || 0}</div>
                            <div className="text-responsive-xs text-muted-foreground">Incorrect</div>
                          </div>
                          <div className="text-center">
                            <div className="text-responsive-lg font-bold text-green-600">{trainingStats.accuracy_rate || 0}%</div>
                            <div className="text-responsive-xs text-muted-foreground">Accuracy</div>
                          </div>
                          <div className="text-center">
                            <div className="text-responsive-lg font-bold text-primary">{trainingStats.training_sessions || 0}</div>
                            <div className="text-responsive-xs text-muted-foreground">Sessions</div>
                          </div>
                        </div>
                        
                        {/* Show message when no data */}
                        {trainingStats.total_answers === 0 && trainingStats.total_incorrect === 0 && trainingStats.training_sessions === 0 && (
                          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="text-center">
                              <div className="text-2xl mb-2">📊</div>
                              <p className="text-responsive-sm font-semibold text-primary mb-2">
                                Welcome to Training Stats!
                              </p>
                              <p className="text-responsive-xs text-muted-foreground mb-4 leading-relaxed">
                                Your statistics will appear here once you complete battles or training sessions. 
                                Start your learning journey by playing some battles or trying a training session!
                              </p>
                              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSport("football");
                                    setSelectedLevel("easy");
                                    setSelectedQuestionType("random");
                                    startTrainingSession();
                                  }}
                                  className="text-xs bg-card"
                                >
                                  🎯 Start Sample Training
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    window.location.href = '/dashboard';
                                  }}
                                  className="text-xs bg-card"
                                >
                                  ⚔️ Go to Battles
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        
             
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <div className="text-muted-foreground mb-4">
                          {error ? (
                            <div className="text-destructive">
                              <p className="font-semibold text-responsive-sm">Error loading stats:</p>
                              <p className="text-responsive-xs">{error}</p>
                            </div>
                          ) : (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-4"></div>
                          )}
                        </div>
                        <p className="text-responsive-xs text-muted-foreground">
                          {error ? "Click Refresh to try again" : "Loading training statistics..."}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
} 