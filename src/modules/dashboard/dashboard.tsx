import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const getAllDashboardOnboardingSteps = () => [
  {
    id: "welcome",
    target: "[data-onboarding='welcome-section']",
    title: "Welcome to Head2Head! 🎮",
    description: "This is your gaming command center! Here you can track stats, start battles, and manage your competitive journey. Let's explore the key features together.",
    position: "auto" as const,
    offset: { x: 0, y: 20 }
  },
  {
    id: "user-avatar",
    target: "[data-onboarding='user-avatar']",
    title: "Your Player Hub 👤",
    description: "Click your avatar to access profile settings and notifications. The red dot shows new friend requests or battle invitations waiting for you.",
    position: "auto" as const,
    offset: { x: 0, y: 15 }
  },
  {
    id: "navigation",
    target: "[data-onboarding='navigation']",
    title: "Navigate Like a Pro 🧭",
    description: "Access all platform sections: Dashboard (home), Battles (compete), Leaderboard (rankings), Selection (find opponents), and Trainings (practice).",
    position: "auto" as const,
    offset: { x: 0, y: 15 }
  },
  {
    id: "stats-grid",
    target: "[data-onboarding='stats-grid']",
    title: "Track Your Progress 📊",
    description: "Monitor your performance at a glance: global rank, total wins, battles played, and draws. These update automatically as you compete.",
    position: "auto" as const,
    offset: { x: 0, y: 20 }
  },
  {
    id: "battle-stats-breakdown",
    target: "[data-onboarding='battle-stats-breakdown']",
    title: "Battle Statistics Breakdown 🏆",
    description: "Get a comprehensive overview of your battle performance! See your wins, draws, losses, and current streak with percentages. This visual breakdown helps you track your competitive progress at a glance.",
    position: "auto" as const,
    offset: { x: 0, y: 20 }
  },
  {
    id: "overview-profile",
    target: "[data-onboarding='overview-profile']",
    title: "Your Profile Card 🏷️",
    description: "View detailed stats including rank, wins, and favorite sport. Click 'Edit Profile' to customize your gaming identity.",
    position: "auto" as const,
    offset: { x: 20, y: 0 }
  },
  {
    id: "recent-battles",
    target: "[data-onboarding='recent-battles']",
    title: "Battle History 📜",
    description: "See your recent matches with opponents, sports, results, and scores. Start your first battle to populate this section!",
    position: "auto" as const,
    offset: { x: -20, y: 0 }
  },
  {
    id: "battle-history-content",
    target: "[data-onboarding='battle-history-content']",
    title: "Your Battle History ⚔️",
    description: "See all your completed battles with opponents, sports played, match results, and scores. Each battle shows who you fought, what sport, and whether you won, lost, or drew.",
    position: "auto" as const,
    offset: { x: 0, y: 20 }
  },
  {
    id: "battle-stats-content",
    target: "[data-onboarding='battle-stats-content']",
    title: "Detailed Battle Statistics 📊",
    description: "Track your competitive performance: total battles fought, wins achieved, win rate percentage, and current winning streak. Perfect for monitoring your improvement!",
    position: "auto" as const,
    offset: { x: 0, y: 20 }
  },
  {
    id: "friends-list-content",
    target: "[data-onboarding='friends-list-content']",
    title: "Your Friends List 👥",
    description: "View all your friends with their avatars, usernames, and ranks. Click on any friend to visit their profile, challenge them to battles, or see their achievements.",
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [battles, setBattles] = useState<RecentBattle[]>([]);
  const [onboardingSteps, setOnboardingSteps] = useState(getDashboardOnboardingSteps());

  const handleOnboardingComplete = () => {
    console.log('Dashboard onboarding completed');
  };

  // Handle responsive onboarding steps
  useEffect(() => {
    const handleResize = () => {
      setOnboardingSteps(getDashboardOnboardingSteps());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Force clear onboarding on first load for testing
  useEffect(() => {
    // Uncomment the line below to force onboarding to show every time
    // localStorage.removeItem("head2head-dashboard-onboarding");
    console.log("[Dashboard] Onboarding status:", localStorage.getItem("head2head-dashboard-onboarding"));
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        
        if (!token) {
          navigate('/sign-in');
          return;
        }

        // First try to get user data from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setLoading(false);
          return;
        }

        // If no localStorage data, fetch from API
        try {
          const response = await axios.get(`${API_BASE_URL}/db/get-user?token=${token}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.data) {
            const userData = response.data;
            const formattedUser = {
              email: userData.email,
              username: userData.username,
              nickname: userData.username,
              wins: userData.winBattle,
              favoritesSport: userData.favourite,
              rank: userData.ranking,
              winRate: userData.winRate,
              totalBattles: userData.totalBattle,
              streak: userData.streak,
              password: userData.password,
              avatar: userData.avatar,
              friends: userData.friends || [],
              friendRequests: userData.friendRequests || [],
              battles: userData.battles || [],
              invitations: userData.invitations || []
            };
            
            setUser(formattedUser);
            // Store in localStorage for future use
            localStorage.setItem('user', JSON.stringify(formattedUser));
          } else {
            setError('No user data received from server');
          }
        } catch (apiError: any) {
          console.error('Error fetching user data from API:', apiError);
          if (apiError.response?.status === 401) {
            // Token is invalid, redirect to sign-in
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            localStorage.removeItem('username');
            navigate('/sign-in');
            return;
          }
          setError('Failed to load user data. Please try signing in again.');
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [navigate, setUser]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error || 'Failed to load user data'}</p>
          <Button onClick={() => navigate('/sign-in')}>Sign In Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Onboarding */}
      <Onboarding
        steps={onboardingSteps}
        onComplete={handleOnboardingComplete}
        storageKey="head2head-dashboard-onboarding"
        autoStart={true}
      />

      <Header user={user} />

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
                  Welcome back, {user?.nickname || user?.username || 'Player'}
                </h1>
              </div>
              <p className="text-responsive-sm text-muted-foreground font-rajdhani max-w-2xl">
                Ready for your next gaming challenge? Your opponents are waiting.
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
                Quick Battle
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/training')}
                className="border-primary/30 hover:border-primary/60 hover:bg-primary/5"
              >
                <Target className="w-4 h-4 mr-2" />
                Practice Mode
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
            <div className="stat-label">Global Rank</div>
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
            <div className="stat-label">Total Wins</div>
          </div>

          <div className="stat-card animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-3">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/25">
                {Math.round(user?.winRate || 0)}%
              </Badge>
            </div>
            <div className="stat-value text-blue-400">{user?.totalBattles || 0}</div>
            <div className="stat-label">Battles Played</div>
          </div>

          {/* Enhanced Draw Statistics Card */}
          <div className="stat-card animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-5 h-5 sm:w-6 sm:h-6 text-warning flex items-center justify-center">
                🤝
              </div>
              <Badge variant="secondary" className="bg-warning/15 text-warning border-warning/25">
                <span className="text-xs">Win Rate</span>
              </Badge>
            </div>
            <div className="stat-value text-warning">
              {user?.winRate || 0}%
            </div>
            <div className="stat-label">Win Rate</div>
          </div>
        </div>

        {/* Battle Statistics Breakdown */}
        <Card className="mb-6 sm:mb-8" data-onboarding="battle-stats-breakdown">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg lg:text-xl font-semibold">
              <Trophy className="w-5 h-5 text-orange-500" />
              Battle Statistics Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Wins */}
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-green-600 mb-1">
                  {stats.wins}
                </div>
                <div className="text-sm lg:text-base font-medium text-foreground mb-1">Wins</div>
                <div className="text-xs lg:text-sm text-green-600 font-medium">
                  {stats.winPercentage}%
                </div>
              </div>
              
              {/* Draws */}
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-yellow-600 mb-1">
                  {stats.draws}
                </div>
                <div className="text-sm lg:text-base font-medium text-foreground mb-1">Draws</div>
                <div className="text-xs lg:text-sm text-yellow-600 font-medium">
                  {stats.drawPercentage}%
                </div>
              </div>
              
              {/* Losses */}
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-red-600 mb-1">
                  {stats.losses}
                </div>
                <div className="text-sm lg:text-base font-medium text-foreground mb-1">Losses</div>
                <div className="text-xs lg:text-sm text-red-600 font-medium">
                  {stats.lossPercentage}%
                </div>
              </div>
              
              {/* Streak */}
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-orange-600 mb-1">
                  {user?.streak || 0}
                </div>
                <div className="text-sm lg:text-base font-medium text-foreground mb-1">Streak</div>
                <div className="text-xs lg:text-sm text-orange-600 font-medium">
                  {(user?.streak || 0) > 0 ? 'Win Streak' : 'No Streak'}
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
              <span className="hidden xs:inline">Overview</span>
              <span className="xs:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger 
              value="battles" 
              className="nav-gaming flex items-center justify-center gap-1 sm:gap-2 h-full text-xs sm:text-sm lg:text-base font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 rounded-md"
            >
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 flex-shrink-0" />
              <span className="hidden xs:inline">My Battles</span>
              <span className="xs:hidden">Battles</span>
            </TabsTrigger>
            <TabsTrigger 
              value="friends" 
              className="nav-gaming flex items-center justify-center gap-1 sm:gap-2 h-full text-xs sm:text-sm lg:text-base font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 rounded-md"
            >
              <Users className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 flex-shrink-0" />
              <span className="hidden xs:inline">Friends</span>
              <span className="xs:hidden">Social</span>
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
