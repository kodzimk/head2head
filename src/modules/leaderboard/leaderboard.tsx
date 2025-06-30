import { useState, useEffect } from "react";
import { useGlobalStore } from "../../shared/interface/gloabL_var";
import Header from "../dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../shared/ui/avatar";
import { Badge } from "../../shared/ui/badge";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../../shared/interface/gloabL_var";

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
  if (rank === 1) return <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />;
  if (rank === 3) return <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />;
  return <span className="text-sm sm:text-lg font-bold text-muted-foreground">#{rank}</span>;
};

export default function LeaderboardPage() {
  const { user } = useGlobalStore();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [,setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await axios.get(`${API_BASE_URL}/db/get-leaderboard`, {
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
      <div className="min-h-screen bg-background bg-gaming-pattern">
        <Header user={user} />
        <main className="container-gaming py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="loading-gaming w-12 h-12 rounded-lg mx-auto"></div>
              <p className="text-muted-foreground font-rajdhani">Loading leaderboard...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background bg-gaming-pattern">
      <Header user={user} />
      <main className="container-gaming py-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="text-center space-y-2 sm:space-y-3">
            <h1 className="text-heading-1 text-foreground">
              Global Leaderboard
            </h1>
            <p className="text-responsive-sm text-muted-foreground">
              Top players ranked by points (wins, win rate, streaks, and consistency)
            </p>
          </div>

          {/* User Rank Card */}
          <div className="flex justify-center w-full">
            <Card className="card-surface-2 border-primary/20 w-full max-w-sm">
              <CardContent className="responsive-padding">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-responsive-xs text-muted-foreground uppercase tracking-wide font-mono">Your Rank</p>
                    <p className="text-responsive-xl font-bold text-primary font-rajdhani">#{currentUserRank || "Unranked"}</p>
                  </div>
                  <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-primary/70" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard */}
          <Card className="card-surface">
            <CardHeader className="responsive-padding">
              <CardTitle className="flex items-center gap-2 text-responsive-lg">
                <Trophy className="w-5 h-5 text-primary" />
                Top Players
              </CardTitle>
            </CardHeader>
            <CardContent className="responsive-padding">
              {leaderboardData.length === 0 ? (
                <div className="text-center py-8 sm:py-12 space-y-4">
                  <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/50 mx-auto" />
                  <div>
                    <p className="text-responsive-base text-muted-foreground font-medium">No players found</p>
                    <p className="text-responsive-xs text-muted-foreground/70 mt-1">Start playing to appear on the leaderboard!</p>
                  </div>
                </div>
              ) : (
                <div className="grid-leaderboard">
                  {leaderboardData.map((player) => {
                    const isCurrentUser = player.username === user.username;
                    return (
                      <div
                        key={player.username}
                        className={`leaderboard-row ${
                          isCurrentUser ? 'leaderboard-row-user' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-0 flex-1 min-w-0">
                          {/* Rank Icon */}
                          <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 flex-shrink-0">
                            {getRankIcon(player.rank)}
                          </div>
                          
                          {/* Avatar */}
                          <Avatar className="leaderboard-avatar">
                            <AvatarImage
                              src={player.avatar ? `${API_BASE_URL}${player.avatar}` : undefined}
                              alt={player.username}
                            />
                            <AvatarFallback className="bg-primary text-primary-foreground text-responsive-xs font-semibold">
                              {player.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          {/* Player Info */}
                          <div className="leaderboard-info">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground text-responsive-sm truncate">
                                {player.username}
                              </h3>
                              {isCurrentUser && (
                                <Badge variant="secondary" className="text-xs bg-primary/15 text-primary border-primary/25">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-responsive-xs text-muted-foreground">
                              <span className="truncate capitalize">{player.favoriteSport}</span>
                              <span className="text-muted-foreground/50">•</span>
                              <span>{player.totalBattles} battles</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Stats */}
                        <div className="leaderboard-stats">
                          <div className="text-center sm:text-right">
                            <div className="flex items-center justify-center sm:justify-end gap-1">
                              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-success" />
                              <span className="font-bold text-responsive-base text-success">{player.wins}</span>
                            </div>
                            <p className="text-responsive-xs text-muted-foreground">wins</p>
                          </div>
                          
                          <div className="text-center sm:text-right">
                            <p className="font-semibold text-responsive-sm text-foreground">
                              {Math.round(player.winRate)}%
                            </p>
                            <p className="text-responsive-xs text-muted-foreground">rate</p>
                          </div>
                          
                          {player.streak > 0 && (
                            <div className="text-center sm:text-right">
                              <p className="font-semibold text-responsive-sm text-primary">
                                🔥 {player.streak}
                              </p>
                              <p className="text-responsive-xs text-muted-foreground">streak</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 