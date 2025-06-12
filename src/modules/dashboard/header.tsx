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
import { LogOut, User as UserIcon } from "lucide-react";

export default function Header({ user }: { user: User }) {
  const navigate = useNavigate();

  return (
    <header className="px-2 sm:px-4 lg:px-6 h-16 flex items-center justify-between bg-white/60 backdrop-blur border-b border-slate-200 w-full">
      <a href="#hero" className="flex items-center justify-center">
        <div className="flex items-center gap-2 sm:gap-3 ml-2 sm:ml-8">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-orange-500">
            <p className="font-bold text-white text-sm sm:text-base">H2H</p>
          </div>
          <span className="hidden md:block font-bold text-lg sm:text-xl text-slate-900">Head2Head</span>
        </div>
      </a>
      
      <nav className="flex gap-4 items-center sm:-ml-16">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full hover:bg-slate-100">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.username} />
                <AvatarFallback>AJ</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-slate-900">{user.username}</p>
                <p className="text-xs leading-none text-slate-500">{user.rank}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => navigate("/profile")}
              className="cursor-pointer"
            >
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Manage Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => navigate("/")}
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