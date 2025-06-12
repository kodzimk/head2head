import { MobileNav } from "../../shared/mobile-nav";
import { Button } from "../../shared/ui/button";
import { Link, useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  
  return (
    <header className="px-4 lg:px-6 h-16 flex items-center justify-between bg-white/60 backdrop-blur border-b border-slate-200 fixed top-0 w-full z-50">
      <a href="#hero" className="flex items-center justify-center ml-15">
        <div className="flex items-center gap-3 ml-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500">
            <p className="font-bold text-white">H2H</p>
          </div>
          <span className="font-bold text-xl text-slate-900">Head2Head</span>
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
