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

import { BattleStore, CurrentQuestionStore, GlobalStore, LoserStore, ResultStore, ScoreStore, TextStore, ThemeStore, WinnerStore, RefreshViewStore, useRefreshViewStore } from '../shared/interface/gloabL_var'
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
  const {refreshView, setRefreshView} = useRefreshViewStore()
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
           setRefreshView(true)
           console.log("User state updated with user changes", refreshView)
         }
         else if (data.type === 'friend_request_updated') {
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
           setRefreshView(true)
           console.log("User state updated with friend request changes", refreshView)
         }
         else if (data.type === 'stats_reset') {
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
           setRefreshView(true)
           console.log("User state updated with stats reset", refreshView)
         }
         // Only keep non-battle, non-creation logic below
         else if(data.type === 'waiting_battles'){
           setBattle(data.data);
         }
         else if(data.type === 'battle_created'){
           // Add the new battle to the existing list
           setBattle(prevBattles => {
             // Check if battle already exists to avoid duplicates
             const battleExists = prevBattles.some(b => b.id === data.data.id);
             if (!battleExists) {
               return [...prevBattles, data.data];
             }
             return prevBattles;
           });
         }
         else if(data.type === 'battle_removed'){
           // Remove the battle from the list
           setBattle(prevBattles => {
             const filteredBattles = prevBattles.filter(b => b.id !== data.data);
             return filteredBattles;
           });
         }
         else if(data.type === 'battle_joined'){
           // Remove the battle from the waiting list since it's no longer waiting
           setBattle(prevBattles => {
             const filteredBattles = prevBattles.filter(b => b.id !== data.data.battle_id);
             return filteredBattles;
           });
         }
         else if(data.type === 'battle_started'){
           // Redirect to countdown page for the battle
           navigate(`/battle/${data.data}/countdown`);
         }
         else if(data.type === 'battle_cancelled'){
           // Battle was successfully cancelled
           // Clear active battle if it was cancelled
           if (activeBattleId === data.data) {
             setActiveBattleId(null);
           }
         }
         else if(data.type === 'invitation_error'){
           // Show error message when invitation cannot be accepted
           alert(data.data.message || "Unable to accept invitation");
         }
         else if(data.type === 'invitation_rejected'){
           console.log("App.tsx received invitation_rejected:", data.data)
           // Check if we're in a waiting room and need to update invited friends
           if (window.location.pathname.includes('/waiting/')) {
             console.log("Currently in waiting room, should update invited friends")
             // Extract battle ID from URL
             const pathParts = window.location.pathname.split('/')
             const battleId = pathParts[pathParts.length - 1]
             console.log("Battle ID from URL:", battleId)
             
             // Update localStorage for invited friends
             const currentInvitedFriends = localStorage.getItem(`invitedFriends_${battleId}`)
             if (currentInvitedFriends) {
               const invitedFriends = JSON.parse(currentInvitedFriends)
               const updatedInvitedFriends = invitedFriends.filter((friend: string) => friend !== data.data.rejected_by)
               localStorage.setItem(`invitedFriends_${battleId}`, JSON.stringify(updatedInvitedFriends))
               console.log("Updated invited friends in localStorage:", updatedInvitedFriends)
               
               // Dispatch custom event for waiting room to listen to
               window.dispatchEvent(new CustomEvent('invitationRejected', {
                 detail: {
                   battleId: battleId,
                   rejectedBy: data.data.rejected_by,
                   updatedInvitedFriends: updatedInvitedFriends
                 }
               }))
             }
           }
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
          <RefreshViewStore.Provider value={{refreshView, setRefreshView: (view: boolean) => setRefreshView(view)}}>
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
          </RefreshViewStore.Provider>
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
