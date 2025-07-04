import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { Button } from '../../shared/ui/button'
import { UserPlus, Users, ArrowLeft } from 'lucide-react'
import type { User } from '../../shared/interface/user'
import { initialUser } from '../../shared/interface/user'
import { sendFriendRequest, sendMessage } from '../../shared/websockets/websocket'
import { cancelFriendRequest } from '../../shared/websockets/websocket'
import { API_BASE_URL, useGlobalStore } from "../../shared/interface/gloabL_var"
import { newSocket } from '../../app/App'
import AvatarStorage from '../../shared/utils/avatar-storage'
import { UserAvatar } from '../../shared/ui/user-avatar'
import { useTranslation } from 'react-i18next'

export const ViewProfile = ({user}: {user: User}) => {
  const { t } = useTranslation()
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
        const persistentAvatar = await AvatarStorage.getAvatar(userData.username);
        if (persistentAvatar === null && userData.avatar) {
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
        setAreFriends(user.friends.includes(response.data.username))
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
    const loadViewUserAvatar = async () => {
      if (viewUser?.username) {
        const persistentAvatar = await AvatarStorage.getAvatar(viewUser.username);
        if (persistentAvatar) {
          console.log('[ViewProfile] Found persistent avatar for', viewUser.username);
          // Just mark that the user has a persistent avatar, don't store base64
          if (!viewUser.avatar || !viewUser.avatar.includes('persistent_')) {
            setViewUser({ ...viewUser, avatar: `persistent_${viewUser.username}` });
          }
        }
      }
    };

    loadViewUserAvatar();
  }, [viewUser?.username, setViewUser])

  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'user_updated' && data.data) {
          const updatedUserData = data.data
          
          // Update current user's data if it's the current user (compare by email)
          if (updatedUserData.email === user.email) {
            
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
            
            // Check if the viewed user is now a friend
            setAreFriends(updatedUserData.friends.includes(viewUser.username))
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
          
          // Update current user's data if it's the current user (compare by email)
          if (updatedUserData.email === user.email) {
            
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
            
            // Check if the viewed user is now a friend
            setAreFriends(updatedUserData.friends.includes(viewUser.username))
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('profile.view.back')}
        </Button>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t('profile.view.loading')}</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive">{t('profile.view.error')}</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {/* Profile Header */}
            <div className="flex items-center gap-6">
              <UserAvatar
                user={{ username: viewUser.username, avatar: viewUser.avatar }}
                size="2xl"
                className="w-24 h-24 text-4xl"
              />
              <div>
                <h1 className="text-2xl font-bold">{viewUser.username}</h1>
                <p className="text-muted-foreground">{viewUser.favoritesSport}</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="p-4 rounded-lg bg-card border text-center">
                <div className="text-2xl font-bold">{viewUser.rank}</div>
                <div className="text-sm text-muted-foreground">{t('profile.view.stats.rank')}</div>
              </div>
              <div className="p-4 rounded-lg bg-card border text-center">
                <div className="text-2xl font-bold">{viewUser.wins}</div>
                <div className="text-sm text-muted-foreground">{t('profile.view.stats.wins')}</div>
              </div>
              <div className="p-4 rounded-lg bg-card border text-center">
                <div className="text-2xl font-bold">{viewUser.winRate}%</div>
                <div className="text-sm text-muted-foreground">{t('profile.view.stats.winRate')}</div>
              </div>
              <div className="p-4 rounded-lg bg-card border text-center">
                <div className="text-2xl font-bold">{viewUser.totalBattles}</div>
                <div className="text-sm text-muted-foreground">{t('profile.view.stats.totalBattles')}</div>
              </div>
              <div className="p-4 rounded-lg bg-card border text-center">
                <div className="text-2xl font-bold">{viewUser.streak}</div>
                <div className="text-sm text-muted-foreground">{t('profile.view.stats.streak')}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              {!areFriends ? (
                hasSentRequestToViewUser ? (
                  <Button
                    variant="outline"
                    onClick={handleCancelRequest}
                    className="flex-1"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {t('profile.view.actions.cancelRequest')}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSendRequest}
                    className="flex-1"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {t('profile.view.actions.sendRequest')}
                  </Button>
                )
              ) : (
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled
                >
                  <Users className="w-4 h-4 mr-2" />
                  {t('profile.view.actions.alreadyFriends')}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 