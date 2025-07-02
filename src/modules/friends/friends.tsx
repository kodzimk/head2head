import { useState, useEffect } from 'react'
import { Button } from '../../shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card'
import { Input } from '../../shared/ui/input'
import { Search, UserMinus} from 'lucide-react'
import axios from 'axios'
import Header from '../dashboard/header'
import type { Friend, User } from "../../shared/interface/user"
import { useNavigate } from 'react-router-dom'
import { removeFriend } from '../../shared/websockets/websocket'
import { API_BASE_URL, useRefreshViewStore } from "../../shared/interface/gloabL_var"
import { newSocket } from "../../app/App"
import { UserAvatar } from "../../shared/ui/user-avatar"
import { useTranslation } from 'react-i18next'
import AvatarStorage from "../../shared/utils/avatar-storage"

export default function FriendsPage({user}: {user: User}) {
  const { t } = useTranslation()
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchResults, setSearchResults] = useState<Friend[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const navigate = useNavigate()
  const {refreshView} = useRefreshViewStore()
  const {setRefreshView} = useRefreshViewStore()
  // Function to fetch friend data with enhanced avatar caching
  const fetchFriendData = async (friendUsername: string): Promise<Friend> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/db/get-user-by-username?username=${friendUsername}`)
      
      // Enhanced avatar handling with caching
      let avatarUrl = null;
      if (response.data.avatar) {
        // Check for persistent avatar first
        const persistentAvatar = await AvatarStorage.getAvatar(friendUsername);
        if (persistentAvatar === null) {
          // Cache server avatar locally for faster future access
          try {
            const fullAvatarUrl = response.data.avatar.startsWith('http') 
              ? response.data.avatar 
              : `${API_BASE_URL}${response.data.avatar}`;
            
            // Fetch and cache the server avatar
            const avatarResponse = await fetch(fullAvatarUrl);
            if (avatarResponse.ok) {
              const blob = await avatarResponse.blob();
              const file = new File([blob], 'avatar.jpg', { type: blob.type });
              await AvatarStorage.saveAvatar(friendUsername, file);
              console.log('[Friends Page] Cached server avatar for', friendUsername);
            }
          } catch (error) {
            console.warn('[Friends Page] Failed to cache server avatar:', error);
          }
        }
        avatarUrl = response.data.avatar.startsWith('http') 
          ? response.data.avatar 
          : `${API_BASE_URL}${response.data.avatar}`;
      }
      
      return {
        username: response.data.username,
        status: "",
        avatar: avatarUrl,
        rank: response.data.ranking.toString()
      }
    } catch (error) {
      console.error("Error fetching friend data:", error)
      return {
        username: friendUsername,
        status: "",
        avatar: null,
        rank: "0"
      }
    }
  }

  // Function to update friends list with deduplication
  const updateFriendsList = async (friendUsernames: string[]) => {
    if (friendUsernames.length === 0) {
      setFriends([]);
      return;
    }

    try {
      console.log("Updating friends list with usernames:", friendUsernames)
      const friendPromises = friendUsernames.map(username => fetchFriendData(username))
      const friendsData = await Promise.all(friendPromises)
      console.log("Updated friends list:", friendsData)
      setFriends(friendsData)
    } catch (error) {
      console.error("Error updating friends list:", error)
      setFriends([])
    }
  };

  // Initial load and update when user.friends changes
  useEffect(() => {
    console.log('Friends list changed:', user.friends);
    updateFriendsList(user.friends || []);
  }, [user.friends]);

  // Reset refreshView after it's used
  useEffect(() => {
    if (refreshView) {
      console.log("refreshView triggered in friends page, resetting to false")
      // Only reset refreshView after a short delay to ensure updates are processed
      setTimeout(() => {
        setRefreshView(false)
      }, 100)
    }
  }, [refreshView, setRefreshView])

  // Handle websocket messages for real-time updates
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'user_updated' && data.data) {
          const updatedUserData = data.data;
          
          // Update friends list if the current user's data was updated (compare by email)
          if (updatedUserData.email === user.email) {
            console.log('Updating friends list from websocket:', updatedUserData.friends);
            updateFriendsList(updatedUserData.friends || []);
          }
        }
        
        if (data.type === 'friend_request_updated' && data.data) {
          const updatedUserData = data.data;
          
          // Update friends list if the current user's data was updated (compare by email)
          if (updatedUserData.email === user.email) {
            console.log('Updating friends list from friend_request_updated:', updatedUserData.friends);
            updateFriendsList(updatedUserData.friends || []);
          }
        }
      } catch (error) {
        console.error('Error parsing websocket message:', error);
      }
    };

    if (newSocket) {
      newSocket.addEventListener('message', handleWebSocketMessage);
    }

    return () => {
      if (newSocket) {
        newSocket.removeEventListener('message', handleWebSocketMessage);
      }
    };
  }, [user.username])

  const handleRemoveFriend = async (username: string) => {
    removeFriend(user, username)
    setFriends(friends.filter(friend => friend.username !== username))
    user.friends = user.friends.filter(friend => friend !== username)
  }

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      setIsSearching(true)
      try {
        const response = await axios.get(`${API_BASE_URL}/friends/search-user?username=${searchQuery}`)
        const userData = await axios.get(`${API_BASE_URL}/db/get-user-by-username?username=${response.data.username}`)
        
        // Enhanced avatar handling for search results
        let avatarUrl = null;
        if (userData.data.avatar) {
          // Check for persistent avatar first
          const persistentAvatar = await AvatarStorage.getAvatar(response.data.username);
          if (persistentAvatar === null) {
            // Cache server avatar locally for faster future access
            try {
              const fullAvatarUrl = userData.data.avatar.startsWith('http') 
                ? userData.data.avatar 
                : `${API_BASE_URL}${userData.data.avatar}`;
              
              // Fetch and cache the server avatar
              const avatarResponse = await fetch(fullAvatarUrl);
              if (avatarResponse.ok) {
                const blob = await avatarResponse.blob();
                const file = new File([blob], 'avatar.jpg', { type: blob.type });
                await AvatarStorage.saveAvatar(response.data.username, file);
                console.log('[Friends Search] Cached server avatar for', response.data.username);
              }
            } catch (error) {
              console.warn('[Friends Search] Failed to cache server avatar:', error);
            }
          }
          avatarUrl = userData.data.avatar.startsWith('http') 
            ? userData.data.avatar 
            : `${API_BASE_URL}${userData.data.avatar}`;
        }
        
        setSearchResults([{
          username: response.data.username,
          status: "",
          avatar: avatarUrl,
          rank: userData.data.ranking.toString()
        }])
      } catch (error) {
        setSearchResults([])
      }
    } else {
      setIsSearching(false)
      setSearchResults([])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    if (!e.target.value.trim()) {
      setIsSearching(false)
      setSearchResults([])
    }
  }

  const displayedUsers = isSearching ? searchResults : friends
  const emptyMessage = isSearching ? t('friends.search.no_results') : t('friends.list.empty')
  const title = isSearching ? t('friends.search.title') : t('friends.title')

  return (
    <div className="min-h-screen bg-background bg-gaming-pattern">
      <Header />
      <main className="flex-1 container-gaming py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-heading-2 text-foreground">{title}</h1>
            <div className="w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('friends.search.placeholder')}
                  value={searchQuery}
                  onChange={handleInputChange}
                  className="pl-10 w-full sm:w-64 bg-card text-white border"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch()
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              {displayedUsers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 w-full max-w-full">
                  {displayedUsers.map((item) => (
                    <div
                      key={item.username}
                      className="flex items-center justify-between p-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <UserAvatar
                          user={item}
                          size="lg"
                        />
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold">{item.username}</h3>
                          <p className="text-sm text-muted-foreground">
                            {t('friends.list.rank')}: {item.rank}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => navigate(`/view-profile/${item.username}`)}
                          className="text-sm"
                        >
                          {t('friends.list.view_profile')}
                        </Button>
                        {!isSearching && (
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleRemoveFriend(item.username)}
                            title={t('friends.list.remove_friend')}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 