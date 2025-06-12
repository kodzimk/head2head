import { MobileNav } from "../../shared/mobile-nav";
import { Button } from "../../shared/ui/button";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  
  return (
    <header className="px-2 sm:px-4 lg:px-6 h-16 flex items-center justify-between bg-white/60 backdrop-blur border-b border-slate-200 fixed top-0 w-full z-50">
      <a href="#hero" className="flex items-center justify-center">
        <div className="flex items-center gap-2 sm:gap-3 ml-2 sm:ml-8">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-orange-500">
            <p className="font-bold text-white text-sm sm:text-base">h2h</p>
          </div>
          <span className="font-bold text-lg sm:text-xl text-slate-900">head2head</span>
        </div>
      </a>
      <nav className="ml-auto hidden md:flex gap-6 items-center mr-10">
        <Button className="max-w-72 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate("/sign-up")}>
          Start Now!
        </Button>
      </nav>
      <div className="ml-auto md:hidden">
        <MobileNav />
      </div>
    </header>
  );
}
