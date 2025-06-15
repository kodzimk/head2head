import './globals.css'
import {Routes, Route} from 'react-router-dom'
import EntryPage from '../modules/entry-page/page'
import SignUpPage from '../modules/sign-up/sign-up'
import EmailSignUpPage from '../modules/sign-up/signup-email'
import SignInPage from '../modules/sign-in/sign-in'
import DashboardPage from '../modules/dashboard/dashboard'
import ProfilePage from '../modules/profile/profile'
import FriendsPage from '../modules/friends/friends'
import { useState, useEffect } from 'react'
import type { User } from '../shared/interface/user'
import { GlobalStore, ThemeStore } from '../shared/interface/gloabL_var'
import axios from 'axios'
import { ViewProfile } from '../modules/profile/view-profile'
import LeaderboardPage from '../modules/leaderboard/leaderboard'
import SelectionPage from '../modules/selection/selection'
import TrainingsPage from '../modules/trainings/trainings'
import NotificationsPage from '../modules/notifications/notifications'

const initialUser: User = {
  email: "",
  username: "",
  avatar: "/placeholder.svg?height=100&width=100",
  rank: 1,
  winRate: 0,
  totalBattles: 0,
  wins: 0,
  streak: 0,
  favoritesSport: "Football",
  password: "",
  friends: [],
  friendRequests: [],
}

interface ApiUserData {
  email: string;
  username: string;
  totalBattle: number;
  winRate: number;
  ranking: number;
  winBattle: number;
  favourite: string;
  streak: number;
  password: string;
  friends: string[];
}

export default function App() {
  const [user, setUser] = useState<User>(initialUser)
  const [theme, setTheme] = useState<boolean>(false)

  useEffect(() => {
    const userEmail = localStorage.getItem("user")?.replace(/"/g, ''); // Remove any quotation marks
    if(userEmail){
      axios.get<ApiUserData>(`http://127.0.0.1:8000/db/get-user`, {
        params: { email: userEmail },
        headers: {
          'accept': 'application/json'
        },
        responseType: 'json'
      })
      .then((res) => {
        if (res.data) {
          // Transform API data to match User interface
          const userData: User = {
            email: res.data.email,
            username: res.data.username,
            avatar: '', // Default avatar
            wins: res.data.winBattle,
            favoritesSport: res.data.favourite,
            rank: res.data.ranking,
            winRate: res.data.winRate,
            totalBattles: res.data.totalBattle,
            streak: res.data.streak,
            password: res.data.password,
            friends: res.data.friends,
          };
          setUser(userData);
      
        }
      })
      .catch((error) => {
        console.error('Error fetching user data:', error);
      });
    }
  }, []);

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
        <div className={theme ? 'dark' : ''}>
          <Routes>
            <Route path="/" element={<EntryPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
            <Route path="/signup-email" element={<EmailSignUpPage />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/:username" element={<DashboardPage />} ></Route>
            <Route path="/:username/profile" element={<ProfilePage />} />
            <Route path="/:username/friends" element={<FriendsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:username" element={<ViewProfile />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/selection" element={<SelectionPage />} />
            <Route path="/:username/trainings" element={<TrainingsPage />} />
            <Route path="/:username/notifications" element={<NotificationsPage />} />
          </Routes>
        </div>
      </ThemeStore.Provider>
    </GlobalStore.Provider>
  )
}
