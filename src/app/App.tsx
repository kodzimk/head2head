import './globals.css'
import {Routes, Route} from 'react-router-dom'
import EntryPage from '../modules/entry-page/page'
import SignUpPage from '../modules/sign-up/sign-up'
import EmailSignUpPage from '../modules/sign-up/signup-email'
import SignInPage from '../modules/sign-in/sign-in'
import DashboardPage from '../modules/dashboard/dashboard'
import ProfilePage from '../modules/profile/profile'
import { useState } from 'react'
import type { User } from '../shared/interface/user'
import { GlobalStore } from '../shared/interface/gloabL_var'

const initialUser: User = {
  username: "",
  avatar: "/placeholder.svg?height=100&width=100",
  level: 1,
  rank: "#1",
  winRate: 0,
  totalBattles: 0,
  wins: 0,
  streak: 0,
  favoritesSport: "Football",
}

export default function App() {
  const [user, setUser] = useState<User>(initialUser)

  return (
    <GlobalStore.Provider value={{user, setUser}}>
      <Routes>
        <Route path="/" element={<EntryPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/signup-email" element={<EmailSignUpPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/dashboard" element={<DashboardPage user={user} />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </GlobalStore.Provider>
  )
}
