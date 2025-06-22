import { useState, useEffect } from "react";
import { useGlobalStore } from "../../shared/interface/gloabL_var";
import Header from "../dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { Button } from "../../shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../shared/ui/select";
import { Label } from "../../shared/ui/label";
import { Badge } from "../../shared/ui/badge";
import { Progress } from "../../shared/ui/progress";
import { 
  Trophy, 
  Target, 
  Zap, 
  Sword, 
  Users, 
  Brain, 
  Clock, 
  Star,
  Play,
  RotateCcw,
  BarChart3,
  Award,
  MapPin,
  User,
  Calendar
} from "lucide-react";
import axios from "axios";
import type { Question } from "../../shared/interface/question";

interface TrainingStats {
  totalQuestions: number;
  correctAnswers: number;
  averageTime: number;
  bestSport: string;
  bestLevel: string;
}

export default function TrainingsPage() {
  const { user } = useGlobalStore();
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("easy");
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>("mixed");
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTrainingActive, setIsTrainingActive] = useState(false);
  const [trainingStats, setTrainingStats] = useState<TrainingStats>({
    totalQuestions: 0,
    correctAnswers: 0,
    averageTime: 0,
    bestSport: "",
    bestLevel: ""
  });

  const sports = [
    { value: "football", label: "Football", icon: <Trophy className="w-5 h-5" /> },
    { value: "basketball", label: "Basketball", icon: <Target className="w-5 h-5" /> },
    { value: "tennis", label: "Tennis", icon: <Zap className="w-5 h-5" /> },
    { value: "cricket", label: "Cricket", icon: <Sword className="w-5 h-5" /> },
    { value: "baseball", label: "Baseball", icon: <Target className="w-5 h-5" /> },
    { value: "hockey", label: "Hockey", icon: <Sword className="w-5 h-5" /> },
    { value: "soccer", label: "Soccer", icon: <Trophy className="w-5 h-5" /> },
    { value: "volleyball", label: "Volleyball", icon: <Zap className="w-5 h-5" /> },
    { value: "rugby", label: "Rugby", icon: <Trophy className="w-5 h-5" /> },
    { value: "golf", label: "Golf", icon: <Target className="w-5 h-5" /> },
    { value: "swimming", label: "Swimming", icon: <Zap className="w-5 h-5" /> },
    { value: "athletics", label: "Athletics", icon: <Zap className="w-5 h-5" /> },
    { value: "cycling", label: "Cycling", icon: <Zap className="w-5 h-5" /> },
    { value: "boxing", label: "Boxing", icon: <Sword className="w-5 h-5" /> },
    { value: "martial_arts", label: "Martial Arts", icon: <Sword className="w-5 h-5" /> }
  ];

  const levels = [
    { value: "easy", label: "Easy", color: "bg-green-500" },
    { value: "medium", label: "Medium", color: "bg-yellow-500" },
    { value: "hard", label: "Hard", color: "bg-red-500" }
  ];

  const questionTypes = [
    { value: "mixed", label: "Mixed Questions", icon: <Brain className="w-4 h-4" /> },
    { value: "who", label: "Who is this?", icon: <User className="w-4 h-4" /> },
    { value: "where", label: "Where was this?", icon: <MapPin className="w-4 h-4" /> },
    { value: "when", label: "When did this happen?", icon: <Calendar className="w-4 h-4" /> },
    { value: "trophy", label: "Which trophy/cup?", icon: <Award className="w-4 h-4" /> },
    { value: "better", label: "Who is better?", icon: <Star className="w-4 h-4" /> },
    { value: "winner", label: "Who won that?", icon: <Trophy className="w-4 h-4" /> }
  ];

  const generateTrainingQuiz = async () => {
    if (!selectedSport) {
      alert("Please select a sport first!");
      return;
    }

    setIsLoading(true);
    try {
      let prompt = `make a quiz for ${selectedSport} for level ${selectedLevel}`;
      
      // Add specific question type focus
      if (selectedQuestionType !== "mixed") {
        switch (selectedQuestionType) {
          case "who":
            prompt += " focusing heavily on 'WHO IS THIS PLAYER/COACH/LEGEND?' questions with specific achievements, stats, or memorable moments";
            break;
          case "where":
            prompt += " focusing heavily on 'WHERE WAS THIS TOURNAMENT/CUP/CHAMPIONSHIP HELD?' questions with specific venues, cities, and years";
            break;
          case "when":
            prompt += " focusing heavily on 'WHEN DID THIS HISTORIC MOMENT HAPPEN?' questions with specific dates and historical context";
            break;
          case "trophy":
            prompt += " focusing heavily on 'WHICH TROPHY/CUP IS THIS?' questions based on tournament characteristics, winners, and unique features";
            break;
          case "better":
            prompt += " focusing heavily on 'WHO IS BETTER?' questions comparing players or teams with specific achievements and statistics";
            break;
          case "winner":
            prompt += " focusing heavily on 'WHO WON THAT?' questions about specific matches, tournaments, or championships with clear outcomes";
            break;
        }
      }

      const response = await axios.post("http://localhost:8000/ai-quiz", prompt);
      setQuestions(response.data);
      setCurrentQuestionIndex(0);
      setScore(0);
      setTimeLeft(30);
      setIsTrainingActive(true);
      setShowExplanation(false);
      setSelectedAnswer(null);
    } catch (error) {
      console.error("Error generating quiz:", error);
      alert("Failed to generate quiz. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (answerLabel: string) => {
    if (selectedAnswer || showExplanation) return;
    
    setSelectedAnswer(answerLabel);
    setShowExplanation(true);
    
    const currentQuestion = questions[currentQuestionIndex];
    if (answerLabel === currentQuestion.correctAnswer) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setTimeLeft(30);
    } else {
      // Training completed
      const finalScore = selectedAnswer === questions[currentQuestionIndex].correctAnswer ? score + 1 : score;
      setTrainingStats(prev => ({
        totalQuestions: prev.totalQuestions + questions.length,
        correctAnswers: prev.correctAnswers + finalScore,
        averageTime: prev.averageTime, // Could calculate actual average time
        bestSport: selectedSport,
        bestLevel: selectedLevel
      }));
      setIsTrainingActive(false);
    }
  };

  const resetTraining = () => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setScore(0);
    setTimeLeft(30);
    setIsTrainingActive(false);
    setShowExplanation(false);
    setSelectedAnswer(null);
  };

  // Timer effect
  useEffect(() => {
    if (isTrainingActive && !showExplanation && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showExplanation) {
      setShowExplanation(true);
    }
  }, [timeLeft, isTrainingActive, showExplanation]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header user={user} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Sports Training Center
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Practice with AI-generated sports quizzes focusing on traditional sports knowledge
            </p>
          </div>

          {!isTrainingActive ? (
            <div className="grid gap-6">
              {/* Training Setup */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-6 h-6 text-orange-500" />
                    Training Setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="sport">Select Sport</Label>
                      <Select value={selectedSport} onValueChange={setSelectedSport}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose sport" />
                        </SelectTrigger>
                        <SelectContent>
                          {sports.map((sport) => (
                            <SelectItem key={sport.value} value={sport.value}>
                              <div className="flex items-center gap-2">
                                {sport.icon}
                                {sport.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="level">Difficulty Level</Label>
                      <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose level" />
                        </SelectTrigger>
                        <SelectContent>
                          {levels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${level.color}`}></div>
                                {level.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Question Type Focus</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {questionTypes.map((type) => (
                        <Button
                          key={type.value}
                          variant={selectedQuestionType === type.value ? "default" : "outline"}
                          className="flex items-center gap-2"
                          onClick={() => setSelectedQuestionType(type.value)}
                        >
                          {type.icon}
                          {type.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={generateTrainingQuiz} 
                    disabled={isLoading || !selectedSport}
                    className="w-full"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating Quiz...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Start Training
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Training Stats */}
              {trainingStats.totalQuestions > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-6 h-6 text-orange-500" />
                      Your Training Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{trainingStats.totalQuestions}</div>
                        <div className="text-sm text-gray-600">Total Questions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{trainingStats.correctAnswers}</div>
                        <div className="text-sm text-gray-600">Correct Answers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {trainingStats.totalQuestions > 0 
                            ? Math.round((trainingStats.correctAnswers / trainingStats.totalQuestions) * 100)
                            : 0}%
                        </div>
                        <div className="text-sm text-gray-600">Success Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{trainingStats.bestSport}</div>
                        <div className="text-sm text-gray-600">Best Sport</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* Training Session */
            <div className="space-y-6">
              {/* Progress Bar */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-gray-600">
                      {currentQuestionIndex + 1} of {questions.length}
                    </span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </CardContent>
              </Card>

              {/* Question Card */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeLeft}s
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Score: {score}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 ${
                          currentQuestion?.difficulty === 'EASY' ? 'text-green-600 border-green-600' :
                          currentQuestion?.difficulty === 'MEDIUM' ? 'text-yellow-600 border-yellow-600' :
                          'text-red-600 border-red-600'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          currentQuestion?.difficulty === 'EASY' ? 'bg-green-500' :
                          currentQuestion?.difficulty === 'MEDIUM' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></div>
                        {currentQuestion?.difficulty}
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={resetTraining}>
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-lg font-semibold p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {currentQuestion?.question}
                  </div>

                  <div className="grid gap-3">
                    {currentQuestion?.answers.map((answer) => (
                      <Button
                        key={answer.label}
                        variant={
                          selectedAnswer === answer.label
                            ? answer.label === currentQuestion.correctAnswer
                              ? "default"
                              : "destructive"
                            : showExplanation && answer.label === currentQuestion.correctAnswer
                            ? "default"
                            : "outline"
                        }
                        className="w-full h-auto min-h-[60px] p-4 text-left justify-start"
                        onClick={() => handleAnswerSelect(answer.label)}
                        disabled={showExplanation}
                      >
                        <div className="flex items-start gap-3 w-full">
                          <span className="font-bold text-sm flex-shrink-0">
                            {answer.label}.
                          </span>
                          <span className="text-sm leading-relaxed">{answer.text}</span>
                        </div>
                      </Button>
                    ))}
                  </div>

                  {showExplanation && (
                    <Button onClick={nextQuestion} className="w-full">
                      {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish Training"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 