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


export default function FriendsPage({user}: {user: User}) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchResults, setSearchResults] = useState<Friend[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const navigate = useNavigate()
  const {refreshView} = useRefreshViewStore()
  const {setRefreshView} = useRefreshViewStore()
  // Function to fetch friend data
  const fetchFriendData = async (friendUsername: string): Promise<Friend> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/db/get-user-by-username?username=${friendUsername}`)
      return {
        username: response.data.username,
        status: "",
        avatar: response.data.avatar ? `${API_BASE_URL}${response.data.avatar}` : null,
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
        setSearchResults([{
          username: response.data.username,
          status: "",
          avatar: userData.data.avatar ? `${API_BASE_URL}${userData.data.avatar}` : null,
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
  const emptyMessage = isSearching ? "No users found" : "No friends found"
  const title = isSearching ? "Search Results" : "Friends List"

  return (
    <div className="min-h-screen bg-background bg-gaming-pattern">
      <Header user={user} />
      <main className="flex-1 container-gaming py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-heading-2 text-foreground">{title}</h1>
            <div className="w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2  transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search users..."
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
                      className="w-full cursor-pointer p-4 rounded-lg transition-colors flex flex-col sm:flex-row items-center gap-4 hover:shadow-lg bg-card border hover:bg-card/80"
                      onClick={() => navigate(`/profile/${item.username}`)}
                    >
                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                        <UserAvatar
                          user={{
                            username: item.username,
                            avatar: item.avatar
                          }}
                          size="lg"
                          variant="default"
                          showBorder={true}
                          className="flex-shrink-0"
                        />
                        <div className="flex-grow min-w-0 text-center sm:text-left">
                          <h3 className="font-medium text-foreground truncate text-lg">
                            {item.username}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Rank: #{item.rank}
                          </p>
                        </div>
                      </div>
                      {isSearching ? (
                        <Button
                          variant="outline"
                          size="default"
                          className="w-full sm:w-auto min-w-[120px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${item.username}`);
                          }}
                        >
                          View Profile
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          size="default"
                          className="w-full sm:w-auto min-w-[120px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFriend(item.username);
                          }}
                        >
                          <UserMinus className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      )}
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