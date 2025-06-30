import { TabsContent } from "../../../shared/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card"
import { Button } from "../../../shared/ui/button"
import { Plus, ChevronRight, AlertTriangle } from "lucide-react"
import type { Friend, User } from "../../../shared/interface/user"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import axios from "axios"
import { useRefreshViewStore } from "../../../shared/interface/gloabL_var"
import { API_BASE_URL } from "../../../shared/interface/gloabL_var"
import { newSocket } from "../../../app/App"

export default function Friends({user}: {user: User}) {
  const [friends, setFriends] = useState<Friend[]>([])
  const navigate = useNavigate()
  const { refreshView, setRefreshView } = useRefreshViewStore()

  // Function to fetch friend data
  const fetchFriendData = async (friendUsername: string): Promise<Friend> => {
    try {
      const friendData = await axios.get(`${API_BASE_URL}/db/get-user-by-username?username=${friendUsername}`);
      return {
        username: friendUsername,
        avatar: friendData.data.avatar ? `${API_BASE_URL}${friendData.data.avatar}` : null,
        rank: friendData.data.ranking.toString(),
        status: ""
      };
    } catch (error) {
      console.error(`Error fetching friend data for ${friendUsername}:`, error);
      return {
        username: friendUsername,
        avatar: null,
        rank: "0",
        status: ""
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
      console.log('Dashboard - Fetching data for unique friends:', uniqueFriends);
      
      const friendPromises = uniqueFriends.map(fetchFriendData);
      const friendResults = await Promise.all(friendPromises);
      
      // Filter out any null results and ensure no duplicates
      const validFriends = friendResults.filter(friend => friend !== null);
      const uniqueValidFriends = validFriends.filter((friend, index, self) => 
        index === self.findIndex(f => f.username === friend.username)
      );
      
      console.log('Dashboard - Setting friends list:', uniqueValidFriends);
      setFriends(uniqueValidFriends);
    } catch (error) {
      console.error('Error updating friends list:', error);
    }
  };

  // Initial load and update when user.friends changes
  useEffect(() => {
    console.log('Friends list changed:', user.friends);
    updateFriendsList(user.friends);
  }, [user.friends]);

  // Reset refreshView after it's used
  useEffect(() => {
    if (refreshView) {
      console.log("refreshView triggered in friends, resetting to false")
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
          
          // Update friends list if the current user's data was updated
          if (updatedUserData.username === user.username) {
            console.log('Updating friends list from websocket:', updatedUserData.friends);
            updateFriendsList(updatedUserData.friends || []);
          }
        }
        
        if (data.type === 'friend_request_updated' && data.data) {
          const updatedUserData = data.data;
          
          // Update friends list if the current user's data was updated
          if (updatedUserData.username === user.username) {
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
  }, [user.username]);

  return (
    <div>
      <TabsContent value="friends" className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Friends ({friends.length})
                <Button variant="ghost" size="sm" className="w-32 h-8" onClick={() => navigate(`/${user.username}/friends`)}>
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 w-full">
                {friends.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-lg mb-4">You don't have any friends yet</p>
                    <Button variant="outline" className="gap-2" onClick={() => navigate(`/${user.username}/friends`)}>
                      <Plus className="w-4 h-4" />
                      Add Friends
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 w-full max-w-full">
                    {friends.map((friend) => (
                      <div
                        key={friend.username}
                        className="w-full cursor-pointer p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex flex-col sm:flex-row items-center gap-4 hover:shadow-lg"
                        onClick={() => navigate(`/profile/${friend.username}`)}
                      >
                        <div className="flex items-center gap-4 w-full">
                          {friend.avatar ? (
                            <div 
                              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-14 lg:h-14 rounded-full overflow-hidden flex-shrink-0 aspect-square"
                              style={{ clipPath: 'circle(50%)' }}
                            >
                              <img
                                src={friend.avatar}
                                alt={friend.username}
                                className="w-full h-full object-cover object-center"
                                style={{ clipPath: 'circle(50%)' }}
                              />
                            </div>
                          ) : (
                            <div 
                              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-14 lg:h-14 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm sm:text-lg md:text-xl lg:text-lg font-bold flex-shrink-0 aspect-square"
                              style={{ clipPath: 'circle(50%)' }}
                            >
                              {friend.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-grow min-w-0">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate text-lg">
                              {friend.username}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Rank: #{friend.rank}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="default"
                          className="sm:flex-shrink-0 w-full sm:w-auto min-w-[120px]"
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/profile/${friend.username}`);
                          }}
                        >
                          View Profile
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Friend Activity
                <Button variant="ghost" size="sm" className="w-32 h-8">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 w-full">
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="p-3 bg-orange-100 dark:bg-orange-800/30 rounded-full">
                    <AlertTriangle className="w-8 h-8 text-orange-500 dark:text-orange-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-orange-800 dark:text-orange-300">Coming Soon!</h3>
                    <p className="text-orange-600 dark:text-orange-400 max-w-md">
                      The Friends feature is currently under development. We're working hard to bring you an amazing social experience!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </div>
  )
}