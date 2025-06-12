import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card"
import { Badge } from "../../../shared/ui/badge"
import { TabsContent } from "../../../shared/ui/tabs"
import type { User, RecentBattle } from "../../../shared/interface/user"

export default function Battles({ user, recentBattles }: { user: User, recentBattles: RecentBattle[] }) {
    return (
        <div>
           <TabsContent value="battles" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Battle History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentBattles.map((battle) => (
                      <div key={battle.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">{battle.sport}</div>
                          <div>
                            <p className="font-medium">vs {battle.opponent}</p>
                            <p className="text-sm text-gray-600">{battle.time}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={battle.result === "win" ? "default" : "destructive"} className="mb-2">
                            {battle.result === "win" ? "Victory" : "Defeat"}
                          </Badge>
                          <p className="text-lg font-bold">{battle.score}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Battle Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{user.wins}</p>
                    <p className="text-sm text-gray-600">Total Wins</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{user.totalBattles - user.wins}</p>
                    <p className="text-sm text-gray-600">Total Losses</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{user.streak}</p>
                    <p className="text-sm text-gray-600">Current Streak</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
    )
}