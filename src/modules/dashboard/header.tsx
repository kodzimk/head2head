import { Avatar, AvatarFallback, AvatarImage } from "../../shared/ui/avatar";
import type { User } from "../../shared/interface/user";
import { Button } from "../../shared/ui/button";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../shared/ui/dropdown-menu";
import { LogOut, User as UserIcon, BookOpen, Trophy, List, Users, Play, Home } from "lucide-react";
import { Link } from "react-router-dom";

export default function Header({ user }: { user: User }) {
  const navigate = useNavigate();

  function handleSignOut(){
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    localStorage.removeItem("user");
    navigate("/");
  }

  return (
    <header className="px-2 sm:px-4 lg:px-6 h-16 flex items-center justify-between bg-white/60 backdrop-blur border-b border-slate-200 w-full">
      <a href="#hero" className="flex items-center justify-center">
        <div className="flex items-center gap-2 sm:gap-3 ml-2 sm:ml-8">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-orange-500">
            <p className="font-bold text-white text-sm sm:text-base">h2h</p>
          </div>
          <span className="hidden xl:block font-bold text-lg sm:text-xl text-slate-900">
            head2head
          </span>
        </div>
      </a>

      <nav className="flex items-center gap-4">
        {/* Desktop Navigation */}
        <div className="hidden lg:flex gap-6 items-center">
        
        <Link to="/battle">
            <Button variant="ghost" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100">
              <Play className="mr-2 h-4 w-4" />
              <span>Battle</span>
            </Button>
          </Link>
          <Link to="/selection">
            <Button variant="ghost" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100">
              <List className="mr-2 h-4 w-4" />
              <span>Selection</span>
            </Button>
          </Link>
          <Link to="/leaderboard">
            <Button variant="ghost" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100">
              <Trophy className="mr-2 h-4 w-4" />
              <span>Leaderboard</span>
            </Button>
          </Link>
          <Link to="/trainings">
            <Button variant="ghost" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100">
              <BookOpen className="mr-2 h-4 w-4" />
              <span>Trainings</span>
            </Button>
          </Link>
          <Link to="/friend">
            <Button variant="ghost" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100">
              <Users className="mr-2 h-4 w-4" />
              <span>Friends</span>
            </Button>
              </Link>
        </div>

        {/* Mobile Navigation (in dropdown) and Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full hover:bg-slate-100"
            >
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                <AvatarImage
                  src={user.avatar || "/placeholder.svg"}
                  alt={user.username}
                />
                <AvatarFallback>AJ</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-slate-900">
                  {user.username}
                </p>
                <p className="text-xs leading-none text-slate-500">
                  #{user.rank}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Mobile Navigation Links */}
            <div className="lg:hidden">
            <Link to="/dashboard">
            <DropdownMenuItem className="cursor-pointer">
              <Home className="mr-2 h-4 w-4" />
              <span>Home</span>
            </DropdownMenuItem>
          </Link>
            <Link to="/battle">
                <DropdownMenuItem className="cursor-pointer">
                  <Play className="mr-2 h-4 w-4" />
                  <span>Battle</span>
                </DropdownMenuItem>
              </Link>
              <Link to="/selection">
                <DropdownMenuItem className="cursor-pointer">
                  <List className="mr-2 h-4 w-4" />
                  <span>Selection</span>
                </DropdownMenuItem>
              </Link>
              <Link to="/leaderboard">
                <DropdownMenuItem className="cursor-pointer">
                  <Trophy className="mr-2 h-4 w-4" />
                  <span>Leaderboard</span>
                </DropdownMenuItem>
              </Link>
              <Link to="/trainings">
                <DropdownMenuItem className="cursor-pointer">
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Trainings</span>
                </DropdownMenuItem>
              </Link>
              <Link to="/friend">
                <DropdownMenuItem className="cursor-pointer">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Friends</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
            </div>
            

            <Link to="/profile">
              <DropdownMenuItem className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Manage Profile</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </header>
  );
}
