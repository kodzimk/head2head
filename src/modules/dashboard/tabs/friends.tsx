import { TabsContent } from "../../../shared/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card"
import { Button } from "../../../shared/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../../../shared/ui/avatar"
import { Badge } from "../../../shared/ui/badge"
import { Sword, Plus, ChevronRight, AlertTriangle } from "lucide-react"
import type { Friend } from "../../../shared/interface/user"

export default function Friends({ friends }: { friends: Friend[] }) {
    return (
        <div>
            <TabsContent value="friends" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Friends ({friends.length})
                    <Button variant="ghost" size="sm" className="w-32 h-8">
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
                      friends.map((friend) => (
                        <div key={friend.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={friend.avatar || "/placeholder.svg"} alt={friend.username} />
                              <AvatarFallback>
                                {friend.username
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{friend.username}</p>
                              <p className="text-sm text-gray-600">Rank: {friend.rank}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                friend.status === "online"
                                  ? "default"
                                  : friend.status === "in-battle"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {friend.status}
                            </Badge>
                            <Button size="sm" variant="outline" className="w-32 h-8">
                              <Sword className="w-3 h-4 ml-3 " />
                              Challenge
                            </Button>
                          </div>
                        </div>
                      ))
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