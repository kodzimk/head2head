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
import { useTranslation } from 'react-i18next';
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
    default: <Trophy className="w-6 h-6 text-gray-500" />
  };
  
  return sportIcons[sport.toLowerCase()] || sportIcons.default;
};

export default function Battles({
  user,  
  battles,
  setBattles,
}: {
  user: User;
  battles: RecentBattle[];
  setBattles: (battles: RecentBattle[]) => void;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBattles = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/db/get-user-battles?username=${user.username}`);
        setBattles(response.data);  
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching battles:', error);
        setIsLoading(false);
      }
    };  
    fetchBattles();
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
                ) : battles.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-base lg:text-lg mb-4">{t('dashboard.noBattlesYet')}</p>
                    <Button variant="outline" className="gap-2">
                      <Sword className="w-4 h-4" />
                      {t('dashboard.startFirstBattle')}
                    </Button>
                  </div>
                ) : (
                  battles.slice(0, 4).map((battle) => (
                    <div
                      key={battle.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 lg:p-4 border rounded-lg hover:shadow-sm transition-shadow bg-card"
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
                            {battle.sport}
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
                          {battle.result === "win" ? t('dashboard.victory') : 
                           battle.result === "lose" ? t('dashboard.defeat') : t('dashboard.draw')}
                        </Badge>
                        <p className="text-sm lg:text-lg font-bold text-right">{battle.score}</p>
                      </div>
                    </div>
                  ))
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
                  <span className="font-bold text-lg lg:text-xl">{user.totalBattles || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm lg:text-base">{t('dashboard.wins')}</span>
                  <span className="font-bold text-lg lg:text-xl text-green-600">{user.wins || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm lg:text-base">{t('dashboard.winRate')}</span>
                  <span className="font-bold text-lg lg:text-xl text-blue-600">{user.winRate || 0}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm lg:text-base">{t('dashboard.streak')}</span>
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
