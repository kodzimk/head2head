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
import { useI18nLoading } from '../shared/hooks/use-i18n-loading'
import { useTranslation } from 'react-i18next'

import { BattleStore, CurrentQuestionStore, GlobalStore, LoserStore, ResultStore, ScoreStore, TextStore, ThemeStore, WinnerStore, useRefreshViewStore, OpponentStore } from '../shared/interface/gloabL_var'
import { ViewProfile } from '../modules/profile/view-profile'
import LeaderboardPage from '../modules/leaderboard/leaderboard'

import ForumPage from '../modules/forum/forum'
import NewsDetailPage from '../modules/news/news-detail'
import DebateDetailPage from '../modules/forum/debate-detail'
import CreateDebatePage from '../modules/forum/create-debate'
import TrainingsPage from '../modules/trainings/trainings'
import NotificationsPage from '../modules/notifications/notifications'
import AllBattlesPage from '../modules/dashboard/all-battles-page'
import { initialUser,type User } from '../shared/interface/user'
import type { Battle } from '../shared/interface/user'

import {sendMessage } from '../shared/websockets/websocket'
import QuizQuestionPage from '../modules/battle/quiz-question'
import BattleCountdown from '../modules/battle/countdown'
import BattleResultPage from '../modules/battle/result'
import NotFoundPage from '../modules/entry-page/not-found'
import { WS_BASE_URL } from "../shared/interface/gloabL_var";
import AvatarStorage from '../shared/utils/avatar-storage';
import { LanguageLoadingIndicator } from '../shared/ui/language-loading';
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

    }
  }
  return newSocket;
};

// Function to initialize websocket for new user (sign up/sign in)
export const initializeWebSocketForNewUser = (username: string) => {
  if (newSocket) {
    newSocket.close();
  }
  newSocket = createWebSocket(username);
  
  // Don't send get_email immediately - the user data is already updated
  // The WebSocket will connect and be ready for other messages
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
  const [opponentUsername, setOpponentUsername] = useState<string>('');
  const [opponentAvatar, setOpponentAvatar] = useState<string>('');
  const navigate = useNavigate()
  const {refreshView, setRefreshView} = useRefreshViewStore()
  const isLanguageLoading = useI18nLoading();
  const { i18n } = useTranslation();
  
  const setOpponent = (username: string, avatar: string) => {
    setOpponentUsername(username);
    setOpponentAvatar(avatar);
  };


  // Handle language changes for logged-in users
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      if (user && user.username && lng !== user.language) {
        // Update user's language preference
        const updatedUser = { ...user, language: lng };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, user, setUser]);


  // Handle manual page reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      isManualReload = true;
    };

    const handleLoad = () => {
      if (isManualReload) {
        const username = localStorage.getItem('username')?.replace(/"/g, '');
        if (username && !newSocket) {
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
      isInitialConnection = true; // Set flag for initial connection
      newSocket = createWebSocket(username);
    }
  }, []);

  useEffect(() => {
    if (!newSocket) return;

    newSocket.onopen = () => {  
      // Only send get_email on initial connection, not on reconnections
      if (isInitialConnection) {
        sendMessage(user, "get_email");
        isInitialConnection = false;
      }
    };

    newSocket.onclose = (event) => {
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
           const oldUsername = user.username;
           const newUsername = data.data.username;
           
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
             invitations: data.data.invitations,
             language: data.data.language || user.language || "en"
           }
           
           // Handle username change
           if (oldUsername !== newUsername && data.data.email === user.email) {
             console.log(`Username changed from "${oldUsername}" to "${newUsername}"`);
             // Update username in localStorage
             localStorage.setItem('username', newUsername);
             // Update avatar storage with new username
             AvatarStorage.migrateAvatar(oldUsername, newUsername);
             // Update avatar reference in user object if needed
             if (updatedUser.avatar && updatedUser.avatar.startsWith('persistent_')) {
               updatedUser.avatar = `persistent_${newUsername}`;
             }
             // Update user data in localStorage
             localStorage.setItem('user', JSON.stringify(updatedUser));
           } else if (data.data.email === user.email) {
             // Regular update for the current user
             localStorage.setItem('user', JSON.stringify(updatedUser));
           }
           
           setUser(updatedUser)
           setRefreshView(true)
           console.log("User state updated with user changes", refreshView)
         }
         else if (data.type === 'friend_request_updated') {
           // Only update if this is for the current user (compare by email since username might change)
           if (data.data.email === user.email) {
             const updatedUser = {
               email: data.data.email,
               username: data.data.username,
               nickname: data.data.username,
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
               invitations: data.data.invitations,
               language: data.data.language || user.language || "en"
             }
             setUser(updatedUser)
             localStorage.setItem('user', JSON.stringify(updatedUser))
             setRefreshView(true)
             console.log("User state updated with friend request changes", refreshView)
           }
         }
         else if (data.type === 'stats_reset') {
           // Only update if this is for the current user (compare by email since username might change)
           if (data.data.email === user.email) {
             const updatedUser = {
               email: data.data.email,
               username: data.data.username,
               nickname: data.data.username,
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
               invitations: data.data.invitations,
               language: data.data.language || user.language || "en"
             }
             setUser(updatedUser)
             localStorage.setItem('user', JSON.stringify(updatedUser))
             setRefreshView(true)
             console.log("User state updated with stats reset", refreshView)
           }
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
           navigate(`/${data.data}/countdown`);
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
           
           // Check if this is a battle not found error
           if (data.message && data.message.includes("Battle not found")) {
             console.log("Battle not found error detected, refreshing waiting battles list");
             // Dispatch custom event to refresh waiting battles
             window.dispatchEvent(new CustomEvent('refreshWaitingBattles'));
           } else {
             // Show alert for other errors
             alert(data.message || "An error occurred");
           }
         }
         else if(data.type === 'test_connection_response'){         
         }
         else if(data.type === 'battle_not_found'){
           // Battle was not found, refresh the waiting battles list
           console.log("Battle not found, refreshing waiting battles list");
           // Dispatch custom event to refresh waiting battles
           window.dispatchEvent(new CustomEvent('refreshWaitingBattles'));
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

  useEffect(() => {
    // Clean up any base64 avatar data in user localStorage on app start
    AvatarStorage.cleanupUserStorageData();
   
    // ... existing initialization code ...
  }, []);

  return (
    <>
      <GlobalStore.Provider value={{ user, setUser }}>
        <ThemeStore.Provider value={{ theme, setTheme }}>
          <CurrentQuestionStore.Provider value={{ currentQuestion, setCurrentQuestion }}>
            <ScoreStore.Provider value={{ firstOpponentScore, setFirstOpponentScore, secondOpponentScore, setSecondOpponentScore }}>
              <WinnerStore.Provider value={{ winner, setWinner }}>
                <TextStore.Provider value={{ text, setText }}>
                  <LoserStore.Provider value={{ loser, setLoser }}>
                    <ResultStore.Provider value={{ result, setResult }}>
                      <BattleStore.Provider value={{ battle, setBattle }}>
                        <OpponentStore.Provider value={{ opponentUsername, opponentAvatar, setOpponent, setOpponentUsername, setOpponentAvatar }}>
                          <div className={`min-h-screen ${theme ? 'dark' : ''}`}>
                            {isLanguageLoading && <LanguageLoadingIndicator />}
                            <Routes>
                              <Route path="/" element={<EntryPage />} />
                              <Route path="/sign-up" element={<SignUpPage />} />
                              <Route path="/sign-up/email" element={<EmailSignUpPage />} />
                              <Route path="/sign-in" element={<SignInPage />} />
                              <Route path="/:username" element={<DashboardPage />} />
                              <Route path="/:username/profile" element={<ProfilePage />} />
                              <Route path="/:username/friends" element={<FriendsPage user={user} />} />
                              <Route path="/battles" element={<BattlesPage />} />
                              <Route path="/waiting-room/:id" element={<WaitingPage />} />
                              <Route path="/view-profile/:username" element={<ViewProfile user={user} />} />
                              <Route path="/leaderboard" element={<LeaderboardPage />} />
                              <Route path="/forum" element={<ForumPage />} />
                              <Route path="/forum/debates/create" element={<CreateDebatePage />} />
                              <Route path="/forum/debates/:id" element={<DebateDetailPage />} />
                              <Route path="/news/:id" element={<NewsDetailPage />} />                              
                              <Route path="/:username/trainings" element={<TrainingsPage />} />
                              <Route path="/:username/notifications" element={<NotificationsPage />} />
                              <Route path="/:username/all-battles" element={<AllBattlesPage />} />
                              <Route path="/:id/quiz" element={<QuizQuestionPage />} />
                              <Route path="/:id/countdown" element={<BattleCountdown />} />
                              <Route path="/:id/battle-result" element={<BattleResultPage user={user} />} />
                              <Route path="*" element={<NotFoundPage />} />
                         
                            </Routes>
                          
                          </div>
                        </OpponentStore.Provider>
                      </BattleStore.Provider>
                    </ResultStore.Provider>
                  </LoserStore.Provider>
                </TextStore.Provider>
              </WinnerStore.Provider>
            </ScoreStore.Provider>
          </CurrentQuestionStore.Provider>
        </ThemeStore.Provider>
      </GlobalStore.Provider>
    </>
  )
}
