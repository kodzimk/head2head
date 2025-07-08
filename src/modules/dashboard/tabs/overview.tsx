import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card"
import { TabsContent } from "../../../shared/ui/tabs"
import { Button } from "../../../shared/ui/button"
import { Badge } from "../../../shared/ui/badge"
import { Settings, Sword, Trophy, Target, Zap } from "lucide-react"
import type { User, RecentBattle } from '../../../shared/interface/user'
import { useNavigate } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import { API_BASE_URL } from "../../../shared/interface/gloabL_var"
import AvatarStorage from "../../../shared/utils/avatar-storage"
import { useEffect, useState } from "react"
import { UserAvatar } from "../../../shared/ui/user-avatar"
import axios from "axios"

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

const normalizeSport = (sport: string): string => {
  const validSports = [
    'football', 'basketball', 'baseball', 'hockey', 
    'tennis', 'golf', 'cricket', 'rugby', 'volleyball'
  ];
  
  const normalizedSport = sport?.toLowerCase()?.trim() || '';
  return validSports.includes(normalizedSport) ? normalizedSport : 'football';
};
  
export default function Overview({
  user, 
  battles: initialBattles
}: {
  user: User, 
  battles: RecentBattle[]
}) {
  const navigate = useNavigate()  
  const { t } = useTranslation()
  const [battles, setBattles] = useState<RecentBattle[]>(initialBattles);
  const [isLoading, setIsLoading] = useState(initialBattles.length === 0);
 
  // Fetch and cache user avatar if needed
  useEffect(() => {
    const fetchAndCacheAvatar = async () => {
      if (user?.username) {
        const persistentAvatar = await AvatarStorage.getAvatar(user.username);
        if (!persistentAvatar && user.avatar) {
          try {
            // Build full avatar URL
            const fullAvatarUrl = user.avatar.startsWith('http') 
              ? user.avatar 
              : `${API_BASE_URL}${user.avatar}`;
            
            // Fetch and cache the server avatar
            const response = await fetch(fullAvatarUrl);
            if (response.ok) {
              const blob = await response.blob();
              const file = new File([blob], 'avatar.jpg', { type: blob.type });
              await AvatarStorage.saveAvatar(user.username, file);
              console.log('[Overview] Cached server avatar for', user.username);
            }
          } catch (error) {
            console.warn('[Overview] Failed to cache server avatar:', error);
          }
        }
      }
    };

    fetchAndCacheAvatar();
  }, [user?.username, user?.avatar]);

  // Update battles if initial battles change
  useEffect(() => {
    if (initialBattles.length > 0) {
      setBattles(initialBattles);
      setIsLoading(false);
    }
  }, [initialBattles]);

  // Fetch battles if not already loaded
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
        
        // Update battles if fetched data is different
        if (mapped.length !== battles.length) {
          setBattles(mapped);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching all battles:', error);
        setIsLoading(false);
      }
    };  
    
    // Only fetch if we don't have battles or want to refresh
    if (initialBattles.length === 0) {
      fetchAllBattles();
    }
  }, [user.username, initialBattles]);

  return (
      <TabsContent value="overview" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card 
          className="lg:col-span-1"
          data-onboarding="overview-profile"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserAvatar 
                user={user}
                size="lg"
                variant="gaming"
                showBorder={true}
                className="w-10 h-10 md:w-12 md:h-10 lg:w-12 lg:h-12"
              />
              <div>
                <h3 className="font-bold text-sm lg:text-base">{user.username}</h3>
                <p className="text-xs lg:text-sm text-gray-600">@{user.username}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 lg:space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 text-xs lg:text-sm">{t('dashboard.globalRank')}</span>
                <span className="font-semibold text-xs lg:text-sm">#{user.rank}</span>
              </div>
              <div className="sm:hidden flex justify-between">
                <span className="text-gray-600 text-xs lg:text-sm">{t('dashboard.streak')}</span>
                <span className="font-semibold text-xs lg:text-sm">{user.streak}</span>
              </div>
              <div className=" flex justify-between">
                <span className="text-gray-600 text-xs lg:text-sm">{t('dashboard.totalWins')}</span>
                <span className="font-semibold text-xs lg:text-sm">{user.wins}</span>
              </div>
              <div className="sm:hidden flex justify-between">
                <span className="text-gray-600 text-xs lg:text-sm">{t('dashboard.winRate')}</span>
                <span className="font-semibold text-xs lg:text-sm">{user.winRate}%</span>
              </div>
      
              <div className="sm:hidden flex justify-between">
                <span className="text-gray-600 text-xs lg:text-sm">{t('dashboard.battlesPlayed')}</span>
                <span className="font-semibold text-xs lg:text-sm">{user.totalBattles}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-xs lg:text-sm">{t('dashboard.favoriteSport')}</span>
                <div className="flex items-center gap-1">
                  {getSportIcon(user.favoritesSport)}
                  <span className="font-semibold text-xs lg:text-sm">{user.favoritesSport}</span>
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full text-xs lg:text-sm" onClick={() => navigate("/profile")}>
              <Settings className="w-3 h-3 lg:w-4 lg:h-4 mr-2" />
              {t('dashboard.editProfile')}
            </Button>
          </CardContent>
        </Card>
    
        <Card 
          className="lg:col-span-2"
          data-onboarding="recent-battles"
        >
          <CardHeader>
            <CardTitle className="text-lg lg:text-xl">{t('dashboard.recentBattles')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 lg:space-y-4">
              {isLoading ? (
                <div className="text-center py-6 lg:py-8">
                  <p className="text-gray-500 text-base lg:text-lg mb-4">{t('dashboard.loadingBattles')}</p>
                </div>
              ) : battles.length === 0 ? (
                <div className="text-center py-6 lg:py-8">
                  <p className="text-gray-500 text-base lg:text-lg mb-4">{t('dashboard.noBattlesYet')}</p>
                  <Button 
                    variant="outline" 
                    className="gap-2 text-xs lg:text-sm"
                    data-onboarding="start-battle-button"
                    onClick={() => navigate('/battles')}
                  >
                    <Sword className="w-3 h-3 lg:w-4 lg:h-4" />
                    {t('dashboard.startFirstBattle')}
                  </Button>
                </div>
              ) : (
                battles.slice(0, 3).map((battle) => (
                  <div
                    key={battle.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 lg:p-4 border rounded-lg hover:shadow-sm transition-shadow bg-card"
                  >
                    <div className="flex items-center gap-3 mb-3 sm:mb-0">
                      <div className="flex-shrink-0">
                        {getSportIcon(battle.sport)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm lg:text-base truncate">{battle.player1} vs {battle.player2}</p>
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
      </div>
    </TabsContent>
  )
}