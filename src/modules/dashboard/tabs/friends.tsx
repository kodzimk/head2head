import { TabsContent } from "../../../shared/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card"
import { Button } from "../../../shared/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../../../shared/ui/avatar"
import { Badge } from "../../../shared/ui/badge"
import { Sword, Trophy, Share2, MessageCircle, Plus, ChevronRight } from "lucide-react"
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
                    {friends.map((friend) => (
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
                    ))}
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
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <MessageCircle className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm">
                          <strong>Mike Sports</strong> challenged you to a Football battle
                        </p>
                        <p className="text-xs text-gray-600">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="text-sm">
                          <strong>Sarah Trivia</strong> won a tournament
                        </p>
                        <p className="text-xs text-gray-600">5 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Share2 className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm">
                          <strong>Quiz Master</strong> shared an achievement
                        </p>
                        <p className="text-xs text-gray-600">1 day ago</p>
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