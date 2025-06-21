import { useState, useEffect } from "react";
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
import type { RecentBattle } from "../../../shared/interface/user";
import axios from "axios";

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



export default function AllBattles() {
  const [allBattles, setAllBattles] = useState<RecentBattle[]>([]);
  const [filteredBattles, setFilteredBattles] = useState<RecentBattle[]>([]);
  const [sortedBattles, setSortedBattles] = useState<RecentBattle[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sportFilter, setSportFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const battlesPerPage = 10;

  useEffect(() => {
    const fetchAllBattles = async () => {
      if (!localStorage.getItem("username")) return;
      
      try {
        setIsLoading(true);
        const response = await axios.get(
          `http://localhost:8000/get_battles?username=${localStorage.getItem("username")}`,
          {
            headers: {
              "accept": "application/json",
            },
          }
        );
        
        const data = await response.data;
        const mapped: RecentBattle[] = data.reverse().map((battle: any) => {
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
        
        setAllBattles(mapped);
        setFilteredBattles(mapped);
      } catch (error) {
        console.error("Error fetching battles:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllBattles();
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

  useEffect(() => {
    const sorted = [...filteredBattles].sort((a, b) => { 
      const resultOrder = { win: 1, draw: 2, lose: 3 };
      return (resultOrder[a.result as keyof typeof resultOrder] || 0) - (resultOrder[b.result as keyof typeof resultOrder] || 0);
    });
    
    setSortedBattles(sorted);
    setCurrentPage(1); 
  }, [filteredBattles]);

  const uniqueSports = [...new Set(allBattles.map(battle => battle.sport))];

  const totalPages = Math.ceil(sortedBattles.length / battlesPerPage);
  const startIndex = (currentPage - 1) * battlesPerPage;
  const endIndex = startIndex + battlesPerPage;
  const currentBattles = sortedBattles.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Battles</h2>
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
                {sortedBattles.length === 0 && allBattles.length > 0 
                  ? "No battles match your filters" 
                  : "No battles found"}
              </p>
              {sortedBattles.length === 0 && allBattles.length > 0 && (
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <div className="flex-shrink-0">
                      {getSportIcon(battle.sport)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm lg:text-base truncate">
                        {battle.player1} vs {battle.player2}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-500 uppercase">{battle.sport}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Badge
                      variant={
                        battle.result === "win" ? "default" : 
                        battle.result === "lose" ? "destructive" : "secondary"
                      }
                      className="w-fit text-xs"
                    >
                      {battle.result === "win" ? "Victory" : 
                       battle.result === "lose" ? "Defeat" : "Draw"}
                    </Badge>
                    <p className="text-lg font-bold text-right">{battle.score}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 