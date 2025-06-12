import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../../../shared/ui/avatar"
import { Progress } from "../../../shared/ui/progress"
import { TabsContent } from "../../../shared/ui/tabs"
import { Button } from "../../../shared/ui/button"
import { Badge } from "../../../shared/ui/badge"
import { Settings, ChevronRight } from "lucide-react"
import type { User, RecentBattle } from '../../../shared/interface/user'

export default function Overview({ user, recentBattles }: { user: User, recentBattles: RecentBattle[] }) {
    return (
        <TabsContent value="overview" className="space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.username} />
                  <AvatarFallback>AJ</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold">{user.username}</h3>
                  <p className="text-sm text-gray-600">@{user.username}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Level {user.level}</span>
                  <span>
                    {user.xp}/{user.xpToNext} XP
                  </span>
                </div>
                <Progress value={(user.xp / user.xpToNext) * 100} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Battles Won</span>
                  <span className="font-semibold">{user.wins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Favorite Sport</span>
                  <span className="font-semibold">{user.favoritesSport}</span>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Battles
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBattles.map((battle) => (
                  <div key={battle.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{battle.sport}</div>
                      <div>
                        <p className="font-medium">vs {battle.opponent}</p>
                        <p className="text-sm text-gray-600">{battle.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={battle.result === "win" ? "default" : "destructive"}>
                        {battle.result === "win" ? "Won" : "Lost"}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">{battle.score}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    )
}