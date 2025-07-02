import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  Trophy, 
  Users,
  Target, 
  Zap, 
  TrendingUp, 
  Flame,
  ArrowRight, 
  Award,
  Play
} from 'lucide-react';
import Header from './header';
import { Button } from '../../shared/ui/button';
import { Badge } from '../../shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import Overview from './tabs/overview';
import Battles from './tabs/battles';
import Friends from './tabs/friends';
import type { User, RecentBattle } from '../../shared/interface/user';
import { API_BASE_URL } from '../../shared/interface/gloabL_var';
import Onboarding from '../../shared/ui/onboarding';
import { useGlobalStore } from '../../shared/interface/gloabL_var';

const getAllDashboardOnboardingSteps = () => [
  {
    id: "welcome",
    target: "[data-onboarding='welcome-section']",
    translationKey: "welcome",
    position: "auto" as const,
    offset: { x: 0, y: 20 }
  },
  {
    id: "user-avatar",
    target: "[data-onboarding='user-avatar']",
    translationKey: "userAvatar",
    position: "auto" as const,
    offset: { x: 0, y: 15 }
  },
  {
    id: "navigation",
    target: "[data-onboarding='navigation']",
    translationKey: "navigation",
    position: "auto" as const,
    offset: { x: 0, y: 15 }
  },
  {
    id: "stats-grid",
    target: "[data-onboarding='stats-grid']",
    translationKey: "statsGrid",
    position: "auto" as const,
    offset: { x: 0, y: 20 }
  },
  {
    id: "battle-stats-breakdown",
    target: "[data-onboarding='battle-stats-breakdown']",
    translationKey: "battleStatsBreakdown",
    position: "auto" as const,
    offset: { x: 0, y: 20 }
  },
  {
    id: "overview-profile",
    target: "[data-onboarding='overview-profile']",
    translationKey: "overviewProfile",
    position: "auto" as const,
    offset: { x: 20, y: 0 }
  },
  {
    id: "recent-battles",
    target: "[data-onboarding='recent-battles']",
    translationKey: "recentBattles",
    position: "auto" as const,
    offset: { x: -20, y: 0 }
  },
  {
    id: "battle-history-content",
    target: "[data-onboarding='battle-history-content']",
    translationKey: "battleHistoryContent",
    position: "auto" as const,
    offset: { x: 0, y: 20 }
  },
  {
    id: "battle-stats-content",
    target: "[data-onboarding='battle-stats-content']",
    translationKey: "battleStatsContent",
    position: "auto" as const,
    offset: { x: 0, y: 20 }
  },
  {
    id: "friends-list-content",
    target: "[data-onboarding='friends-list-content']",
    translationKey: "friendsListContent",
    position: "auto" as const,
    offset: { x: 0, y: 20 }
  }
];

// Filter steps based on device type
const getDashboardOnboardingSteps = () => {
  const isMobile = window.innerWidth < 768;
  const allSteps = getAllDashboardOnboardingSteps();
  
  if (isMobile) {
    // Remove navigation step on mobile devices
    return allSteps.filter(step => step.id !== "navigation");
  }
  
  return allSteps;
};

export function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error] = useState<string | null>(null);
  const [battles, setBattles] = useState<RecentBattle[]>([]);
  const [onboardingSteps, setOnboardingSteps] = useState(getDashboardOnboardingSteps());
  const { user, setUser } = useGlobalStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if this is a new user by looking for the isNewUser flag in localStorage
    const isNewUser = localStorage.getItem('isNewUser') === 'true';
    setShowOnboarding(isNewUser);
    
    // Remove the flag after checking it
    if (isNewUser) {
      localStorage.removeItem('isNewUser');
    }
  }, []);

  const handleOnboardingComplete = () => {
    console.log('Dashboard onboarding completed');
    setShowOnboarding(false);
  };

  // Handle responsive onboarding steps
  useEffect(() => {
    const handleResize = () => {
      setOnboardingSteps(getDashboardOnboardingSteps());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchBattles = async () => {
    if (!localStorage.getItem("username")) return;
    
    try {
     
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
        const secondScore = parseInt(battle.second_opponent_score) || 0;
        
        // Enhanced draw detection and result calculation
        if (battle.first_opponent === currentUser) {
          if (firstScore > secondScore) {
            result = "win";
          } else if (firstScore < secondScore) {
            result = "lose";
          } else {
            // Explicit draw case
            result = "draw";
            console.log(`[Dashboard] Draw detected for ${currentUser}: ${firstScore} vs ${secondScore}`);
          }
        } else if (battle.second_opponent === currentUser) {
          if (secondScore > firstScore) {
            result = "win";
          } else if (secondScore < firstScore) {
            result = "lose";
          } else {
            // Explicit draw case
            result = "draw";
            console.log(`[Dashboard] Draw detected for ${currentUser}: ${secondScore} vs ${firstScore}`);
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
      console.log('[Battles Tab] Successfully fetched battles:', mapped.length);
    } catch (error) {
      console.error("[Battles Tab] Error fetching battles:", error);
    } finally {
     
    }
  };
  
    useEffect(() => {
    fetchBattles();
    
    // Listen for battle finished events to refresh data
    const handleBattleFinished = (event: any) => {
      console.log('[Battles Tab] Battle finished event received:', event.detail);
      console.log('[Battles Tab] Refreshing battle data...');
      
      // Update user stats if provided in the event
      if (event.detail.updated_users && event.detail.updated_users[user?.username || '']) {
        const updatedStats = event.detail.updated_users[user?.username || ''];
        console.log('[Battles Tab] Updating user stats:', updatedStats);
        
        // Update the user object with new stats using setUser
        const updatedUser = {
          ...user,
          totalBattles: updatedStats.totalBattle,
          wins: updatedStats.winBattle,
          winRate: updatedStats.winRate,
          streak: updatedStats.streak,
        };
        
        // Update global store
        setUser(updatedUser as User);
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      // Refresh battles list
      fetchBattles();
    };

    window.addEventListener('battleFinished', handleBattleFinished);
    
    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('battleFinished', handleBattleFinished);
    };
  }, [user]);

  const calculateBattleStats = () => {
    const totalBattles = battles.length;
    const wins = battles.filter(battle => battle.result === 'win').length;
    const draws = battles.filter(battle => battle.result === 'draw').length;
    const losses = battles.filter(battle => battle.result === 'lose').length;
    
    const winPercentage = totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0;
    const drawPercentage = totalBattles > 0 ? Math.round((draws / totalBattles) * 100) : 0;
    const lossPercentage = totalBattles > 0 ? Math.round((losses / totalBattles) * 100) : 0;
    
    return { wins, draws, losses, winPercentage, drawPercentage, lossPercentage };
  };

  const stats = calculateBattleStats();


  if (error || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error || t('dashboard.error.failedToLoad')}</p>
          <Button onClick={() => navigate('/sign-in')}>{t('dashboard.error.signInAgain')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Onboarding */}
      {showOnboarding && (
        <Onboarding
          steps={onboardingSteps}
          onComplete={handleOnboardingComplete}
          storageKey="head2head-dashboard-onboarding"
          autoStart={true}
        />
      )}

      <Header />

      <main className="container-gaming py-8">
        {/* Welcome Section */}
        <div 
          className="mb-6 sm:mb-8"
          data-onboarding="welcome-section"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-gaming-lg text-foreground font-rajdhani">
                  {t('dashboard.welcome')}, {user?.nickname || user?.username || 'Player'}
                </h1>
              </div>
              <p className="text-responsive-sm text-muted-foreground font-rajdhani max-w-2xl">
                {t('dashboard.readyForChallenge')}
              </p>
            </div>

            {/* Quick Actions */}
            <div 
              className="flex flex-col sm:flex-row gap-3"
              data-onboarding="quick-actions"
            >
              <Button 
                onClick={() => navigate('/battles')} 
                className="btn-neon group"
              >
                <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                {t('dashboard.quickBattle')}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/${user?.username}/trainings`)}
                className="border-primary/30 hover:border-primary/60 hover:bg-primary/5"
              >
                <Target className="w-4 h-4 mr-2" />
                {t('dashboard.practiceMode')}
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div 
          className="grid-stats mb-6 sm:mb-8"
          data-onboarding="stats-grid"
        >
          <div className="stat-card animate-scale-in">
            <div className="flex items-center justify-between mb-3">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <Badge variant="secondary" className="bg-success/15 text-success border-success/25">
                <TrendingUp className="w-3 h-3 mr-1" />
                #{user?.rank || 'N/A'}
              </Badge>
            </div>
            <div className="stat-value">{user?.rank || 'N/A'}</div>
            <div className="stat-label">{t('dashboard.globalRank')}</div>
          </div>

          <div className="stat-card animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-3">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
              <Badge variant="secondary" className="bg-success/15 text-success border-success/25">
                <Flame className="w-3 h-3 mr-1" />
                {user?.streak || 0}
              </Badge>
            </div>
            <div className="stat-value text-success">{user?.wins || 0}</div>
            <div className="stat-label">{t('dashboard.totalWins')}</div>
          </div>

          <div className="stat-card animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-3">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/25">
                {Math.round(user?.winRate || 0)}%
              </Badge>
            </div>
            <div className="stat-value text-blue-400">{user?.totalBattles || 0}</div>
            <div className="stat-label">{t('dashboard.battlesPlayed')}</div>
          </div>

          {/* Enhanced Draw Statistics Card */}
          <div className="stat-card animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-5 h-5 sm:w-6 sm:h-6 text-warning flex items-center justify-center">
                🤝
              </div>
              <Badge variant="secondary" className="bg-warning/15 text-warning border-warning/25">
                <span className="text-xs">{t('dashboard.winRate')}</span>
              </Badge>
            </div>
            <div className="stat-value text-warning">
              {user?.winRate || 0}%
            </div>
            <div className="stat-label">{t('dashboard.winRate')}</div>
          </div>
        </div>

        {/* Battle Statistics Breakdown */}
        <Card className="mb-6 sm:mb-8" data-onboarding="battle-stats-breakdown">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg lg:text-xl font-semibold">
              <Trophy className="w-5 h-5 text-orange-500" />
              {t('dashboard.battleStatsBreakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Wins */}
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-green-600 mb-1">
                  {stats.wins}
                </div>
                <div className="text-sm lg:text-base font-medium text-foreground mb-1">{t('dashboard.wins')}</div>
                <div className="text-xs lg:text-sm text-green-600 font-medium">
                  {stats.winPercentage}%
                </div>
              </div>
              
              {/* Draws */}
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-yellow-600 mb-1">
                  {stats.draws}
                </div>
                <div className="text-sm lg:text-base font-medium text-foreground mb-1">{t('dashboard.draws')}</div>
                <div className="text-xs lg:text-sm text-yellow-600 font-medium">
                  {stats.drawPercentage}%
                </div>
              </div>
              
              {/* Losses */}
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-red-600 mb-1">
                  {stats.losses}
                </div>
                <div className="text-sm lg:text-base font-medium text-foreground mb-1">{t('dashboard.losses')}</div>
                <div className="text-xs lg:text-sm text-red-600 font-medium">
                  {stats.lossPercentage}%
                </div>
              </div>
              
              {/* Streak */}
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-orange-600 mb-1">
                  {user?.streak || 0}
                </div>
                <div className="text-sm lg:text-base font-medium text-foreground mb-1">{t('dashboard.streak')}</div>
                <div className="text-xs lg:text-sm text-orange-600 font-medium">
                  {(user?.streak || 0) > 0 ? t('dashboard.winStreak') : t('dashboard.noStreak')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Tabs */}
        <Tabs 
          defaultValue="overview" 
          className="space-y-4 sm:space-y-6"
          data-onboarding="dashboard-tabs"
        >
          <TabsList className="grid w-full grid-cols-3 bg-card/95 backdrop-blur-md border border-border/50 shadow-xl h-12 sm:h-14 lg:h-16 p-1 rounded-lg">
            <TabsTrigger 
              value="overview" 
              className="nav-gaming flex items-center justify-center gap-1 sm:gap-2 h-full text-xs sm:text-sm lg:text-base font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 rounded-md"
            >
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 flex-shrink-0" />
              <span className="hidden xs:inline">{t('dashboard.overview')}</span>
              <span className="xs:hidden">{t('dashboard.stats')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="battles" 
              className="nav-gaming flex items-center justify-center gap-1 sm:gap-2 h-full text-xs sm:text-sm lg:text-base font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 rounded-md"
            >
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 flex-shrink-0" />
              <span className="hidden xs:inline">{t('dashboard.myBattles')}</span>
              <span className="xs:hidden">{t('dashboard.battles')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="friends" 
              className="nav-gaming flex items-center justify-center gap-1 sm:gap-2 h-full text-xs sm:text-sm lg:text-base font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 rounded-md"
            >
              <Users className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 flex-shrink-0" />
              <span className="hidden xs:inline">{t('dashboard.friends')}</span>
              <span className="xs:hidden">{t('dashboard.social')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6 animate-fade-in">
            <Overview user={user} battles={battles} />
          </TabsContent>

          <TabsContent value="battles" className="space-y-4 sm:space-y-6 animate-fade-in">
            <Battles user={user} battles={battles} setBattles={setBattles} />
          </TabsContent>

          <TabsContent value="friends" className="space-y-4 sm:space-y-6 animate-fade-in">
            <Friends user={user} />
          </TabsContent>
        </Tabs>

      </main>
    </div>
  );
}

export default Dashboard