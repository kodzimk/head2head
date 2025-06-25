import './globals.css'
import {Routes, Route, useNavigate} from 'react-router-dom'
import EntryPage from '../modules/entry-page/page'
import SignUpPage from '../modules/sign-up/sign-up'
import EmailSignUpPage from '../modules/sign-up/signup-email'
import SignInPage from '../modules/sign-in/sign-in'
import DashboardPage from '../modules/dashboard/dashboard'
import ProfilePage from '../modules/profile/profile'
import FriendsPage from '../modules/friends/friends'
import BattlesPage from '../modules/battle/battle'
import WaitingPage from '../modules/battle/waiting-room'
import { useState, useEffect } from 'react'

import { BattleStore, CurrentQuestionStore, GlobalStore, LoserStore, ResultStore, ScoreStore, TextStore, ThemeStore, WinnerStore } from '../shared/interface/gloabL_var'
import { ViewProfile } from '../modules/profile/view-profile'
import LeaderboardPage from '../modules/leaderboard/leaderboard'
import SelectionPage from '../modules/selection/selection'
import TrainingsPage from '../modules/trainings/trainings'
import NotificationsPage from '../modules/notifications/notifications'
import AllBattlesPage from '../modules/dashboard/all-battles-page'
import { initialUser,type User } from '../shared/interface/user'
import type { Battle } from '../shared/interface/user'

import {sendMessage } from '../shared/websockets/websocket'
import QuizQuestionPage from '../modules/battle/quiz-question'
import BattleCountdown from '../modules/battle/countdown'
import BattleResultPage from '../modules/battle/result'
import TrainingPage from '../modules/trainings/trainings'
import NotFoundPage from '../modules/entry-page/not-found'

export let newSocket: WebSocket | null = null;
let isManualReload = false; // Track if user manually reloaded
let isInitialConnection = true;

export const createWebSocket = (username: string | null) => {
  if (!username) return null;
  
  const ws = new WebSocket(`wss://api.head2head.dev/ws?username=${encodeURIComponent(username)}`);
  
  ws.onerror = (event: WebSocketEventMap['error']) => {
    console.error("WebSocket error:", event);
  };
  
  return ws;
};

export const reconnectWebSocket = () => {
  const username = localStorage.getItem('username')?.replace(/"/g, '');
  if (username) {
    // Close existing connection if it exists
    if (newSocket) {
      newSocket.close();
    }
    // Create new connection
    newSocket = createWebSocket(username);
    if (newSocket) {
      newSocket.onopen = () => {
        // Send initial message to get user data
        const user = {
          username: username,
          email: '',
          wins: 0,
          favoritesSport: '',
          rank: 0,
          winRate: 0,
          totalBattles: 0,
          streak: 0,
          password: '',
          friends: [],
          friendRequests: [],
          avatar: '',
          battles: [],
          invitations: []
        };
        sendMessage(user, "get_email");
      };
      newSocket.onerror = (error) => {
        console.error("WebSocket reconnection error:", error);
      };
      newSocket.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
      };
    }
  }
  return newSocket;
};

// Function to initialize websocket for new user (sign up/sign in)
export const initializeWebSocketForNewUser = (username: string) => {
  console.log("Initializing WebSocket for new user:", username);
  if (newSocket) {
    console.log("Closing existing WebSocket connection");
    newSocket.close();
  }
  newSocket = createWebSocket(username);
  
  // Don't send get_email immediately - the user data is already updated
  // The WebSocket will connect and be ready for other messages
  console.log("WebSocket initialized for username:", username);
  return newSocket;
};

export let refreshView = false;

export default function App() {
  const [user, setUser] = useState<User>(initialUser)
  const [theme, setTheme] = useState<boolean>(false)
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [firstOpponentScore, setFirstOpponentScore] = useState<number>(0);
  const [secondOpponentScore, setSecondOpponentScore] = useState<number>(0);
  const [winner, setWinner] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [loser, setLoser] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [battle, setBattle] = useState<Battle[]>([]);
  const navigate = useNavigate()

  // Handle manual page reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      isManualReload = true;
    };

    const handleLoad = () => {
      if (isManualReload) {
        const username = localStorage.getItem('username')?.replace(/"/g, '');
        if (username && !newSocket) {
          console.log("Manual page reload detected, creating new websocket connection");
          isInitialConnection = true; // Reset flag for manual reload
          newSocket = createWebSocket(username);
        }
        isManualReload = false;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('load', handleLoad);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  // Only create websocket on initial load if user exists
  useEffect(() => {
    const username = localStorage.getItem('username')?.replace(/"/g, '');
    if (username && !newSocket) {
      console.log("Initial websocket connection for existing user");
      isInitialConnection = true; // Set flag for initial connection
      newSocket = createWebSocket(username);
    }
  }, []);

  useEffect(() => {
    if (!newSocket) return;

    newSocket.onopen = () => {  
      console.log("WebSocket connected successfully");
      // Only send get_email on initial connection, not on reconnections
      if (isInitialConnection) {
        sendMessage(user, "get_email");
        isInitialConnection = false;
      }
    };

    newSocket.onclose = (event) => {
      console.log("WebSocket disconnected:", event.code, event.reason);
      
      // Handle invalid username error
      if (event.code === 4000 && event.reason === "Invalid username") {
        console.error("WebSocket connection failed due to invalid username");
        // Clear the invalid username from localStorage
        localStorage.removeItem('username');
        // Redirect to sign-in page
        navigate('/sign-in');
        return;
      }
      
      // Don't automatically reconnect - only reconnect on manual reload or user change
    };

    newSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    newSocket.onmessage = (event) => {
       try {       
         const data = JSON.parse(event.data);
         console.log("WebSocket message received:", data); // Debug logging
         
         if (data.type === 'user_updated') {
           const updatedUser = {
             email: data.data.email,
             username: data.data.username,
             wins: data.data.winBattle,
             favoritesSport: data.data.favourite,
             rank: data.data.ranking,
             winRate: data.data.winRate,
             totalBattles: data.data.totalBattle,
             streak: data.data.streak,
             password: data.data.password,
             friends: data.data.friends,
             friendRequests: data.data.friendRequests,
             avatar: data.data.avatar,
             battles: data.data.battles,
             invitations: data.data.invitations
           };
           
           // Log username changes for debugging
           if (user.username !== updatedUser.username) {
             console.log(`Username changed from "${user.username}" to "${updatedUser.username}"`);
           }
           
           setUser(updatedUser);   
           localStorage.setItem('username', updatedUser.username);
         } else if (data.type === 'battle_started') {
           navigate(`/battle/${data.data}/countdown`);
         } 
         else if (data.type === 'battle_removed') {
          console.log("Battle removed:", data.data); // Debug logging
          setBattle(prev => {
            const newBattles = prev.filter(battle => battle.id !== data.data);
            console.log("Battles after removal:", newBattles); // Debug logging
            return newBattles;
          });
         }
         else if (data.type === 'battle_created_response') {
          console.log("Battle created response received:", data); // Debug logging
          setBattle(prev => {
            const newBattles = [...prev, data.data];
            return newBattles;
          });
          console.log("Navigating to waiting room:", `/waiting/${data.data.id}`); // Debug logging
          navigate(`/waiting/${data.data.id}`);
         }
         else if (data.type === 'battle_created') {
          setBattle(prev => {
            const newBattles = [...prev, data.data];
            return newBattles;
          });
         }
         else if(data.type === 'friend_request_updated'){
           const updatedUser = {
             email: data.data.email,
             username: data.data.username,
             wins: data.data.winBattle,
             favoritesSport: data.data.favourite,
             rank: data.data.ranking,
             winRate: data.data.winRate,
             totalBattles: data.data.totalBattle,
             streak: data.data.streak,
             password: data.data.password,
             friends: data.data.friends,
             friendRequests: data.data.friendRequests,
             avatar: data.data.avatar,
             battles: data.data.battles,
             invitations: data.data.invitations
           };
           setUser(updatedUser); 
           refreshView = !refreshView;
         }
         else if(data.type === 'battle_start'){
  
          setCurrentQuestion(data.data);
         }
         else if(data.type === 'next_question'){ 
          // Ensure we have valid question data before setting it
          console.log("[WebSocket] Received next_question event:", data);
          if (data.data && data.data.question) {
            console.log("[WebSocket] Setting current question:", data.data.question);
            setCurrentQuestion(data.data.question);
          } else {
            console.error("[WebSocket] Invalid question data received:", data.data);
          }
    
          if(data.data.first_opponent_name === user.username){
            setFirstOpponentScore(data.data.first_opponent);
            setSecondOpponentScore(data.data.second_opponent);
          }
          else{
            setFirstOpponentScore(data.data.second_opponent);
            setSecondOpponentScore(data.data.first_opponent);
          }
         }
         else if(data.type === 'score_updated'){
          if(data.data.first_opponent_name === user.username){
            setFirstOpponentScore(data.data.first_opponent);
            setSecondOpponentScore(data.data.second_opponent);
          }
          else{
            setFirstOpponentScore(data.data.second_opponent);
            setSecondOpponentScore(data.data.first_opponent);
          }
         }
         else if(data.type === 'battle_finished'){
          if(data.data.text === 'draw'){
            setResult('draw');
          } else if (data.data.winner === user.username) {
            setResult('win');
          } else if (data.data.loser === user.username) {
            setResult('lose');
          } else {
            setResult('');
          }

          setCurrentQuestion(data.data.questions);
          setLoser(data.data.loser);
          setWinner(data.data.winner);
          setText(data.data.text);
          navigate(`/battle/${data.data.battle_id}/result`);
         }
         else if(data.type === 'waiting_battles'){
           console.log("Received waiting battles:", data.data); // Debug logging
           setBattle(data.data);
         }
         else if(data.type === 'battle_cancelled'){
           // Battle was successfully cancelled
           console.log("Battle cancelled successfully:", data.data);
         }
         else if(data.type === 'invitation_error'){
           // Show error message when invitation cannot be accepted
           alert(data.data.message || "Unable to accept invitation");
         }
         else if(data.type === 'waiting_room_inactivity'){
           // Redirect to battle page when waiting battle is removed due to inactivity
           alert(data.data.message || "You were inactive in the waiting room");
           navigate('/battles');
         }
         else if(data.type === 'error'){
           // Show error message to user
           alert(data.message || "An error occurred");
         }
         else if(data.type === 'quiz_generating'){
           // Show loading state for quiz generation
           console.log("Quiz generation started for battle:", data.data.battle_id);
           // You can add a loading state here if needed
         }
         else if(data.type === 'quiz_ready'){
           // Quiz is ready, questions are available
           console.log("Quiz ready for battle:", data.data.battle_id);
           console.log("Questions received:", data.data.questions);
           // Store the questions in the battle object or global state
           // The questions will be used when the battle starts
         }
         else if(data.type === 'quiz_error'){
           // Show error message for quiz generation failure
           console.error("Quiz generation failed:", data.data.message);
           alert("Failed to generate quiz questions. Please try again.");
         }
       } catch (error) {
         console.error("Error processing websocket message:", error);
       }
   }

  }, [newSocket, navigate, user.username]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (

      <GlobalStore.Provider value={{user, setUser: (user: User) => setUser(user)}}>
        <ThemeStore.Provider value={{theme, setTheme: (theme: boolean) => setTheme(theme)}}>
          <CurrentQuestionStore.Provider value={{currentQuestion, setCurrentQuestion: (currentQuestion: any) => setCurrentQuestion(currentQuestion)}}>
          <ScoreStore.Provider value={{firstOpponentScore: firstOpponentScore, secondOpponentScore: secondOpponentScore, setFirstOpponentScore: (firstOpponentScore: number) => setFirstOpponentScore(firstOpponentScore), setSecondOpponentScore: (secondOpponentScore: number) => setSecondOpponentScore(secondOpponentScore)}}>
          <WinnerStore.Provider value={{winner, setWinner: (winner: string) => setWinner(winner)}}>
          <TextStore.Provider value={{text, setText: (text: string) => setText(text)}}>
          <LoserStore.Provider value={{loser, setLoser: (loser: string) => setLoser(loser)}}>
          <ResultStore.Provider value={{result, setResult: (result: string) => setResult(result)}}>
          <BattleStore.Provider value={{battle, setBattle: (battle: Battle[]) => setBattle(battle)}}>
            <div className={theme ? 'dark' : ''}>
            <Routes>
            <Route path='/training' element={<TrainingPage />} />
              <Route path="/" element={<EntryPage />} />
              <Route path="/sign-up" element={<SignUpPage />} />
              <Route path="/signup-email" element={<EmailSignUpPage />} />
              <Route path="/sign-in" element={<SignInPage />} />
              <Route path="/:username" element={<DashboardPage />} ></Route>
              <Route path="/:username/profile" element={<ProfilePage />} />
              <Route path="/:username/friends" element={<FriendsPage user={user} />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:username" element={<ViewProfile user={user} />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/selection" element={<SelectionPage />} />
              <Route path="/:username/trainings" element={<TrainingsPage />} />
              <Route path="/:username/notifications" element={<NotificationsPage />} />
              <Route path="/battles" element={<BattlesPage />} />
              <Route path="/waiting/:id" element={<WaitingPage />} />
              <Route path="/battle/:id/quiz" element={<QuizQuestionPage />} />
              <Route path="/battle/:id/countdown" element={<BattleCountdown />} />
              <Route path="/battle/:id/result" element={<BattleResultPage user={user} />} />
              <Route path="/:username/all-battles" element={<AllBattlesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
          </BattleStore.Provider>
          </ResultStore.Provider>
          </LoserStore.Provider>
          </TextStore.Provider>
          </WinnerStore.Provider>
          </ScoreStore.Provider>
          </CurrentQuestionStore.Provider>
        </ThemeStore.Provider>
      </GlobalStore.Provider>
  )
}
