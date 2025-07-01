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
      const friendData = await axios.get(`${API_BASE_URL}/db/get-user-by-username?username=${friendUsername}`);
      return {
        username: friendUsername,
        avatar: friendData.data.avatar ? `${API_BASE_URL}${friendData.data.avatar}` : null,
        rank: friendData.data.ranking.toString(),
        status: "online"
      };
    } catch (error) {
      console.error(`Error fetching friend data for ${friendUsername}:`, error);
      return {
        username: friendUsername,
        avatar: null,
        rank: "1",
        status: "online"
      };
    }
  };

  // Function to update friends list with deduplication
  const updateFriendsList = async (friendUsernames: string[]) => {
    if (friendUsernames.length === 0) {
      setFriends([]);
      return;
    }

    try {
      // Remove duplicates from friendUsernames
      const uniqueFriends = [...new Set(friendUsernames)];
      console.log('Fetching data for unique friends:', uniqueFriends);
      
      const friendPromises = uniqueFriends.map(fetchFriendData);
      const friendResults = await Promise.all(friendPromises);
      
      // Filter out any null results and ensure no duplicates
      const validFriends = friendResults.filter(friend => friend !== null);
      const uniqueValidFriends = validFriends.filter((friend, index, self) => 
        index === self.findIndex(f => f.username === friend.username)
      );
      
      console.log('Setting friends list:', uniqueValidFriends);
      setFriends(uniqueValidFriends);
    } catch (error) {
      console.error('Error updating friends list:', error);
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
          rank: userData.data.ranking
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
  const title = isSearching ? "Search Results" : "Your Friends"

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
                        {item.avatar ? (
                          <div 
                            className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-14 lg:h-14 rounded-full overflow-hidden flex-shrink-0 aspect-square border-2 border-primary"
                            style={{ clipPath: 'circle(50%)' }}
                          >
                            <img
                              src={item.avatar}
                              alt={item.username}
                              className="w-full h-full object-cover object-center"
                              style={{ clipPath: 'circle(50%)' }}
                            />
                          </div>
                        ) : (
                          <div 
                            className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-14 lg:h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm sm:text-lg md:text-xl lg:text-lg font-bold flex-shrink-0 aspect-square border-2 border-primary"
                            style={{ clipPath: 'circle(50%)' }}
                          >
                            {item.username.slice(0, 2).toUpperCase()}
                          </div>
                        )}
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