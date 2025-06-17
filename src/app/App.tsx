import './globals.css'
import {Routes, Route} from 'react-router-dom'
import EntryPage from '../modules/entry-page/page'
import SignUpPage from '../modules/sign-up/sign-up'
import EmailSignUpPage from '../modules/sign-up/signup-email'
import SignInPage from '../modules/sign-in/sign-in'
import DashboardPage from '../modules/dashboard/dashboard'
import ProfilePage from '../modules/profile/profile'
import FriendsPage from '../modules/friends/friends'
import BattlesPage from '../modules/battle/battle'
import { useState, useEffect } from 'react'

import { GlobalStore, ThemeStore } from '../shared/interface/gloabL_var'
import { ViewProfile } from '../modules/profile/view-profile'
import LeaderboardPage from '../modules/leaderboard/leaderboard'
import SelectionPage from '../modules/selection/selection'
import TrainingsPage from '../modules/trainings/trainings'
import NotificationsPage from '../modules/notifications/notifications'
import { initialUser } from '../shared/interface/user'

import type { User } from '../shared/interface/user'
import { sendMessage, websocket } from '../shared/websockets/websocket'

export default function App() {
  const [user, setUser] = useState<User>(initialUser)
  const [theme, setTheme] = useState<boolean>(false)

  useEffect(() => {
   
    websocket.onopen = () => {
      console.log("WebSocket connection established")
      sendMessage(user, "get_email")
    }
    websocket.onclose = () => {
       console.log("WebSocket connection closed")    
    }

    return () => {
      websocket.close()
    }
  }, []) 

  websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)    
      if (data.type === 'user_updated') {
        user.email = data.data.email
        user.username = data.data.username
        user.wins = data.data.winBattle
        user.favoritesSport = data.data.favourite
        user.rank = data.data.ranking
        user.winRate = data.data.winRate
        user.totalBattles = data.data.totalBattle
        user.streak = data.data.streak
        user.password = data.data.password
        user.friends = data.data.friends
        user.friendRequests = data.data.friendRequests
        user.avatar = data.data.avatar

        setUser({
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
          avatar: data.data.avatar
        })
      } 
  }


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
            <Route path="/" element={<EntryPage user={user} />} />
            <Route path="/sign-up" element={<SignUpPage />} />
            <Route path="/signup-email" element={<EmailSignUpPage />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/:username" element={<DashboardPage />} ></Route>
            <Route path="/:username/profile" element={<ProfilePage />} />
            <Route path="/:username/friends" element={<FriendsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:username" element={<ViewProfile user={user} />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/selection" element={<SelectionPage />} />
            <Route path="/:username/trainings" element={<TrainingsPage />} />
            <Route path="/:username/notifications" element={<NotificationsPage />} />
            <Route path="/battles" element={<BattlesPage />} />
          </Routes>
        </div>
      </ThemeStore.Provider>
    </GlobalStore.Provider>
  )
}
