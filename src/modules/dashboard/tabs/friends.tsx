import { useNavigate } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import { useEffect, useState, useRef, useCallback } from "react"
import axios from "axios"
import { API_BASE_URL } from "../../../shared/interface/gloabL_var"
import { newSocket } from "../../../app/App"
import type { User, Friend } from "../../../shared/interface/user"
import { Button } from "../../../shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card"
import { ChevronRight, Plus, AlertTriangle } from "lucide-react"
import { TabsContent } from "../../../shared/ui/tabs"
import { UserAvatar } from '../../../shared/ui/user-avatar'

export default function Friends({user}: {user: User}) {
  const [friends, setFriends] = useState<Friend[]>([])
  const navigate = useNavigate()
  const { t } = useTranslation()

  // Cache friends data
  const friendsCache = useRef(new Map<string, any>());
  
  const updateFriendsList = useCallback(async (friendsList: string[]) => {
    try {
      const newFriends = [];
      const batchSize = 3;
      
      for (let i = 0; i < friendsList.length; i += batchSize) {
        const batch = friendsList.slice(i, i + batchSize);
        const batchPromises = batch.map(async (friendUsername) => {
          // Check cache first
          if (friendsCache.current.has(friendUsername)) {
            return friendsCache.current.get(friendUsername);
          }
          
          try {
            const response = await axios.get(`${API_BASE_URL}/db/get-user-by-username?username=${friendUsername}`);
            const friendData = {
              username: response.data.username,
              avatar: response.data.avatar,
              rank: response.data.ranking,
              wins: response.data.winBattle,
              totalBattles: response.data.totalBattle
            };
            // Update cache
            friendsCache.current.set(friendUsername, friendData);
            return friendData;
          } catch (error) {
            console.error(`Error fetching friend data for ${friendUsername}:`, error);
            return null;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        newFriends.push(...batchResults.filter(Boolean));
        
        // Add delay between batches
        if (i + batchSize < friendsList.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      setFriends(newFriends);
    } catch (error) {
      console.error('Error updating friends list:', error);
    }
  }, []);

  useEffect(() => {
    if (user.friends.length > 0) {
      // Debounce the friends list update
      const timeoutId = setTimeout(() => {
        updateFriendsList(user.friends);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setFriends([]);
    }
  }, [user.friends, updateFriendsList]);

  // Handle websocket messages for real-time updates
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if ((data.type === 'user_updated' || data.type === 'friend_request_updated') && data.data) {
          const updatedUserData = data.data;
          
          // Update friends list if the current user's data was updated (compare by email)
          if (updatedUserData.email === user.email) {
            // Debounce the friends list update
            const timeoutId = setTimeout(() => {
              updateFriendsList(updatedUserData.friends || []);
            }, 500);
            
            return () => clearTimeout(timeoutId);
          }
        }
      } catch (error) {
        console.error('Error parsing websocket message:', error);
      }
    };

    const socket = newSocket;
    if (socket) {
      socket.addEventListener('message', handleWebSocketMessage);
      
      return () => {
        socket.removeEventListener('message', handleWebSocketMessage);
      }
    }
    return undefined;
  }, [user.email, updateFriendsList]);

  return (
    <div>
      <TabsContent value="friends" className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card data-onboarding="friends-list-content">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t('dashboard.friends')} ({friends.length})
                <Button variant="ghost" size="sm" className="w-32 h-8" onClick={() => navigate(`/${user.username}/friends`)}>
                  {t('dashboard.viewAll')} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 w-full">
                {friends.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-lg mb-4">{t('dashboard.noFriendsYet')}</p>
                    <Button variant="outline" className="gap-2" onClick={() => navigate(`/${user.username}/friends`)}>
                      <Plus className="w-4 h-4" />
                      {t('dashboard.addFriends')}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 w-full max-w-full">
                    {friends.map((friend) => (
                      <div
                        key={friend.username}
                        className="w-full cursor-pointer p-4 border bg-card flex flex-col sm:flex-row items-center gap-4 hover:shadow-lg"
                        onClick={() => navigate(`/view-profile/${friend.username}`)}
                      >
                        <div className="flex items-center gap-4 w-full">
                          <UserAvatar
                            user={friend}
                            size="lg"
                            variant="default"
                            className="flex-shrink-0"
                          />
                          <div className="flex-grow min-w-0">
                            <h3 className="font-medium text-white truncate text-lg">
                              {friend.username}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {t('dashboard.rank')}: #{friend.rank}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:flex-shrink-0 w-full sm:w-auto">
                          <Button
                            variant="outline"
                            size="default"
                            className="w-full sm:w-auto min-w-[120px]"
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/view-profile/${friend.username}`);
                            }}
                          >
                            {t('dashboard.viewProfile')}
                          </Button>
                          <Button
                            variant="secondary"
                            size="default"
                            className="w-full sm:w-auto min-w-[120px]"
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/chats/${friend.username}`);
                            }}
                          >
                            {t('friends.actions.chat')}
                          </Button>
                        </div>
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
                {t('dashboard.friendActivity')}
                <Button variant="ghost" size="sm" className="w-32 h-8">
                  {t('dashboard.viewAll')} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">{t('dashboard.comingSoon')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </div>
  )
}