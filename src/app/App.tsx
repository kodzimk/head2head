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
import { initialUser } from '../shared/interface/user'

import type { User } from '../shared/interface/user'
import { sendMessage } from '../shared/websockets/websocket'
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
  newSocket = createWebSocket(localStorage.getItem('username')?.replace(/"/g, '') || null); 
  

  useEffect(() => {
      newSocket = createWebSocket(localStorage.getItem('username')?.replace(/"/g, '') || null); 
  }, []);

  useEffect(() => {
    if (!newSocket) return;
    newSocket.onopen = () => {
        console.log("WebSocket connection established");
        sendMessage(user, "get_email");
    };

    newSocket.onclose = () => {
      console.log("WebSocket connection closed");
      reconnectTimeoutRef.current = setTimeout(() => {
        const username = localStorage.getItem('username')?.replace(/"/g, '');
        if (username) {
          console.log("Attempting to reconnect...");
          newSocket = createWebSocket(username);
        }
      }, 3000);
    };

    newSocket.onmessage = (event) => {
      console.log(event.data)
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
         };
         setUser(updatedUser);   
         localStorage.setItem('username', updatedUser.username);
       } else if (data.type === 'battle_started') {
         navigate(`/battle/${data.data.battle_id}/countdown`);
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
        navigate(`/battle/${data.data.battle_id}/result`);
       }
   }

  }, []);

  newSocket && (newSocket.onmessage = (event) => {
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
       };
       setUser(updatedUser);   
       localStorage.setItem('username', updatedUser.username);

     } else if (data.type === 'battle_started') {
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
      setCurrentQuestion(data.data);
     }
     else if(data.type === 'next_question'){
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
  });



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
              <Route path="/" element={<EntryPage user={user} />} />
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
              <Route path="/battle/:id/result" element={<BattleResultPage />} />
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
