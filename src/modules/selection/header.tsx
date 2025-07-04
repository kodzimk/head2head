
import { useTranslation } from 'react-i18next';
import { Trophy, ChevronLeft } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import { useGlobalStore } from '../../shared/interface/gloabL_var';

interface SelectionHeaderProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedCategory?: string;
}

export default function SelectionHeader({ isOpen, onToggle, selectedCategory }: SelectionHeaderProps) {
  const { t } = useTranslation();
  const { user } = useGlobalStore();

  return (
    <header className="header-gaming transition-all duration-300 bg-background/90 sticky top-0 z-50 w-full border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-gaming">
      <div className="container-gaming">
        <div className="flex items-center justify-between h-14 sm:h-16 lg:h-18">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onToggle}
              className="hover:bg-accent"
            >
              {isOpen ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <Trophy className="h-5 w-5" />
              )}
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold hidden sm:block">
                {t('selection.title')}
              </h1>
              {selectedCategory && (
                <>
                  <span className="hidden sm:block text-muted-foreground">/</span>
                  <span className="text-sm text-muted-foreground capitalize">
                    {t(`selection.categories.${selectedCategory}`)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right Section - User Stats */}
          <div className="hidden sm:flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="font-medium">{user?.votingScore || 0}</span>
              <span className="text-muted-foreground">{t('selection.votes')}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 