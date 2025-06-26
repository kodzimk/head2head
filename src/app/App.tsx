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
import { WS_BASE_URL } from "../shared/interface/gloabL_var";

export let newSocket: WebSocket | null = null;
let isManualReload = false; // Track if user manually reloaded
let isInitialConnection = true;

export const createWebSocket = (username: string | null) => {
  if (!username) return null;
  
  const ws = new WebSocket(`${WS_BASE_URL}/ws?username=${encodeURIComponent(username)}`);
  
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
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
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
        console.log("Sending initial get_email message");
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
         
         // Log specific battle-related messages for debugging
         if (data.type === 'battle_created' || data.type === 'battle_removed' || data.type === 'battle_joined') {
           console.log(`🎯 Battle event received: ${data.type}`, data.data);
         }
         
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
           }
           setUser(updatedUser)
         }
         else if (data.type === 'friend_request_updated') {
           console.log("Friend request updated:", data.data);
           // Update user state with the new data
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
           }
           setUser(updatedUser)
           console.log("User state updated with friend request changes");
         }
         // Only keep non-battle, non-creation logic below
         else if(data.type === 'waiting_battles'){
           console.log("Received waiting battles:", data.data); // Debug logging
           setBattle(data.data);
         }
         else if(data.type === 'battle_created'){
           console.log("Received battle created notification:", data.data); // Debug logging
           // Add the new battle to the existing list
           setBattle(prevBattles => {
             // Check if battle already exists to avoid duplicates
             const battleExists = prevBattles.some(b => b.id === data.data.id);
             if (!battleExists) {
               console.log("Adding new battle to list:", data.data);
               return [...prevBattles, data.data];
             }
             console.log("Battle already exists in list, skipping duplicate");
             return prevBattles;
           });
         }
         else if(data.type === 'battle_removed'){
           console.log("Received battle removed notification:", data.data); // Debug logging
           // Remove the battle from the list
           setBattle(prevBattles => {
             const filteredBattles = prevBattles.filter(b => b.id !== data.data);
             console.log("Removed battle from list, remaining battles:", filteredBattles.length);
             return filteredBattles;
           });
         }
         else if(data.type === 'battle_joined'){
           console.log("Received battle joined notification:", data.data); // Debug logging
           // Remove the battle from the waiting list since it's no longer waiting
           setBattle(prevBattles => {
             const filteredBattles = prevBattles.filter(b => b.id !== data.data.battle_id);
             console.log("Battle joined, removed from waiting list, remaining battles:", filteredBattles.length);
             return filteredBattles;
           });
         }
         else if(data.type === 'battle_started'){
           console.log("Received battle started notification:", data.data); // Debug logging
           // Redirect to countdown page for the battle
           navigate(`/battle/${data.data}/countdown`);
         }
         else if(data.type === 'battle_cancelled'){
           // Battle was successfully cancelled
           console.log("Battle cancelled successfully:", data.data);
           // Clear active battle if it was cancelled
           if (activeBattleId === data.data) {
             setActiveBattleId(null);
           }
         }
         else if(data.type === 'invitation_error'){
           // Show error message when invitation cannot be accepted
           alert(data.data.message || "Unable to accept invitation");
         }
         else if(data.type === 'waiting_room_inactivity'){
           // Redirect to battle page when waiting battle is removed due to inactivity
           alert(data.data.message || "You were inactive in the waiting room");
           setActiveBattleId(null); // Clear active battle
           navigate('/battles');
         }
         else if(data.type === 'error'){
           // Show error message to user
           console.error("WebSocket error received:", data.message);
           alert(data.message || "An error occurred");
         }
         else if(data.type === 'test_connection_response'){
           console.log("WebSocket connection test successful:", data.data);
         }
         // Remove all battle/quiz/battle creation message handling here
       } catch (error) {
         console.error("Error processing websocket message:", error);
       }
   }

  },
  [user, navigate, activeBattleId])

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
