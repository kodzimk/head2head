import { TabsContent } from "../../../shared/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card"
import { Button } from "../../../shared/ui/button"
import { Plus, ChevronRight, AlertTriangle } from "lucide-react"
import type { Friend, User } from "../../../shared/interface/user"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import axios from "axios"
import { refreshView } from "../../../app/App"

export default function Friends({user}: {user: User}) {
  const [friends, setFriends] = useState<Friend[]>([])
  useEffect(() => {
    setFriends([])
    user.friends.map(async (friend: string) => {
          const friendData = await axios.get(`https://api.head2head.dev/db/get-user-by-username?username=${friend}`);
          setFriends(prev => [...prev, {
            username: friend,
            avatar: friendData.data.avatar ? `https://api.head2head.dev${friendData.data.avatar}` : null,
            rank: friendData.data.ranking,
            status: ""
          }]);
      });
  }, [user,refreshView])

    const navigate = useNavigate()
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
                                <img
                                  src={friend.avatar}
                                  alt={friend.username}
                                  className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
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