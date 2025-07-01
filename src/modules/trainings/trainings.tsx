import { useState, useEffect } from "react";
import {useGlobalStore, API_BASE_URL } from "../../shared/interface/gloabL_var";
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

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  sport: string;
  level: string;
  userAnswer?: string;
  source: 'incorrect_answer' | 'sport_knowledge';
  originalQuestionId?: string;
}


export default function TrainingsPage() {
  const { user } = useGlobalStore();
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>("Flashcards");
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
  
  // Flashcard-specific state
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);
  const [isFlashcardMode, setIsFlashcardMode] = useState(false);

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
      value: "Flashcards",
      label: "Flashcards",
      description: "Study terms and learn from your battle mistakes",
      icon: <Brain className="w-5 h-5" /> 
    },
    { 
      value: "random", 
      label: "Random Questions", 
      description: "Fresh random questions from selected sport",
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
      const url = `${API_BASE_URL}/training/training-stats/${user.username}`;
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

      const url = `${API_BASE_URL}/training/incorrect-answers/${user.username}?${params}`;
      
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

      const url = `${API_BASE_URL}/training/generate-random-questions?${params}`;
      
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

      const response = await fetch(`${API_BASE_URL}/training/start-session?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const session = await response.json();
        setCurrentSession(session.session_id);
        
        // Prepare training questions based on type
        if (selectedQuestionType === 'Flashcards') {
          await prepareFlashcards();
          setIsFlashcardMode(true);
        } else if (selectedQuestionType === 'random') {
          await prepareRandomQuestions();
          setIsFlashcardMode(false);
        } else {
          // For mixed questions, you could generate new questions or use a different source
          await prepareMixedQuestions();
          setIsFlashcardMode(false);
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


  const generateAIQuestionsForPractice = async (count: number): Promise<TrainingQuestion[]> => {
    try {
      const params = new URLSearchParams();
      if (selectedSport && selectedSport !== "all") params.append('sport', selectedSport);
      params.append('level', selectedLevel !== "all" ? selectedLevel : "medium");
      params.append('count', count.toString());

      const url = `${API_BASE_URL}/training/generate-random-questions?${params}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const questions = data.questions || [];
        
        // Convert AI questions to training question format
        return questions.map((question: any) => ({
          question: question.question || question.text || '',
          answers: question.answers || [],
          correctAnswer: question.correctAnswer || question.correct_answer || '',
          sport: question.sport || selectedSport,
          level: question.level || selectedLevel
        }));
      } else {
        console.error("Failed to generate AI practice questions:", response.status);
        return [];
      }
    } catch (error) {
      console.error('Error generating AI practice questions:', error);
      return [];
    }
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

        const url = `${API_BASE_URL}/training/generate-random-questions?${params}`;
        
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
    
    // If we have mixed questions, use them. Otherwise, generate AI questions as fallback
    if (mixedQuestions.length > 0) {
      setTrainingQuestions(mixedQuestions);
    } else {
      // Generate AI questions as fallback when mixed generation fails
      const fallbackQuestions = await generateAIQuestionsForPractice(5);
      setTrainingQuestions(fallbackQuestions);
    }
  };

  const prepareFlashcards = async () => {
    let allFlashcards: Flashcard[] = [];

    // Create educational flashcards from battle mistakes if available
    if (incorrectAnswers.length > 0) {
      const flashcardsFromIncorrect: Flashcard[] = incorrectAnswers.slice(0, 8).map((answer) => {
        const term = createBattleSpecificTerm(answer);
        
        // Create a comprehensive educational definition
        const definition = createBattleMistakeDefinition(answer);
        
        return {
          id: answer.id,
          term: term,
          definition: definition,
          sport: answer.sport,
          level: answer.level,
          userAnswer: answer.user_answer,
          source: 'incorrect_answer' as const,
          originalQuestionId: answer.id
        };
      });
      
      allFlashcards.push(...flashcardsFromIncorrect);
    }

    // Generate AI-powered flashcards to supplement learning (fewer if we have battle mistakes)
    const aiCount = incorrectAnswers.length > 0 ? Math.max(2, 10 - incorrectAnswers.length) : 8;
    const aiGeneratedFlashcards = await generateAIFlashcards(aiCount);
    allFlashcards.push(...aiGeneratedFlashcards);
    
    // Prioritize battle mistakes, then shuffle the rest
    const battleMistakes = allFlashcards.filter(card => card.source === 'incorrect_answer');
    const aiCards = allFlashcards.filter(card => card.source === 'sport_knowledge');
    const shuffledAI = aiCards.sort(() => Math.random() - 0.5);
    
    // Combine: prioritize battle mistakes, then add AI cards
    const finalFlashcards = [...battleMistakes, ...shuffledAI].slice(0, 10);
    setFlashcards(finalFlashcards);
  };

  const createBattleMistakeDefinition = (answer: IncorrectAnswer): string => {
    // Create sports-specific terms and facts that are commonly asked in battles
    const correctAnswer = answer.correct_answer;
    const sport = answer.sport;
    
    // Create term-based definitions that focus on the key concept
    let definition = '';
    
    // Try to identify what type of sports fact this is
    if (isPlayerName(correctAnswer)) {
      definition = `🏆 PLAYER: ${correctAnswer}
      
🎯 SPORT: ${sport.charAt(0).toUpperCase() + sport.slice(1)}

❌ YOU ANSWERED: "${answer.user_answer}"

💡 REMEMBER: ${correctAnswer} is a key player in ${sport} - study top players and their achievements!`;
    } else if (isTeamName(correctAnswer)) {
      definition = `🏟️ TEAM: ${correctAnswer}
      
🎯 SPORT: ${sport.charAt(0).toUpperCase() + sport.slice(1)}

❌ YOU ANSWERED: "${answer.user_answer}"

💡 REMEMBER: ${correctAnswer} is an important team in ${sport} - learn major teams and their history!`;
    } else if (isRule(answer.question_text)) {
      definition = `📋 RULE: ${correctAnswer}
      
🎯 SPORT: ${sport.charAt(0).toUpperCase() + sport.slice(1)}

❌ YOU ANSWERED: "${answer.user_answer}"

💡 REMEMBER: This is a crucial ${sport} rule - master the key regulations!`;
    } else if (isTechnique(answer.question_text)) {
      definition = `⚡ TECHNIQUE: ${correctAnswer}
      
🎯 SPORT: ${sport.charAt(0).toUpperCase() + sport.slice(1)}

❌ YOU ANSWERED: "${answer.user_answer}"

💡 REMEMBER: ${correctAnswer} is an important technique in ${sport} - study game moves and skills!`;
    } else if (isRecord(answer.question_text)) {
      definition = `📊 RECORD/FACT: ${correctAnswer}
      
🎯 SPORT: ${sport.charAt(0).toUpperCase() + sport.slice(1)}

❌ YOU ANSWERED: "${answer.user_answer}"

💡 REMEMBER: Important ${sport} statistic - focus on records and achievements!`;
    } else {
      // Generic sports fact
      definition = `⭐ SPORTS FACT: ${correctAnswer}
      
🎯 SPORT: ${sport.charAt(0).toUpperCase() + sport.slice(1)}

❌ YOU ANSWERED: "${answer.user_answer}"

💡 REMEMBER: Key ${sport} knowledge - review essential facts and terminology!`;
    }
    
    return definition;
  };

  const isPlayerName = (answer: string): boolean => {
    // Check if answer looks like a player name (contains spaces, proper capitalization)
    return /^[A-Z][a-z]+(?: [A-Z][a-z]+)+$/.test(answer) || 
           /^[A-Z]\. [A-Z][a-z]+$/.test(answer) ||
           answer.split(' ').length >= 2;
  };

  const isTeamName = (answer: string): boolean => {
    // Check for common team indicators
    const teamKeywords = ['FC', 'United', 'City', 'Athletic', 'Club', 'Team', 'Lakers', 'Warriors', 'Bulls', 'Heat', 'Celtics'];
    return teamKeywords.some(keyword => answer.includes(keyword)) ||
           (answer.includes(' ') && !answer.includes('technique') && !answer.includes('rule'));
  };

  const isRule = (question: string): boolean => {
    const ruleKeywords = ['rule', 'regulation', 'law', 'penalty', 'foul', 'violation', 'illegal', 'allowed', 'permitted'];
    return ruleKeywords.some(keyword => question.toLowerCase().includes(keyword));
  };

  const isTechnique = (question: string): boolean => {
    const techniqueKeywords = ['technique', 'move', 'skill', 'dribble', 'pass', 'shot', 'serve', 'block', 'tackle', 'kick'];
    return techniqueKeywords.some(keyword => question.toLowerCase().includes(keyword));
  };

  const isRecord = (question: string): boolean => {
    const recordKeywords = ['record', 'most', 'highest', 'fastest', 'winner', 'champion', 'title', 'world cup', 'olympics', 'scored'];
    return recordKeywords.some(keyword => question.toLowerCase().includes(keyword));
  };

  const createBattleSpecificTerm = (answer: IncorrectAnswer): string => {
    const correctAnswer = answer.correct_answer;
    const question = answer.question_text.toLowerCase();
    const sport = answer.sport;

    // Create specific terms based on the type of battle question
    if (isPlayerName(correctAnswer)) {
      return correctAnswer; // Use player name directly
    } else if (isTeamName(correctAnswer)) {
      return correctAnswer; // Use team name directly
    } else if (isRule(question)) {
      // Create rule-based terms
      if (question.includes('offside')) return 'Offside Rule';
      if (question.includes('foul')) return 'Foul Rule';
      if (question.includes('penalty')) return 'Penalty Rule';
      if (question.includes('yellow card')) return 'Yellow Card';
      if (question.includes('red card')) return 'Red Card';
      if (question.includes('handball')) return 'Handball Rule';
      if (question.includes('three-second')) return 'Three-Second Rule';
      if (question.includes('traveling')) return 'Traveling Violation';
      if (question.includes('double dribble')) return 'Double Dribble';
      return `${sport.charAt(0).toUpperCase() + sport.slice(1)} Rule`;
    } else if (isTechnique(question)) {
      // Create technique-based terms
      if (question.includes('dribble')) return 'Dribbling';
      if (question.includes('crossover')) return 'Crossover Dribble';
      if (question.includes('fadeaway')) return 'Fadeaway Shot';
      if (question.includes('free throw')) return 'Free Throw';
      if (question.includes('slam dunk')) return 'Slam Dunk';
      if (question.includes('three-pointer')) return 'Three-Pointer';
      if (question.includes('ace')) return 'Ace Serve';
      if (question.includes('smash')) return 'Smash Shot';
      if (question.includes('volley')) return 'Volley';
      if (question.includes('spike')) return 'Spike Attack';
      if (question.includes('tackle')) return 'Tackle Technique';
      return `${sport.charAt(0).toUpperCase() + sport.slice(1)} Technique`;
    } else if (isRecord(question)) {
      // Create record/achievement terms
      if (question.includes('world cup')) return 'World Cup Winner';
      if (question.includes('olympics')) return 'Olympic Champion';
      if (question.includes('champion')) return 'Championship Winner';
      if (question.includes('most goals')) return 'Goal Scoring Record';
      if (question.includes('most points')) return 'Point Scoring Record';
      if (question.includes('fastest')) return 'Speed Record';
      if (question.includes('longest')) return 'Distance Record';
      return `${sport.charAt(0).toUpperCase() + sport.slice(1)} Record`;
    } else {
      // Create sport-specific general terms
      const sportTerms = {
        football: ['Goal', 'Assist', 'Clean Sheet', 'Hat-trick', 'Derby'],
        basketball: ['Rebound', 'Assist', 'Block', 'Steal', 'Triple-Double'],
        tennis: ['Set', 'Game', 'Match Point', 'Break Point', 'Deuce'],
        cricket: ['Over', 'Wicket', 'Century', 'Six', 'Boundary'],
        baseball: ['Home Run', 'Strike', 'Ball', 'Inning', 'RBI'],
        volleyball: ['Set', 'Match', 'Rotation', 'Dig', 'Kill'],
        boxing: ['Round', 'Knockout', 'TKO', 'Jab', 'Uppercut']
      };

      const terms = sportTerms[sport as keyof typeof sportTerms] || ['Sports Fact'];
      
      // Try to match the correct answer with common terms
      for (const term of terms) {
        if (correctAnswer.toLowerCase().includes(term.toLowerCase()) || 
            question.includes(term.toLowerCase())) {
          return term;
        }
      }
      
      // If answer is short and looks like a term, use it
      if (correctAnswer.length <= 20 && !correctAnswer.includes(' ')) {
        return correctAnswer;
      }
      
      return `${sport.charAt(0).toUpperCase() + sport.slice(1)} Fact`;
    }
  };

  const generateAIFlashcards = async (count: number = 8): Promise<Flashcard[]> => {
    try {
      // Generate AI questions and convert them to flashcards
      const params = new URLSearchParams();
      if (selectedSport && selectedSport !== "all") params.append('sport', selectedSport);
      params.append('level', selectedLevel !== "all" ? selectedLevel : "medium");
      params.append('count', count.toString()); // Generate specified number of AI flashcards

      const url = `${API_BASE_URL}/training/generate-random-questions?${params}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const questions = data.questions || [];
        
        // Convert AI questions to flashcards
        return questions.map((question: any, index: number) => {
          const term = extractKeyTermFromAIQuestion(question);
          const definition = createDefinitionFromAIQuestion(question);
          
          return {
            id: `ai_generated_${index}`,
            term: term,
            definition: definition,
            sport: question.sport || selectedSport,
            level: question.level || selectedLevel,
            source: 'sport_knowledge' as const
          };
        });
      } else {
        console.error("Failed to generate AI flashcards:", response.status);
        return [];
      }
    } catch (error) {
      console.error('Error generating AI flashcards:', error);
      return [];
    }
  };

  const extractKeyTermFromAIQuestion = (question: any): string => {
    // Use the actual question text as the term for better learning
    const questionText = question.question || question.text || '';
    const sport = question.sport || selectedSport;
    
    if (!questionText) {
      return `${sport.charAt(0).toUpperCase() + sport.slice(1)} Question`;
    }
    
    // For most questions, use the full question as the term for battle-like practice
    const lowerQuestion = questionText.toLowerCase();
    
    // Handle specific question patterns that need cleaning
    if (lowerQuestion.includes('stand for') || lowerQuestion.includes('acronym')) {
      // Keep "what does X stand for" questions as-is - these are perfect battle questions
      return questionText;
    } else if (lowerQuestion.includes('nickname') && lowerQuestion.includes('who')) {
      // Keep nickname questions as-is
      return questionText;
    } else if (lowerQuestion.includes('who won') || lowerQuestion.includes('winner of')) {
      // Keep winner questions as-is
      return questionText;
    } else if (lowerQuestion.includes('which team') || lowerQuestion.includes('which club')) {
      // Keep team questions as-is
      return questionText;
    } else if (lowerQuestion.includes('how many') || lowerQuestion.includes('what is the record')) {
      // Keep record questions as-is
      return questionText;
    } else if (lowerQuestion.includes('what year') || lowerQuestion.includes('when did')) {
      // Keep year/date questions as-is
      return questionText;
    } else if (lowerQuestion.includes('what is') && lowerQuestion.includes('called')) {
      // Keep "what is called" questions as-is
      return questionText;
    } else if (lowerQuestion.includes('who is') && (lowerQuestion.includes('known as') || lowerQuestion.includes('nicknamed'))) {
      // Keep identity/nickname questions as-is
      return questionText;
    } else {
      // For other questions, use the full question text
      // This gives users practice with actual battle-style questions
      return questionText;
    }
  };

  const createDefinitionFromAIQuestion = (question: any): string => {
    // Create a meaningful definition that helps users learn
    const questionText = question.question || question.text || '';
    const correctAnswer = question.correctAnswer || question.correct_answer || '';
    
    if (questionText && correctAnswer) {
      // Extract the meaningful part of the question to help users understand
      let cleanQuestion = questionText
        .replace(/^(What|Which|Who|When|Where|How|Why)\s+/i, '')
        .replace(/\?$/, '')
        .replace(/^(is|are|was|were|has|have|had|do|does|did)\s+/i, '')
        .trim();
      
      // Make the first letter uppercase for better formatting
      if (cleanQuestion.length > 0) {
        cleanQuestion = cleanQuestion.charAt(0).toUpperCase() + cleanQuestion.slice(1);
      }
      
      // If the cleaned question is meaningful, use it as the description
      if (cleanQuestion.length > 3 && !cleanQuestion.toLowerCase().includes('answer')) {
        return `${cleanQuestion}: ${correctAnswer}`;
      } else {
        // Fallback to the original question format if cleaning didn't work well
        return `${questionText}: ${correctAnswer}`;
      }
    }
    
    return correctAnswer || 'Sports knowledge term';
  };




  const nextFlashcard = () => {
    if (currentFlashcardIndex < flashcards.length - 1) {
      setCurrentFlashcardIndex(currentFlashcardIndex + 1);
      setShowFlashcardAnswer(false);
    } else {
      // Flashcard session completed
      completeTrainingSession();
    }
  };

  const flipFlashcard = () => {
    setShowFlashcardAnswer(!showFlashcardAnswer);
  };

  const markFlashcardKnown = () => {
    // Optional: Track which flashcards user knows well
    nextFlashcard();
  };

  const markFlashcardNeedsReview = () => {
    // Optional: Mark for review later
    nextFlashcard();
  };

  const prepareRandomQuestions = async () => {
    // Generate random AI questions
    const randomQuestions = await generateRandomQuestions();
    
    if (randomQuestions.length > 0) {
      setTrainingQuestions(randomQuestions);
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

      const response = await fetch(`${API_BASE_URL}/training/submit-answer?${params}`, {
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

      const response = await fetch(`${API_BASE_URL}/training/submit-answer?${params}`, {
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
      const response = await fetch(`${API_BASE_URL}/training/complete-session/${currentSession}`, {
        method: 'POST'
      });

      if (response.ok) {
        // Reset state
        setIsTrainingActive(false);
        setCurrentSession(null);
        setTrainingQuestions([]);
        setCurrentQuestionIndex(0);
        
        // Reset flashcard state
        setFlashcards([]);
        setCurrentFlashcardIndex(0);
        setShowFlashcardAnswer(false);
        setIsFlashcardMode(false);
        
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
    const currentFlashcard = flashcards[currentFlashcardIndex];

  return (
    <div className="min-h-screen bg-background bg-gaming-pattern">
      <Header user={user} />
      <main className="container-gaming py-8">
        <div className="max-w-4xl mx-auto">
            {/* Training Header */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <h1 className="text-heading-2 text-foreground">
                  {isFlashcardMode ? 'Flashcard Training' : 'Training Session'}
                </h1>
                <p className="text-responsive-sm text-muted-foreground">
                  {isFlashcardMode 
                    ? `Flashcard ${currentFlashcardIndex + 1} of ${flashcards.length}`
                    : `Question ${currentQuestionIndex + 1} of ${trainingQuestions.length}`
                  }
                </p>
              </div>
            </div>

            {/* Timer and Controls - Only show for non-flashcard mode */}
            {!isFlashcardMode && (
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
            )}

            {/* Flashcard Display */}
            {isFlashcardMode && currentFlashcard && (
              <Card className="mb-4 sm:mb-6">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                    Sports Flashcard
                    <div className={`ml-auto px-2 py-1 rounded text-xs font-medium ${
                      currentFlashcard.source === 'incorrect_answer' 
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {currentFlashcard.source === 'incorrect_answer' ? 'Review' : 'Knowledge'}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="min-h-[200px] flex flex-col justify-center">
                    {!showFlashcardAnswer ? (
                      /* Front of flashcard - Term */
                      <div className="text-center space-y-4">
                        <div className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                          {currentFlashcard.term}
                        </div>
                        <Button 
                          onClick={flipFlashcard}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Show Definition
                        </Button>
                      </div>
                    ) : (
                      /* Back of flashcard - Definition */
                      <div className="text-center space-y-4">
                        <div className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                          {currentFlashcard.term}
                        </div>
                        <div className="text-sm sm:text-base text-muted-foreground bg-card p-4 rounded-lg border leading-relaxed">
                          {currentFlashcard.definition}
                        </div>
                        {currentFlashcard.source === 'incorrect_answer' && currentFlashcard.userAnswer && (
                          <div className="text-xs text-orange-600 dark:text-orange-400 italic mt-2">
                            This is based on a question you answered incorrectly in a previous battle
                          </div>
                        )}
                        <div className="flex gap-2 justify-center mt-6">
                          <Button 
                            onClick={markFlashcardNeedsReview}
                            variant="outline"
                            className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300"
                          >
                            Need Review
                          </Button>
                          <Button 
                            onClick={markFlashcardKnown}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Got It!
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Question Card - Only for non-flashcard mode */}
            {!isFlashcardMode && (
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
            )}
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