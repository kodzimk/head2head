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
import { API_BASE_URL, useGlobalStore } from "../../shared/interface/gloabL_var"
import { newSocket } from '../../app/App'
import AvatarStorage from '../../shared/utils/avatar-storage'

export const ViewProfile = ({user}: {user: User}) => {
  const { username } = useParams<{ username: string }>()
  const [isLoading, setIsLoading] = useState(true)
  const [error] = useState<string | null>(null)
  const [,setRequestSent] = useState(false)
  const [hasSentRequestToViewUser, setHasSentRequestToViewUser] = useState(false)
  const navigate = useNavigate()
  const [viewUser, setViewUser] = useState<User>(initialUser)
  const { setUser } = useGlobalStore()
  const [areFriends, setAreFriends] = useState(false)

  const handleSendRequest = async () => {
      sendFriendRequest(viewUser.username, user.username)
      setRequestSent(true)
      setHasSentRequestToViewUser(true)
  };

  const handleCancelRequest = async () => {
    cancelFriendRequest(viewUser, user.username)
    setRequestSent(false)
    setHasSentRequestToViewUser(false)

  };

  const handleBattle = async () => {
    navigate(`/battles`)
  }

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/db/get-user-by-username?username=${username}`)
        const userData = {
          ...initialUser,
          username: response.data.username,
          email: response.data.email,
          favoritesSport: response.data.favourite,
          rank: response.data.ranking,
          wins: response.data.winBattle,
          winRate: response.data.winRate,
          totalBattles: response.data.totalBattle,
          streak: response.data.streak,
          friendRequests: response.data.friendRequests,
          friends: response.data.friends,
          avatar: response.data.avatar ? response.data.avatar : undefined
        }
        
        // Check for persistent avatar and cache server avatar if available
        const persistentAvatar = AvatarStorage.getAvatar(userData.username);
        if (!persistentAvatar && userData.avatar) {
          // Cache server avatar locally for faster future access
          try {
            const fullAvatarUrl = userData.avatar.startsWith('http') 
              ? userData.avatar 
              : `${API_BASE_URL}${userData.avatar}`;
            
            // Fetch and cache the server avatar
            const response = await fetch(fullAvatarUrl);
            if (response.ok) {
              const blob = await response.blob();
              const file = new File([blob], 'avatar.jpg', { type: blob.type });
              await AvatarStorage.saveAvatar(userData.username, file);
              console.log('[ViewProfile] Cached server avatar for', userData.username);
            }
          } catch (error) {
            console.warn('[ViewProfile] Failed to cache server avatar:', error);
          }
        }
        
        setViewUser(userData)
        setRequestSent(response.data.friendRequests.includes(user.username))
        setHasSentRequestToViewUser(user.friendRequests.includes(response.data.username))
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
  }, [username, user.username])

  // Load persistent avatar for the viewed user
  useEffect(() => {
    if (viewUser?.username) {
      const persistentAvatar = AvatarStorage.getAvatar(viewUser.username);
      if (persistentAvatar) {
        console.log('[ViewProfile] Found persistent avatar for', viewUser.username);
        // Just mark that the user has a persistent avatar, don't store base64
        if (!viewUser.avatar || !viewUser.avatar.includes('persistent_')) {
          setViewUser({ ...viewUser, avatar: `persistent_${viewUser.username}` });
        }
      }
    }
  }, [viewUser?.username, setViewUser])

  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'user_updated' && data.data) {
          const updatedUserData = data.data
          
          // Update current user's data if it's the current user
          if (updatedUserData.username === user.username) {
            
            // Update the global user state
            const updatedUser = {
              email: updatedUserData.email,
              username: updatedUserData.username,
              wins: updatedUserData.winBattle,
              favoritesSport: updatedUserData.favourite,
              rank: updatedUserData.ranking,
              winRate: updatedUserData.winRate,
              totalBattles: updatedUserData.totalBattle,
              streak: updatedUserData.streak,
              password: updatedUserData.password,
              friends: updatedUserData.friends,
              friendRequests: updatedUserData.friendRequests,
              avatar: updatedUserData.avatar,
              battles: updatedUserData.battles,
              invitations: updatedUserData.invitations
            }
            setUser(updatedUser)
          }
          
          // If the updated user is the viewed user, update the view
          if (updatedUserData.username === viewUser.username) {
            setViewUser(prev => ({
              ...prev,
              friends: updatedUserData.friends || [],
              friendRequests: updatedUserData.friendRequests || []
            }))
          }

          if(data.response_value === "accepted") {
            setRequestSent(false)
            setHasSentRequestToViewUser(false)
            setAreFriends(true)
          }
          if(data.response_value === "rejected") {
            setRequestSent(false)
            setHasSentRequestToViewUser(false)
            setAreFriends(false)
          }
        }
        
        if (data.type === 'friend_request_updated' && data.data) {
          const updatedUserData = data.data
          
          // Update current user's data if it's the current user
          if (updatedUserData.username === user.username) {
            
            // Update the global user state
            const updatedUser = {
              email: updatedUserData.email,
              username: updatedUserData.username,
              wins: updatedUserData.winBattle,
              favoritesSport: updatedUserData.favourite,
              rank: updatedUserData.ranking,
              winRate: updatedUserData.winRate,
              totalBattles: updatedUserData.totalBattle,
              streak: updatedUserData.streak,
              password: updatedUserData.password,
              friends: updatedUserData.friends,
              friendRequests: updatedUserData.friendRequests,
              avatar: updatedUserData.avatar,
              battles: updatedUserData.battles,
              invitations: updatedUserData.invitations
            }
            setUser(updatedUser)
          }
          
          // If the updated user is the viewed user, update the view
          if (updatedUserData.username === viewUser.username) {
            setViewUser(prev => ({
              ...prev,
              friends: updatedUserData.friends || [],
              friendRequests: updatedUserData.friendRequests || []
            }))
          }
        }
      } catch (error) {
        console.error('Error parsing websocket message:', error)
      }
    }

    if (newSocket) {
      newSocket.addEventListener('message', handleWebSocketMessage)
    }

    return () => {
      if (newSocket) {
        newSocket.removeEventListener('message', handleWebSocketMessage)
      }
    }
  }, [user.username, viewUser.username, setUser])


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background bg-gaming-pattern">
      
        <div className="container-gaming py-8">
          <div className="animate-pulse">
            <div className="h-32 bg-card rounded-lg mb-4 border"></div>
            <div className="h-4 bg-card rounded w-1/4 mb-4 border"></div>
            <div className="h-4 bg-card rounded w-1/2 border"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background bg-gaming-pattern">
        
        <div className="container-gaming py-8">
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error || 'User not found'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    
    <div className="min-h-screen bg-background bg-gaming-pattern">
   <header className='bg-card lg:px-12 p-4 py-4 flex items-center justify-between'>
  <ArrowLeft className='w-4 h-4' onClick={() => navigate(-1)} />
   <nav className="flex items-center gap-4">
        <div className="hidden lg:flex gap-6 items-center">
        <Link to={`/${user.username}`}>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-card">
              <Home className="mr-2 h-4 w-4" />
              <span>Home</span>
            </Button>
          </Link>
        <Link to={`/battles`}>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-card">
              <Play className="mr-2 h-4 w-4" />
              <span>Battle</span>
            </Button>
          </Link>
          <Link to={`/selection`}>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-card">
              <List className="mr-2 h-4 w-4" />
              <span>Selection</span>
             
            </Button>
          </Link>
          <Link to={`/leaderboard`}>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-card">
              <Trophy className="mr-2 h-4 w-4" />
              <span>Leaderboard</span>
             
            </Button>
          </Link>
          <Link to={`/${user.username}/trainings`}>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-card">
              <BookOpen className="mr-2 h-4 w-4" />
              <span>Trainings</span>
          
            </Button>
          </Link>
          <Link to={`/${user.username}/friends`}>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-card">
              <Users className="mr-2 h-4 w-4" />
              <span>Friends</span>
            </Button>
          </Link>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 sm:h-12 sm:w-12 md:h-10 md:w-12 rounded-full hover:bg-card"
            >
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 md:h-10 md:w-12">
                <AvatarImage
                  src={AvatarStorage.resolveAvatarUrl(user) || "/placeholder.svg"}
                  alt={user.username}
                  username={user.username}
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
                <p className="text-sm font-medium leading-none text-foreground">
                  {viewUser.username}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
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
      <div className="container-gaming py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-lg shadow-lg overflow-hidden border">
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative">
                  {viewUser.avatar ? (
                    <div 
                      className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-20 lg:w-20 lg:h-20 rounded-full overflow-hidden border-2 sm:border-3 md:border-4 lg:border-3 border-primary aspect-square"
                      style={{ clipPath: 'circle(50%)' }}
                    >
                      <img
                        src={AvatarStorage.resolveAvatarUrl(viewUser) || '/images/placeholder-user.jpg'}
                        alt={`${viewUser.username}'s avatar`}
                        className="w-full h-full object-cover object-center"
                        style={{ clipPath: 'circle(50%)' }}
                      />
                    </div>
                  ) : (
                    <div 
                      className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-20 lg:w-20 lg:h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg sm:text-xl md:text-2xl lg:text-xl font-bold border-2 sm:border-3 md:border-4 lg:border-3 border-primary aspect-square"
                      style={{ clipPath: 'circle(50%)' }}
                    >
                      {viewUser.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-heading-2 text-foreground">{viewUser.username}</h1>
                  <p className="text-muted-foreground">{viewUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-card p-4 rounded-lg border">
                  <h3 className="text-responsive-sm font-medium text-muted-foreground">Favorite Sport</h3>
                  <p className="mt-1 text-responsive-lg font-semibold text-foreground">{viewUser.favoritesSport}</p>
                </div>
                <div className="bg-card p-4 rounded-lg border">
                  <h3 className="text-responsive-sm font-medium text-muted-foreground">Rank</h3>
                  <p className="mt-1 text-responsive-lg font-semibold text-foreground">#{viewUser.rank}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-card p-4 rounded-lg text-center border">
                  <h3 className="text-responsive-sm font-medium text-muted-foreground">Wins</h3>
                  <p className="mt-1 text-responsive-lg font-semibold text-foreground">{viewUser.wins}</p>
                </div>
                <div className="bg-card p-4 rounded-lg text-center border">
                  <h3 className="text-responsive-sm font-medium text-muted-foreground">Win Rate</h3>
                  <p className="mt-1 text-responsive-lg font-semibold text-foreground">{viewUser.winRate}%</p>
                </div>
                <div className="bg-card p-4 rounded-lg text-center border">
                  <h3 className="text-responsive-sm font-medium text-muted-foreground">Streak</h3>
                    <p className="mt-1 text-responsive-lg font-semibold text-foreground">{viewUser.streak}</p>
                </div>
              </div>

              {viewUser.email !== user.email && (
                <div className="flex justify-center gap-4 mt-6">
                  {(() => {                     
                    if (areFriends) {
                      return (
                        <Button 
                          className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={handleBattle}
                        >
                          Battle
                        </Button>
                      );
                    } else if (hasSentRequestToViewUser) {
                      return (
                        <Button 
                          onClick={handleCancelRequest}
                          variant="outline"
                          className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10"
                        >
                          Cancel Request
                        </Button>
                      );
                    } else {
                      return (
                        <Button 
                          onClick={handleSendRequest}
                          className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Send Request
                        </Button>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 