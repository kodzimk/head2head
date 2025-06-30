import React, { useState } from "react";
import { Button } from "../../shared/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function Header() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  return (
    <header className="fixed top-0 w-full z-50 border-b border-border/50 backdrop-blur-md" 
            style={{ backgroundColor: 'hsl(220 13% 12% / 0.95)' }}>
      <div className="container-gaming">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo Section */}
          <a href="#hero" className="flex items-center space-x-2 sm:space-x-3">
            <div className="logo-gaming w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-sm sm:text-lg font-black">
              h2h
            </div>
            <span className="font-bold text-lg sm:text-xl text-foreground hidden sm:inline">
              Head<span className="text-primary">2</span>Head
            </span>
          </a>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-3 lg:space-x-4">
            <Button 
              className="btn-neon text-sm lg:text-base"
              onClick={() => navigate("/sign-up")}
            >
              Start Competing
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-foreground" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border/30 py-4">
            <nav className="flex flex-col space-y-3">
              <Button 
                className="btn-neon justify-start text-left w-full"
                onClick={() => {
                  navigate("/sign-up");
                  setIsMobileMenuOpen(false);
                }}
              >
                Start Competing
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
