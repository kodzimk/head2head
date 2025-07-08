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
import { ChevronRight, Sword} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../shared/interface/gloabL_var";

const VALID_SPORTS = [
  'football',
  'basketball',
  'baseball',
  'hockey',
  'tennis',
  'golf',
  'cricket',
  'rugby',
  'volleyball'
];

const getSportIcon = (sport: string) => {
  const sportIcons: { [key: string]: string } = {
    football: '⚽',
    basketball: '🏀',
    baseball: '⚾',
    hockey: '🏒',
    tennis: '🎾',
    golf: '⛳',
    cricket: '🏏',
    rugby: '🏉',
    volleyball: '🏐'
  };
  
  const normalizedSport = sport?.toLowerCase()?.trim() || '';
  return sportIcons[normalizedSport] || '🎮';
};

const normalizeSport = (sport: string): string => {
  const normalizedSport = sport?.toLowerCase()?.trim() || '';
  return VALID_SPORTS.includes(normalizedSport) ? normalizedSport : 'football';
};

export default function Battles({
  user,  
  setBattles,
}: {
  user: User;
  battles: RecentBattle[];
  setBattles: (battles: RecentBattle[]) => void;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [allBattles, setAllBattles] = useState<RecentBattle[]>([]);

  useEffect(() => {
    const fetchAllBattles = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(
          `${API_BASE_URL}/battle/get_all_battles?username=${user.username}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          }
        );
        
        const mapped: RecentBattle[] = response.data.map((battle: any) => {
          const currentUser = user.username;
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
            player1: battle.first_opponent,
            player2: battle.second_opponent,
            sport: normalizeSport(battle.sport),
            result,
            score
          };
        });
        
        // Set both all battles and limit to last 3 for display
        setAllBattles(mapped);
        setBattles(mapped.slice(0, 3));
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching all battles:', error);
        setIsLoading(false);
      }
    };  
    
    fetchAllBattles();
  }, [user.username, setBattles]);
  
  return (
    <div>
      <TabsContent value="battles" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <Card className="lg:col-span-2" data-onboarding="battle-history-content">
            <CardHeader className="pb-4">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-lg lg:text-xl font-semibold">{t('dashboard.battleHistory')}</span>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full sm:w-auto h-9 px-4"
                    onClick={() => navigate(`/${user.username}/all-battles`)}
                  >
                    {t('dashboard.viewAll')} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 lg:space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-base lg:text-lg mb-4">{t('dashboard.loadingBattles')}</p>
                  </div>
                ) : allBattles.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-base lg:text-lg mb-4">{t('dashboard.noBattlesYet')}</p>
                    <Button variant="outline" className="gap-2">
                      <Sword className="w-4 h-4" />
                      {t('dashboard.startFirstBattle')}
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Last 3 Battles Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {allBattles.slice(0, 3).map((battle) => (
                        <Card 
                          key={battle.id} 
                          className={`
                            ${battle.result === 'win' ? 'border-green-500/50 bg-green-500/10' : 
                              battle.result === 'lose' ? 'border-red-500/50 bg-red-500/10' : 
                              'border-yellow-500/50 bg-yellow-500/10'}
                          `}
                        >
                          <CardContent className="p-4 space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{getSportIcon(battle.sport)}</span>
                                <span className="text-sm font-medium">{battle.sport}</span>
                              </div>
                              <Badge
                                variant={
                                  battle.result === "win" ? "default" : 
                                  battle.result === "lose" ? "destructive" : "secondary"
                                }
                                className="text-xs"
                              >
                                {battle.result === "win" ? t('dashboard.victory') : 
                                 battle.result === "lose" ? t('dashboard.defeat') : t('dashboard.draw')}
                              </Badge>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-sm">{battle.player1} vs {battle.player2}</p>
                              <p className="text-lg font-bold mt-1">{battle.score}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card data-onboarding="battle-stats-content">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg lg:text-xl font-semibold">{t('dashboard.battleStats')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm lg:text-base">{t('dashboard.totalBattles')}</span>
                  <span className="font-bold text-lg lg:text-xl">{allBattles.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm lg:text-base">{t('dashboard.wins')}</span>
                  <span className="font-bold text-lg lg:text-xl text-green-600">
                    {allBattles.filter(battle => battle.result === 'win').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm lg:text-base">{t('dashboard.winRate')}</span>
                  <span className="font-bold text-lg lg:text-xl text-blue-600">
                    {allBattles.length > 0 
                      ? Math.round((allBattles.filter(battle => battle.result === 'win').length / allBattles.length) * 100) 
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm lg:text-base">{t('dashboard.streak')}</span>
                  <span className="font-bold text-lg lg:text-xl text-orange-600">
                    {(() => {
                      let streak = 0;
                      for (let i = 0; i < allBattles.length; i++) {
                        if (allBattles[i].result === 'win') {
                          streak++;
                        } else {
                          break;
                        }
                      }
                      return streak;
                    })()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </div>
  );
}