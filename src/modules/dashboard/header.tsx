import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Settings, Users, LogOut, Trophy, Target, Zap, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '../../shared/ui/dropdown-menu';
import { Badge } from '../../shared/ui/badge';
import type { User } from '../../shared/interface/user';
import AvatarStorage from '../../shared/utils/avatar-storage';

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  const navigate = useNavigate();
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
    }`}>
      <div className="container-gaming">
        <div className="flex items-center justify-between h-14 sm:h-16 lg:h-18">
          {/* Logo */}
          <img
                        src={'/favicon.png'}
                        alt={'Logo'}
                        className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-10 rounded-full object-cover border-3 border-primary/50 shadow-xl"
                      />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4 lg:gap-6 xl:gap-8">
            <Link to="/dashboard" className="nav-gaming">
              <div className="flex items-center gap-1.5 lg:gap-2">
                <Trophy className="w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5" />
                <span className="text-sm lg:text-base">Dashboard</span>
              </div>
            </Link>
            <Link to="/battles" className="nav-gaming">
              <div className="flex items-center gap-1.5 lg:gap-2">
                <Zap className="w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5" />
                <span className="text-sm lg:text-base">Battles</span>
              </div>
            </Link>
            <Link to="/leaderboard" className="nav-gaming">
              <div className="flex items-center gap-1.5 lg:gap-2">
                <Target className="w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5" />
                <span className="text-sm lg:text-base">Leaderboard</span>
              </div>
            </Link>
            <Link to="/selection" className="nav-gaming">
              <div className="flex items-center gap-1.5 lg:gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5" />
                <span className="text-sm lg:text-base">Selection</span>
              </div>
            </Link>
          </nav>

          {/* User Section */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            {/* User Stats (Desktop) */}
            {user && (
              <div className="hidden md:flex items-center gap-2 lg:gap-4">
                <div className="stat-card bg-card/50 p-2 lg:p-3 rounded-lg lg:rounded-xl border border-border/50">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="text-center">
                      <div className="stat-value text-xs lg:text-sm xl:text-base font-semibold">{user.rank || 'N/A'}</div>
                      <div className="stat-label text-xs">Rank</div>
                    </div>
                    <div className="w-px h-6 lg:h-8 bg-border"></div>
                    <div className="text-center">
                      <div className="stat-value text-xs lg:text-sm xl:text-base font-semibold">{user.wins || 0}</div>
                      <div className="stat-label text-xs">Wins</div>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* User Menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-12 w-12 sm:h-14 sm:w-14 md:h-14 md:w-16 lg:h-14 lg:w-14 rounded-full hover:scale-105 transition-all duration-200">
                    <div className="relative">
                    <div 
                      className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-14 lg:w-14 lg:h-14 rounded-full overflow-hidden border-2 sm:border-3 border-primary/50 shadow-xl aspect-square"
                      style={{ clipPath: 'circle(50%)' }}
                    >
                                                <img
                            src={AvatarStorage.resolveAvatarUrl(user) || '/images/placeholder-user.jpg'}
                            alt={user.username || 'User'}
                            className="w-full h-full object-cover object-center"
                            style={{ clipPath: 'circle(50%)' }}
                          />
                    </div>
                      <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-4 lg:w-4 lg:h-4 bg-green-500 rounded-full border-1 sm:border-2 border-background"></div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-56 sm:w-64 lg:w-72 bg-card/95 backdrop-blur-sm border-border/50" 
                  align="end"
                >
                  <div className="p-3 sm:p-4 lg:p-5 border-b border-border/50">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div 
                        className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-14 lg:w-14 lg:h-14 rounded-full overflow-hidden border-2 sm:border-3 border-primary/50 shadow-xl aspect-square"
                        style={{ clipPath: 'circle(50%)' }}
                      >
                        <img
                          src={AvatarStorage.resolveAvatarUrl(user) || '/images/placeholder-user.jpg'}
                          alt={user.username || 'User'}
                          className="w-full h-full object-cover object-center"
                          style={{ clipPath: 'circle(50%)' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-rajdhani font-bold text-base sm:text-lg lg:text-xl text-foreground truncate">
                          {user.username || 'Player'}
                        </p>
                        <div className="rank-badge text-xs sm:text-sm lg:text-base font-semibold mt-1">
                          Rank #{user.rank || 'Unranked'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Mobile User Stats */}
                    <div className="lg:hidden mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/30">
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 text-center">
                        <div className="stat-card bg-card/50 p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-lg">
                          <div className="stat-value text-sm sm:text-base font-bold">{user.rank || 'N/A'}</div>
                          <div className="stat-label text-xs">Global Rank</div>
                        </div>
                        <div className="stat-card bg-card/50 p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-lg">
                          <div className="stat-value text-sm sm:text-base font-bold">{user.wins || 0}</div>
                          <div className="stat-label text-xs">Total Wins</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Navigation Items */}
                  <div className="lg:hidden">
                    <DropdownMenuItem onClick={() => navigate(`/${user.username}`)} className="hover:bg-card/50 py-2 sm:py-3">
                      <Trophy className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-sm sm:text-base">Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/battles')} className="hover:bg-card/50 py-2 sm:py-3">
                      <Zap className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-sm sm:text-base">Battles</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/leaderboard')} className="hover:bg-card/50 py-2 sm:py-3">
                      <Target className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-sm sm:text-base">Leaderboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/selection')} className="hover:bg-card/50 py-2 sm:py-3">
                      <SlidersHorizontal className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-sm sm:text-base">Selection</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border/50" />
                  </div>

                  <DropdownMenuItem onClick={() => navigate(`/${user.username}/profile`)} className="hover:bg-card/50 py-2 sm:py-3">
                    <Settings className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">Profile Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/${user.username}/friends`)} className="hover:bg-card/50 py-2 sm:py-3">
                    <Users className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">Friends</span>
                    {notificationCount > 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs sm:text-sm">
                        {notificationCount}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/${user.username}/notifications`)} className="hover:bg-card/50 py-2 sm:py-3">
                    <Bell className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">Notifications</span>
                    {notificationCount > 0 && (
                      <Badge variant="destructive" className="ml-auto text-xs sm:text-sm animate-neon-pulse">
                        {notificationCount}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive py-2 sm:py-3"
                  >
                    <LogOut className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">Sign Out</span>
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
