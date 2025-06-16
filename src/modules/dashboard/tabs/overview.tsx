import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../../../shared/ui/avatar"
import { TabsContent } from "../../../shared/ui/tabs"
import { Button } from "../../../shared/ui/button"
import { Badge } from "../../../shared/ui/badge"
import { Settings, Sword } from "lucide-react"
import type { User, RecentBattle } from '../../../shared/interface/user'
import { useNavigate } from "react-router-dom"
  
export default function Overview({ user, recentBattles }: { user: User, recentBattles: RecentBattle[] }) {
    const navigate = useNavigate()
    return (
        <TabsContent value="overview" className="space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user.avatar ? `http://localhost:8000${user.avatar}` : "/placeholder.svg"} alt={user.username} />
                  <AvatarFallback className="bg-orange-500 text-white">
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold">{user.username}</h3>
                  <p className="text-sm text-gray-600">@{user.username}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
  

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rank</span>
                  <span className="font-semibold">#{user.rank}</span>
                </div>
                <div className=" flex justify-between">
                  <span className="text-gray-600">Battles Won</span>
                  <span className="font-semibold">{user.wins}</span>
                </div>
                <div className="sm:hidden flex justify-between">
                  <span className="text-gray-600">Winning Percentage</span>
                  <span className="font-semibold">{user.winRate}%</span>
                </div>
                <div className="sm:hidden flex justify-between">
                  <span className="text-gray-600">Winning Streak</span>
                  <span className="font-semibold">{user.streak}</span>
                </div>
                <div className="sm:hidden flex justify-between">
                  <span className="text-gray-600">Total Battles</span>
                  <span className="font-semibold">{user.totalBattles}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Favorite Sport</span>
                  <span className="font-semibold">{user.favoritesSport}</span>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={() => navigate("/profile")}>
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
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBattles.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-lg mb-4">There are no battles yet</p>
                    <Button variant="outline" className="gap-2">
                      <Sword className="w-4 h-4" />
                      Start Your First Battle
                    </Button>
                  </div>
                ) : (
                  recentBattles.map((battle) => (
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
                  ))
                )}
              </div>
              
            </CardContent>
            
          </Card>
        </div>
      </TabsContent>
    )
}