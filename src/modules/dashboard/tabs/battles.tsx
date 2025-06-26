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
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../shared/interface/gloabL_var";


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
}: {
  user: User;
}) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [battles, setBattles] = useState<RecentBattle[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchBattles = async () => {
    if (!localStorage.getItem("username")) return;
    
    try {
      setIsLoading(true);
      console.log('[Battles Tab] Fetching recent battles...');
      
      const response = await axios.get(
        `${API_BASE_URL}/battle/get_recent_battles?username=${localStorage.getItem("username")}&limit=4`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      const data = await response.data;

      const mapped: RecentBattle[] = data.map((battle: any) => {
        let opponent = battle.first_opponent === localStorage.getItem("username") ? battle.second_opponent : battle.first_opponent;
        
        let result = "draw";
        const currentUser = localStorage.getItem("username");
        
        const firstScore = parseInt(battle.first_opponent_score) || 0;
        const secondScore = parseInt(battle.second_opponent_score) || 0
        
        if (battle.first_opponent === currentUser) {
          if (firstScore > secondScore) {
            result = "win";
          } else if (firstScore < secondScore) {
            result = "lose";
          } 
        } else if (battle.second_opponent === currentUser) {
          if (secondScore > firstScore) {
            result = "win";
          } else if (secondScore < firstScore) {
            result = "lose";
          }
        } 
        
        const score = `${firstScore} : ${secondScore}`;

        return {
          id: battle.id,
          opponent: opponent || "Unknown",
          player1: battle.first_opponent,
          player2: battle.second_opponent,
          sport: battle.sport,
          result,
          score
        };
      });
      
      setBattles(mapped);
      setLastUpdate(new Date());
      console.log('[Battles Tab] Successfully fetched battles:', mapped.length);
    } catch (error) {
      console.error("[Battles Tab] Error fetching battles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBattles();
    
    // Listen for battle finished events to refresh data
    const handleBattleFinished = (event: any) => {
      console.log('[Battles Tab] Battle finished event received:', event.detail);
      console.log('[Battles Tab] Refreshing battle data...');
      
      // Update user stats if provided in the event
      if (event.detail.updated_users && event.detail.updated_users[user.username]) {
        const updatedStats = event.detail.updated_users[user.username];
        console.log('[Battles Tab] Updating user stats:', updatedStats);
        
        // Update the user object with new stats
        user.totalBattles = updatedStats.totalBattle;
        user.wins = updatedStats.winBattle;
        user.winRate = updatedStats.winRate;
        user.streak = updatedStats.streak;
        
        // Update localStorage if needed
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.totalBattles = updatedStats.totalBattle;
        userData.wins = updatedStats.winBattle;
        userData.winRate = updatedStats.winRate;
        userData.streak = updatedStats.streak;
        localStorage.setItem('user', JSON.stringify(userData));
        
        console.log('[Battles Tab] Updated user stats in localStorage');
      }
      
      // Refresh battles data
      setTimeout(() => {
        fetchBattles();
      }, 1000); // Small delay to ensure backend has processed the battle
    };
    
    window.addEventListener('battleFinished', handleBattleFinished);
    
    return () => {
      window.removeEventListener('battleFinished', handleBattleFinished);
    };
  }, [user]);

  return (
    <div>
      <TabsContent value="battles" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-lg lg:text-xl font-semibold">Battle History</span>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-4"
                    onClick={fetchBattles}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full sm:w-auto h-9 px-4"
                    onClick={() => navigate(`/${user.username}/all-battles`)}
                  >
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 lg:space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-base lg:text-lg mb-4">Loading battles...</p>
                  </div>
                ) : battles.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-base lg:text-lg mb-4">There are no battles yet</p>
                    <Button variant="outline" className="gap-2">
                      <Sword className="w-4 h-4" />
                      Start Your First Battle
                    </Button>
                  </div>
                ) : (
                  battles.slice(0, 4).map((battle) => (
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
                          <p className="text-xs text-gray-500 mt-1">
                            {battle.sport} • {lastUpdate.toLocaleTimeString()}
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
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm lg:text-base">Total Battles</span>
                  <span className="font-bold text-lg lg:text-xl">{user.totalBattles || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm lg:text-base">Wins</span>
                  <span className="font-bold text-lg lg:text-xl text-green-600">{user.wins || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm lg:text-base">Win Rate</span>
                  <span className="font-bold text-lg lg:text-xl text-blue-600">{user.winRate || 0}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm lg:text-base">Current Streak</span>
                  <span className="font-bold text-lg lg:text-xl text-orange-600">{user.streak || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </div>
  );
}
