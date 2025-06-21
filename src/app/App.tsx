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
import { useState, useEffect, useRef } from 'react'

import { CurrentQuestionStore, GlobalStore, LoserStore, ResultStore, ScoreStore, TextStore, ThemeStore, WinnerStore } from '../shared/interface/gloabL_var'
import { ViewProfile } from '../modules/profile/view-profile'
import LeaderboardPage from '../modules/leaderboard/leaderboard'
import SelectionPage from '../modules/selection/selection'
import TrainingsPage from '../modules/trainings/trainings'
import NotificationsPage from '../modules/notifications/notifications'
import AllBattlesPage from '../modules/dashboard/all-battles-page'
import { initialUser } from '../shared/interface/user'

import type { User } from '../shared/interface/user'
import {sendMessage } from '../shared/websockets/websocket'
import QuizQuestionPage from '../modules/battle/quiz-question'
import BattleCountdown from '../modules/battle/countdown'
import BattleResultPage from '../modules/battle/result'

export let newSocket: WebSocket | null = null;

export const createWebSocket = (username: string | null) => {
  if (!username) return null;
  
  const ws = new WebSocket(`ws://127.0.0.1:8000/ws?username=${encodeURIComponent(username)}`);
  
  ws.onerror = (event: WebSocketEventMap['error']) => {
    console.error("WebSocket error:", event);
  };
  
  return ws;
};

export const reconnectWebSocket = () => {
  console.log("Reconnecting websocket...");
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
        console.log("WebSocket reconnected successfully");
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
        console.log("Reconnected WebSocket closed:", event.code, event.reason);
      };
    }
  }
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
  const navigate = useNavigate()
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetBattleStates = () => {
    console.log("Resetting all battle states...");
    // Reset all battle-related states
    setCurrentQuestion(null);
    setFirstOpponentScore(0);
    setSecondOpponentScore(0);
    setWinner('');
    setLoser('');
    setText('');
    setResult('');
  };

  useEffect(() => {
    const username = localStorage.getItem('username')?.replace(/"/g, '')
    if(username && !newSocket){
      console.log("Creating new WebSocket connection for:", username);
      newSocket = createWebSocket(username); 
    }
  }, [localStorage.getItem('username')?.replace(/"/g, '')]);

  useEffect(() => {
    if (!newSocket) return;
        newSocket.onopen = () => {
        console.log("WebSocket connection established for user:", user.username);
        sendMessage(user, "get_email");
    };

    newSocket.onclose = (event) => {
      console.log("WebSocket connection closed for user:", user.username, "Code:", event.code, "Reason:", event.reason);
      reconnectTimeoutRef.current = setTimeout(() => {
        const username = localStorage.getItem('username')?.replace(/"/g, '');
        if (username) {
          console.log("Attempting to reconnect for user:", username);
          newSocket = createWebSocket(username);
        }
      }, 3000);
    };

    newSocket.onerror = (error) => {
      console.error("WebSocket error for user:", user.username, error);
    };

    newSocket.onmessage = (event) => {
       try {
         console.log("WebSocket message received:", event.data);
         const data = JSON.parse(event.data);
         console.log("Parsed data:", data);
         
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
           setUser(updatedUser);   
           localStorage.setItem('username', updatedUser.username);
         } else if (data.type === 'battle_started') {
           console.log("Battle started, navigating to countdown with battle ID:", data.data);
           console.log("Current user:", user.username);
           console.log("WebSocket state:", newSocket?.readyState);
           navigate(`/battle/${data.data}/countdown`);
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
          console.log("Battle start message received, setting current question");
          setCurrentQuestion(data.data);
         }
         else if(data.type === 'next_question'){
          console.log("Next question message received");
          setCurrentQuestion(data.data.question);
    
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
          }
          else{
            setResult('win');
          }

          setCurrentQuestion(data.data.questions);
          setLoser(data.data.loser);
          setWinner(data.data.winner);
          setText(data.data.text);
          navigate(`/battle/${data.data.battle_id}/result`);
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
            <div className={theme ? 'dark' : ''}>
            <Routes>
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
            </Routes>
          </div>
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
