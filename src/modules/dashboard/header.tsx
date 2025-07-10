import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, LogOut, Target, Zap, SlidersHorizontal, Pickaxe, Home, Bell, User } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '../../shared/ui/dropdown-menu';
import { UserAvatar } from '../../shared/ui/user-avatar';
import { LanguageFlag } from '../../shared/ui/language-switcher';
import { useGlobalStore } from '../../shared/interface/gloabL_var';


export default function Header() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useGlobalStore();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const notificationCount = (user?.friendRequests?.length || 0) + (user?.invitations?.length || 0);

  return (
    <header className={`header-gaming transition-all duration-300 ${
      isScrolled ? 'bg-background/90 shadow-gaming' : 'bg-background/80'
    } sticky top-0 z-50 w-full border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60`}>
      <div className="container-gaming">
        <div className="flex items-center justify-between h-14 sm:h-16 lg:h-18">
          <div className="flex items-center gap-2">
          {/* Logo */}
          <img
                        src={'/favicon.png'}
                        alt={'Logo'}
                        className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-10 rounded-full  border-primary/50 shadow-xl"
                      />
                      <h1 className="text-2xl font-bold hidden md:block">head2head</h1>
          </div>
          {/* Desktop Navigation */}
          <nav 
            className="hidden lg:flex items-center gap-4 lg:gap-6 xl:gap-8"
            data-onboarding="navigation"
          >
            <Link to="/dashboard" className="nav-gaming">
              <div className="flex items-center gap-1.5 lg:gap-2">
                <Home className="w-3.5 h-3.5 lg:w-4  lg:h-4 xl:w-5 xl:h-5" />
                <span className="text-sm lg:text-base">{t('navigation.home')}</span>
              </div>
            </Link>
            <Link to="/battles" className="nav-gaming">
              <div className="flex items-center gap-1.5 lg:gap-2">
                <Zap className="w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5" />
                <span className="text-sm lg:text-base">{t('navigation.battles')}</span>
              </div>
            </Link>
            <Link to="/leaderboard" className="nav-gaming">
              <div className="flex items-center gap-1.5 lg:gap-2">
                <Target className="w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5" />
                <span className="text-sm lg:text-base">{t('navigation.leaderboard')}</span>
              </div>
            </Link>
            <Link to="/forum" className="nav-gaming">
              <div className="flex items-center gap-1.5 lg:gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5" />
                <span className="text-sm lg:text-base">{t('forum.forum')}</span>
              </div>
            </Link>
            <Link to={`/${user?.username}/trainings`} className="nav-gaming"> 
              <div className="flex items-center gap-1.5 lg:gap-2">
                <Pickaxe className="w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5" />
                <span className="text-sm lg:text-base">{t('navigation.training')}</span>
              </div>
            </Link>
          </nav>

          {/* User Section */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">

            {/* Language Switcher */}
            <LanguageFlag className="transition-transform hover:scale-110" />

            {/* User Menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger 
                  asChild
                  data-onboarding="user-avatar"
                >
                  <Button variant="ghost" className="relative h-12 w-12 sm:h-14 sm:w-14 md:h-14 md:w-16 lg:h-14 lg:w-14 rounded-full hover:scale-105 transition-all duration-200">
                    <div className="relative">
                      <UserAvatar 
                        user={user}
                        size="xl"
                        variant="gaming"
                        status="online"
                        showBorder={true}
                        showGlow={true}
                        className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-14 lg:w-14 lg:h-14"
                      />
                      
                      {/* Notification Badge */}
                      {notificationCount > 0 && (
                        <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] sm:min-w-[24px] sm:h-[24px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg z-20" style={{ animation: 'pulse 2s infinite' }}>
                          <span className="text-[10px] sm:text-xs font-bold text-white leading-none">
                            {notificationCount > 99 ? '99+' : notificationCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-56 sm:w-64 lg:w-72 bg-card/95 backdrop-blur-sm border-border/50" 
                  align="end"
                >
                  <div className="p-3 sm:p-4 lg:p-5 border-b border-border/50">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <UserAvatar 
                        user={user}
                        size="xl"
                        variant="gaming"
                        showBorder={true}
                        className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-14 lg:w-14 lg:h-14"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-rajdhani font-bold text-base sm:text-lg lg:text-xl text-foreground truncate">
                          {user.username || 'Player'}
                        </p>
                        <div className="rank-badge text-xs sm:text-sm lg:text-base font-semibold mt-1">
                          Rank #{user.rank || 'Unranked'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Navigation Items */}
                  <div className="lg:hidden">
                    <DropdownMenuItem onClick={() => navigate(`/${user.username}`)} className="hover:bg-card/50 py-2 sm:py-3">
                      <Home className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-sm sm:text-base">{t('navigation.home')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/battles')} className="hover:bg-card/50 py-2 sm:py-3">
                      <Zap className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-sm sm:text-base">{t('navigation.battles')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/leaderboard')} className="hover:bg-card/50 py-2 sm:py-3">
                      <Target className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-sm sm:text-base">{t('navigation.leaderboard')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/forum')} className="hover:bg-card/50 py-2 sm:py-3">
                      <SlidersHorizontal className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-sm sm:text-base">{t('forum.forum')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/${user.username}/trainings`)} className="hover:bg-card/50 py-2 sm:py-3">
                      <Pickaxe className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-sm sm:text-base">{t('navigation.training')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border/50" />
                  </div>

                  <DropdownMenuItem onClick={() => navigate(`/${user.username}/notifications`)} className="hover:bg-card/50 py-2 sm:py-3 relative">
                    <Bell className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">{t('navigation.notifications')}</span>
                    {notificationCount > 0 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[20px] h-[20px] bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-[10px] font-bold text-white leading-none px-1">
                          {notificationCount > 99 ? '99+' : notificationCount}
                        </span>
                      </div>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/${user.username}/profile`)} className="hover:bg-card/50 py-2 sm:py-3">
                      <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-sm sm:text-base">{t('navigation.profile')}</span>
                    </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/${user.username}/friends`)} className="hover:bg-card/50 py-2 sm:py-3">
                    <Users className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">{t('navigation.friends')}</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive hover:bg-destructive/10 py-2 sm:py-3">
                    <LogOut className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">{t('auth.signOut')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
    
        </div>
      </div>
    </header>
  );
}
