import { useEffect, useState } from 'react'
import {  useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { Button } from '../../shared/ui/button'
import { UserPlus, Home, Play, List, Trophy, BookOpen, Users, Bell, UserIcon, LogOut, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '../../shared/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../shared/ui/dropdown-menu'
import type { User } from '../../shared/interface/user'
import { initialUser } from '../../shared/interface/user'
import { sendFriendRequest, sendMessage } from '../../shared/websockets/websocket'
import { cancelFriendRequest } from '../../shared/websockets/websocket'
import { refreshView } from '../../app/App'

export const ViewProfile = ({user}: {user: User}) => {
  const { username } = useParams<{ username: string }>()
  const [isLoading, setIsLoading] = useState(true)
  const [error] = useState<string | null>(null)
  const [requestSent, setRequestSent] = useState(false)
  const navigate = useNavigate()
  const [viewUser, setViewUser] = useState<User>(initialUser)

  const handleSendRequest = async () => {
      sendFriendRequest(viewUser.username, user.username)
      setRequestSent(true)
  };

  const handleCancelRequest = async () => {
    cancelFriendRequest(viewUser, user.username)
    setRequestSent(false)
  };

  const handleBattle = async () => {
    navigate(`/battles`)
  }

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/db/get-user-by-username?username=${username}`)
        const userData = {
          ...initialUser,
          username: response.data.username,
          email: response.data.email,
          favoritesSport: response.data.favourite,
          rank: response.data.ranking,
          wins: response.data.winBattle,
          winRate: response.data.winRate,
          totalBattles: response.data.totalBattle,
          friendRequests: response.data.friendRequests,
          friends: response.data.friends,
          avatar: response.data.avatar ? `http://localhost:8000${response.data.avatar}` : undefined
        }
        
        setViewUser(userData)
        setRequestSent(response.data.friendRequests.includes(user.username))
        setIsLoading(false)
      } catch (error) {

        setIsLoading(false)
      }
    }
    
    if (username) {
      setTimeout(() => {
        sendMessage(user, "get_email")
        fetchUser()
      }, 100)
    }
  }, [username, user.username, refreshView])


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }
  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error || 'User not found'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
   <header className='bg-white dark:bg-gray-800 lg:px-12 p-4 py-4 flex items-center justify-between'>
  <ArrowLeft className='w-4 h-4' onClick={() => navigate(-1)} />
   <nav className="flex items-center gap-4">
        <div className="hidden lg:flex gap-6 items-center">
        <Link to={`/${user.username}`}>
            <Button variant="ghost" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100">
              <Home className="mr-2 h-4 w-4" />
              <span>Home</span>
            </Button>
          </Link>
        <Link to={`/battles`}>
            <Button variant="ghost" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100">
              <Play className="mr-2 h-4 w-4" />
              <span>Battle</span>
            </Button>
          </Link>
          <Link to={`/selection`}>
            <Button variant="ghost" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100">
              <List className="mr-2 h-4 w-4" />
              <span>Selection</span>
             
            </Button>
          </Link>
          <Link to={`/leaderboard`}>
            <Button variant="ghost" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100">
              <Trophy className="mr-2 h-4 w-4" />
              <span>Leaderboard</span>
             
            </Button>
          </Link>
          <Link to={`/${user.username}/trainings`}>
            <Button variant="ghost" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100">
              <BookOpen className="mr-2 h-4 w-4" />
              <span>Trainings</span>
          
            </Button>
          </Link>
          <Link to={`/${user.username}/friends`}>
            <Button variant="ghost" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100">
              <Users className="mr-2 h-4 w-4" />
              <span>Friends</span>
            </Button>
          </Link>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full hover:bg-slate-100"
            >
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                <AvatarImage
                  src={user.avatar || "/placeholder.svg"}
                  alt={user.username}
                />
                <AvatarFallback className="bg-orange-500 text-white">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-slate-900">
                  {viewUser.username}
                </p>
                <p className="text-xs leading-none text-slate-500">
                  #{viewUser.rank}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <div className="lg:hidden">
            <Link to={`/${user.username}`}>
            <DropdownMenuItem className="cursor-pointer">
              <Home className="mr-2 h-4 w-4" />
              <span>Home</span>
            </DropdownMenuItem>
          </Link>
            <Link to={`/battles`}>
                <DropdownMenuItem className="cursor-pointer">
                  <Play className="mr-2 h-4 w-4" />
                  <span>Battle</span>
                </DropdownMenuItem>
              </Link>
              <Link to={`/selection`}>
                <DropdownMenuItem className="cursor-pointer">
                  <List className="mr-2 h-4 w-4" />
                  <span>Selection</span>
                </DropdownMenuItem>
              </Link>
              <Link to={`/leaderboard`}>
                <DropdownMenuItem className="cursor-pointer">
                  <Trophy className="mr-2 h-4 w-4" />
                  <span>Leaderboard</span>
                </DropdownMenuItem>
              </Link>
              <Link to={`/${user.username}/trainings`}>
                <DropdownMenuItem className="cursor-pointer">
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Trainings</span>
                </DropdownMenuItem>
              </Link>
              <Link to={`/${user.username}/friends`}>
                <DropdownMenuItem className="cursor-pointer">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Friends</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
            </div>

            <Link to={`/${user.username}/notifications`}>
              <DropdownMenuItem className="cursor-pointer">
                <Bell className="mr-2 h-4 w-4" />
                <span>Notifications</span>
              </DropdownMenuItem>
            </Link>
            <Link to={`/${user.username}/profile`}>
              <DropdownMenuItem className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Manage Profile</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem
              onClick={() => {
                localStorage.removeItem("theme")
                localStorage.removeItem("access_token")
                navigate("/")
              }}
              className="cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>  
   </header>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative">
                  {viewUser.avatar ? (
                    <img
                      src={viewUser.avatar}
                      alt={`${viewUser.username}'s avatar`}
                      className="w-24 h-24 rounded-full object-cover border-4 border-orange-500"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-orange-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-orange-500">
                      {viewUser.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{viewUser.username}</h1>
                  <p className="text-gray-600 dark:text-gray-300">{viewUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Favorite Sport</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{viewUser.favoritesSport}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Rank</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">#{viewUser.rank}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Wins</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{viewUser.wins}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Win Rate</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{viewUser.winRate}%</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Streak</h3>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{viewUser.streak}</p>
                </div>
              </div>

              {viewUser.email !== user.email && (
                <div className="flex justify-center gap-4 mt-6">
                  {viewUser.friends && viewUser.friends.includes(user.username) && user.username !== '' ? (
                    <Button 
                      className="w-full sm:w-auto bg-orange-500 text-white  dark:text-black hover:bg-orange-600"
                      onClick={handleBattle}
                    >
                      Battle
                    </Button>
                  ) : !requestSent ? (
                    <Button 
                      onClick={handleSendRequest}
                      className="w-full sm:w-auto bg-orange-500 text-white hover:bg-orange-600"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Send Request
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleCancelRequest}
                      variant="outline"
                      className="w-full sm:w-auto border-orange-500 text-orange-500 hover:bg-orange-50 dark:text-orange-500 dark:border-orange-500"
                    >
                      Cancel Friend Request
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 