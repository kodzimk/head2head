import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../shared/ui/card";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/ui/select";
import { 
  ChevronLeft, 
  ChevronRight, 
  Filter,
  Trophy, 
  Target, 
  Zap, 
  Sword,
  Users,
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../../../shared/interface/gloabL_var";

interface Battle {
  id: string;
  first_opponent: string;
  second_opponent: string;
  first_opponent_score: number;
  second_opponent_score: number;
  sport: string;
  level: string;
  result: string;
  score: string;
}

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
    boxing: <Sword className="w-5 h-5 text-red-500" />,
    default: <Trophy className="w-5 h-5 text-gray-500" />
  };
  
  return sportIcons[sport.toLowerCase()] || sportIcons.default;
};

export default function AllBattles() {
  const [allBattles, setAllBattles] = useState<Battle[]>([]);
  const [filteredBattles, setFilteredBattles] = useState<Battle[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sportFilter, setSportFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const battlesPerPage = 10;

  const fetchAllBattles = async () => {
    if (!localStorage.getItem("username")) return;
    
    try {
      setIsLoading(true);
      console.log('[All Battles] Fetching all battles...');
      
      const response = await axios.get(
        `${API_BASE_URL}/battle/get_all_battles?username=${localStorage.getItem("username")}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      const data = await response.data;

      const mapped: Battle[] = data.map((battle: any) => {
        const currentUser = localStorage.getItem("username");
        const firstScore = parseInt(battle.first_opponent_score) || 0;
        const secondScore = parseInt(battle.second_opponent_score) || 0;
        
        let result = "draw";
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
          first_opponent: battle.first_opponent,
          second_opponent: battle.second_opponent,
          first_opponent_score: firstScore,
          second_opponent_score: secondScore,
          sport: battle.sport,
          level: battle.level,
          created_at: battle.created_at,
          result,
          score
        };
      });
      
      setAllBattles(mapped);
      console.log('[All Battles] Successfully fetched battles:', mapped.length);
    } catch (error) {
      console.error("[All Battles] Error fetching battles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBattles();
    
    // Listen for battle finished events to refresh data
    const handleBattleFinished = (event: any) => {
      console.log('[All Battles] Battle finished event received:', event.detail);
      console.log('[All Battles] Refreshing battle data...');
      
      // Update user stats if provided in the event
      const username = localStorage.getItem("username");
      if (event.detail.updated_users && username && event.detail.updated_users[username]) {
        const updatedStats = event.detail.updated_users[username];
        console.log('[All Battles] Updating user stats:', updatedStats);
        
        // Update the user object with new stats
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.totalBattles = updatedStats.totalBattle;
        userData.wins = updatedStats.winBattle;
        userData.winRate = updatedStats.winRate;
        userData.streak = updatedStats.streak;
        localStorage.setItem('user', JSON.stringify(userData));
        
        console.log('[All Battles] Updated user stats in localStorage');
      }
      
      // Refresh battles data
      setTimeout(() => {
        fetchAllBattles();
      }, 1000); // Small delay to ensure backend has processed the battle
    };
    
    window.addEventListener('battleFinished', handleBattleFinished);
    
    return () => {
      window.removeEventListener('battleFinished', handleBattleFinished);
    };
  }, []);

  useEffect(() => {
    let filtered = allBattles;
    if (sportFilter !== "all") {
      filtered = filtered.filter(battle => 
        battle.sport.toLowerCase() === sportFilter.toLowerCase()
      );
    }

    if (resultFilter !== "all") {
      filtered = filtered.filter(battle => battle.result === resultFilter);
    }

    setFilteredBattles(filtered);
    setCurrentPage(1); 
  }, [allBattles, sportFilter, resultFilter]);

  const uniqueSports = [...new Set(allBattles.map(battle => battle.sport))];

  const totalPages = Math.ceil(filteredBattles.length / battlesPerPage);
  const startIndex = (currentPage - 1) * battlesPerPage;
  const endIndex = startIndex + battlesPerPage;
  const currentBattles = filteredBattles.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading battles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">All Battles</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Users className="w-4 h-4" />
          <span>Total Battles: {allBattles.length}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select value={sportFilter} onValueChange={setSportFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Sports" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                {uniqueSports.map((sport) => (
                  <SelectItem key={sport} value={sport.toLowerCase()}>
                    {sport}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Results" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="win">Wins</SelectItem>
                <SelectItem value="lose">Losses</SelectItem>
                <SelectItem value="draw">Draws</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Battles List */}
      <Card>
        <CardHeader>
          <CardTitle>Battle History</CardTitle>
        </CardHeader>
        <CardContent>
          {currentBattles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">
                {filteredBattles.length === 0 && allBattles.length > 0 
                  ? "No battles match your filters" 
                  : "No battles found"}
              </p>
              {filteredBattles.length === 0 && allBattles.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSportFilter("all");
                    setResultFilter("all");
                  }}
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {currentBattles.map((battle) => (
                <div
                  key={battle.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow bg-card"
                >
                  <div className="flex items-center gap-3 mb-3 sm:mb-0">
                    <div className="flex-shrink-0">
                      {getSportIcon(battle.sport)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm lg:text-base">
                        {battle.first_opponent} vs {battle.second_opponent}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {battle.sport} • {battle.level}
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center px-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-2 w-full max-w-md">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-full sm:w-auto px-3 sm:px-2 text-sm"
            >
              <ChevronLeft className="w-4 h-4 mr-1 sm:mr-0" />
              <span className="sm:hidden">Previous</span>
            </Button>
            
            <div className="flex items-center gap-1 flex-wrap justify-center max-w-full">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 p-0 text-xs sm:text-sm"
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-full sm:w-auto px-3 sm:px-2 text-sm"
            >
              <span className="sm:hidden">Next</span>
              <ChevronRight className="w-4 h-4 ml-1 sm:ml-0" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 