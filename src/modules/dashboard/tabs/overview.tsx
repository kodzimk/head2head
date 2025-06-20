import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../../../shared/ui/avatar"
import { TabsContent } from "../../../shared/ui/tabs"
import { Button } from "../../../shared/ui/button"
import { Badge } from "../../../shared/ui/badge"
import { Settings, Sword, Trophy, Target, Zap, Calendar } from "lucide-react"
import type { User, RecentBattle } from '../../../shared/interface/user'
import { useNavigate } from "react-router-dom"

const getSportIcon = (sport: string) => {
  const sportIcons: { [key: string]: React.ReactNode } = {
    football: <Trophy className="w-5 h-5 text-orange-500" />,
    basketball: <Target className="w-5 h-5 text-orange-500" />,
    tennis: <Zap className="w-5 h-5 text-orange-500" />,
    soccer: <Trophy className="w-5 h-5 text-green-500" />,
    baseball: <Target className="w-5 h-5 text-blue-500" />,
    volleyball: <Zap className="w-5 h-5 text-purple-500" />,
    hockey: <Sword className="w-5 h-5 text-blue-500" />,
    cricket: <Target className="w-5 h-5 text-green-500" />,
    rugby: <Trophy className="w-5 h-5 text-red-500" />,
    golf: <Target className="w-5 h-5 text-green-500" />,
    swimming: <Zap className="w-5 h-5 text-blue-500" />,
    athletics: <Zap className="w-5 h-5 text-orange-500" />,
    cycling: <Zap className="w-5 h-5 text-yellow-500" />,
    boxing: <Sword className="w-5 h-5 text-red-500" />,
    martial_arts: <Sword className="w-5 h-5 text-purple-500" />,
    default: <Trophy className="w-5 h-5 text-gray-500" />
  };
  
  return sportIcons[sport.toLowerCase()] || sportIcons.default;
};
  
export default function Overview({ user, recentBattles }: { user: User, recentBattles: RecentBattle[] }) {
    const navigate = useNavigate()
    return (
        <TabsContent value="overview" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Avatar className="w-10 h-10 lg:w-12 lg:h-12">
                  <AvatarImage src={user.avatar ? `http://localhost:8000${user.avatar}` : "/placeholder.svg"} alt={user.username} />
                  <AvatarFallback className="bg-orange-500 text-white text-xs lg:text-sm">
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-sm lg:text-base">{user.username}</h3>
                  <p className="text-xs lg:text-sm text-gray-600">@{user.username}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 lg:space-y-4">
  

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 text-xs lg:text-sm">Rank</span>
                  <span className="font-semibold text-xs lg:text-sm">#{user.rank}</span>
                </div>
                <div className=" flex justify-between">
                  <span className="text-gray-600 text-xs lg:text-sm">Battles Won</span>
                  <span className="font-semibold text-xs lg:text-sm">{user.wins}</span>
                </div>
                <div className="sm:hidden flex justify-between">
                  <span className="text-gray-600 text-xs lg:text-sm">Winning Percentage</span>
                  <span className="font-semibold text-xs lg:text-sm">{user.winRate}%</span>
                </div>
                <div className="sm:hidden flex justify-between">
                  <span className="text-gray-600 text-xs lg:text-sm">Winning Streak</span>
                  <span className="font-semibold text-xs lg:text-sm">{user.streak}</span>
                </div>
                <div className="sm:hidden flex justify-between">
                  <span className="text-gray-600 text-xs lg:text-sm">Total Battles</span>
                  <span className="font-semibold text-xs lg:text-sm">{user.totalBattles}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs lg:text-sm">Favorite Sport</span>
                  <div className="flex items-center gap-1">
                    {getSportIcon(user.favoritesSport)}
                    <span className="font-semibold text-xs lg:text-sm">{user.favoritesSport}</span>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full text-xs lg:text-sm" onClick={() => navigate("/profile")}>
                <Settings className="w-3 h-3 lg:w-4 lg:h-4 mr-2" />
                Edit Profile
              </Button>
            </CardContent>
          </Card>
      
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg lg:text-xl">Recent Battles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 lg:space-y-4">
                {recentBattles.length === 0 ? (
                  <div className="text-center py-6 lg:py-8">
                    <p className="text-gray-500 text-base lg:text-lg mb-4">There are no battles yet</p>
                    <Button variant="outline" className="gap-2 text-xs lg:text-sm">
                      <Sword className="w-3 h-3 lg:w-4 lg:h-4" />
                      Start Your First Battle
                    </Button>
                  </div>
                ) : (
                  recentBattles.map((battle) => (
                    <div key={battle.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 lg:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3 mb-2 sm:mb-0">
                        <div className="flex-shrink-0">
                          {getSportIcon(battle.sport)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm lg:text-base truncate">{battle.player1} vs {battle.player2}</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <Badge 
                          variant={
                            battle.result === "win" ? "default" : 
                            battle.result === "lose" ? "destructive" : "secondary"
                          } 
                          className="w-fit text-xs lg:text-sm"
                        >
                          {battle.result === "win" ? "Won" : 
                           battle.result === "lose" ? "Lost" : "Draw"}
                        </Badge>
                        <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 font-semibold text-right">{battle.score}</p>
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