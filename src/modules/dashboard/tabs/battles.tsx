import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../shared/ui/card";
import { Badge } from "../../../shared/ui/badge";
import { TabsContent } from "../../../shared/ui/tabs";
import type { User, RecentBattle } from "../../../shared/interface/user";
import { Button } from "../../../shared/ui/button";
import { ChevronRight, Sword, Trophy, Target, Zap} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Sport icon mapping
const getSportIcon = (sport: string) => {
  const sportIcons: { [key: string]: React.ReactNode } = {
    football: <Trophy className="w-6 h-6 text-orange-500" />,
    basketball: <Target className="w-6 h-6 text-orange-500" />,
    tennis: <Zap className="w-6 h-6 text-orange-500" />,
    soccer: <Trophy className="w-6 h-6 text-green-500" />,
    baseball: <Target className="w-6 h-6 text-blue-500" />,
    volleyball: <Zap className="w-6 h-6 text-purple-500" />,
    hockey: <Sword className="w-6 h-6 text-blue-500" />,
    cricket: <Target className="w-6 h-6 text-green-500" />,
    rugby: <Trophy className="w-6 h-6 text-red-500" />,
    golf: <Target className="w-6 h-6 text-green-500" />,
    swimming: <Zap className="w-6 h-6 text-blue-500" />,
    athletics: <Zap className="w-6 h-6 text-orange-500" />,
    cycling: <Zap className="w-6 h-6 text-yellow-500" />,
    boxing: <Sword className="w-6 h-6 text-red-500" />,
    martial_arts: <Sword className="w-6 h-6 text-purple-500" />,
    default: <Trophy className="w-6 h-6 text-gray-500" />
  };
  
  return sportIcons[sport.toLowerCase()] || sportIcons.default;
};

export default function Battles({
  user,
  recentBattles,
}: {
  user: User;
  recentBattles: RecentBattle[];
}) {
  const navigate = useNavigate();

  return (
    <div>
      <TabsContent value="battles" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-lg lg:text-xl font-semibold">Battle History</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full sm:w-auto h-9 px-4"
                  onClick={() => navigate(`/${user.username}/all-battles`)}
                >
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 lg:space-y-4">
                {recentBattles.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-base lg:text-lg mb-4">There are no battles yet</p>
                    <Button variant="outline" className="gap-2">
                      <Sword className="w-4 h-4" />
                      Start Your First Battle
                    </Button>
                  </div>
                ) : (
                  recentBattles.map((battle) => (
                    <div
                      key={battle.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 lg:p-4 border rounded-lg hover:shadow-sm transition-shadow bg-white dark:bg-gray-800"
                    >
                      <div className="flex items-center gap-3 mb-3 sm:mb-0">
                        <div className="flex-shrink-0">
                          {getSportIcon(battle.sport)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm lg:text-base truncate">
                            {battle.player1} vs {battle.player2}
                          </p>
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
                          {battle.result === "win" ? "Victory" : 
                           battle.result === "lose" ? "Defeat" : "Draw"}
                        </Badge>
                        <p className="text-sm lg:text-lg font-bold text-right">{battle.score}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg lg:text-xl font-semibold">Battle Stats</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3 lg:space-y-4">
              <div className="text-center p-3 lg:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400">{user.wins}</p>
                <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Total Wins</p>
              </div>
              <div className="text-center p-3 lg:p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400">
                  {user.totalBattles - user.wins}
                </p>
                <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Total Losses</p>
              </div>
              <div className="text-center p-3 lg:p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                <p className="text-xl lg:text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {recentBattles.filter(battle => battle.result === 'draw').length}
                </p>
                <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Total Draws</p>
              </div>
              <div className="text-center p-3 lg:p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-xl lg:text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {user.streak}
                </p>
                <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Current Streak</p>
              </div>
              <div className="text-center p-3 lg:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {user.totalBattles}
                </p>
                <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Total Battles</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </div>
  );
}
