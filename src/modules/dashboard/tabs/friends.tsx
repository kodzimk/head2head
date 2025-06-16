import { TabsContent } from "../../../shared/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card"
import { Button } from "../../../shared/ui/button"
import { Plus, ChevronRight, AlertTriangle } from "lucide-react"
import type { Friend } from "../../../shared/interface/user"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import axios from "axios"

export default function Friends() {
  const [friends,SetFriends] = useState<Friend[]>([])
  useEffect(() => {
    const userEmail = localStorage.getItem("user")?.replace(/"/g, ''); 
  
    axios.get(`http://localhost:8000/friends/get-friends?email=${userEmail}`).then((response) => {
      const friendsArray = response.data.map((friend: string) => ({
        username: friend,
        status: "online",
        avatar: "https://github.com/shadcn.png",
        rank: "1"
      }));
      SetFriends(friendsArray);
    })
  },[])

    const navigate = useNavigate()
    return (
        <div>
            <TabsContent value="friends" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Friends ({friends.length})
                    <Button variant="ghost" size="sm" className="w-32 h-8" onClick={() => navigate("/friends")}>
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {friends.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 text-lg mb-4">You don't have any friends yet</p>
                        <Button variant="outline" className="gap-2">
                          <Plus className="w-4 h-4" />
                          Add Friends
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {friends.map((friend) => (
                          <div
                            key={friend.username}
                            className="cursor-pointer border rounded-lg p-4 flex items-center gap-4 hover:shadow-lg transition"
                            onClick={() => navigate(`/profile/${friend.username}`)}
                          >
                            <img
                              src={friend.avatar}
                              alt={friend.username}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div>
                              <p className="font-semibold">{friend.username}</p>
                              <p className="text-sm text-gray-500">Rank: {friend.rank}</p>
                              <span className={`inline-block w-2 h-2 rounded-full ${friend.status === "online" ? "bg-green-500" : "bg-gray-400"}`}></span>
                              <span className="ml-2 text-xs">{friend.status}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="ml-auto"
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
                  <div className="space-y-4">
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