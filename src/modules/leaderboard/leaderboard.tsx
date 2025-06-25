import { useState, useEffect } from "react";
import { useGlobalStore } from "../../shared/interface/gloabL_var";
import Header from "../dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../shared/ui/avatar";
import { Badge } from "../../shared/ui/badge";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import axios from "axios";

interface LeaderboardUser {
  rank: number;
  username: string;
  wins: number;
  totalBattles: number;
  winRate: number;
  streak: number;
  favoriteSport: string;
  avatar?: string;
}

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
  return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
};

export default function LeaderboardPage() {
  const { user } = useGlobalStore();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await axios.get("http://localhost:8000/db/get-leaderboard", {
          headers: {
            "accept": "application/json",
          },
        });
        
        setLeaderboardData(response.data);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError("Failed to load leaderboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const currentUserRank = leaderboardData.find(u => u.username === user.username)?.rank || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <Header user={user} />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading leaderboard...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <Header user={user} />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header user={user} />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Global Leaderboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Top players ranked by points (wins, win rate, streaks, and consistency)
            </p>
          </div>

          {/* Stats Cards */}
          <div className="flex justify-center w-full">
            <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 w-full">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs sm:text-sm">Your Rank</p>
                    <p className="text-xl sm:text-2xl font-bold">#{currentUserRank || "Unranked"}</p>
                  </div>
                  <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-orange-500" />
                Top Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboardData.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No players found</p>
                  <p className="text-gray-400 text-sm">Start playing to appear on the leaderboard!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboardData.map((player) => (
                    <div
                      key={player.username}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border transition-all hover:shadow-md ${
                        player.username === user.username
                          ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                          : "bg-white dark:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-0">
                        <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12">
                          {getRankIcon(player.rank)}
                        </div>
                        
                        <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                          <AvatarImage
                              src={player.avatar ? `http://localhost:8000${player.avatar}` : undefined}
                            alt={player.username}
                          />
                          <AvatarFallback className="bg-orange-500 text-white text-xs sm:text-sm">
                            {player.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                              {player.username}
                            </h3>
                            {player.username === user.username && (
                              <Badge variant="secondary" className="text-xs">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            <span className="truncate">{player.favoriteSport}</span>
                            <span>•</span>
                            <span>{player.totalBattles} battles</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                        <div className="text-center sm:text-right">
                          <div className="flex items-center justify-center sm:justify-end gap-1">
                            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                            <span className="font-bold text-base sm:text-lg">{player.wins}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">wins</p>
                        </div>
                        {player.streak > 0 && (
                          <div className="text-center sm:text-right">
                            <p className="font-semibold text-xs sm:text-sm text-orange-600">
                              🔥 {player.streak}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">streak</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 