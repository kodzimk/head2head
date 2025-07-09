import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';
import { Languages, Check, ChevronDown, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { saveLanguageToUserProfile } from '../i18n/i18n';
import { useGlobalStore } from '../interface/gloabL_var';
import { useI18nLoading } from '../hooks/use-i18n-loading';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸'
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺'
  }
];

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'inline' | 'compact';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dropdown',
  className = ''
}) => {
  const { i18n, t } = useTranslation();
  const { user, setUser } = useGlobalStore();
  const [isOpen, setIsOpen] = useState(false);
  const isLoading = useI18nLoading();

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode);
      setIsOpen(false);
      
      // Save language preference to localStorage
      localStorage.setItem("language", languageCode);
      
      // Save language preference to user profile if user is logged in
      if (user && user.username) {
        const updatedUser = saveLanguageToUserProfile(languageCode);
        if (updatedUser) {
          setUser(updatedUser);
          console.log(`Language preference saved to user profile: ${languageCode}`);
        }
      }
      
      // Dispatch custom event to notify other components about language change
      window.dispatchEvent(new CustomEvent('languageChange', { detail: languageCode }));
      
      // Show success notification (optional)
      console.log(t('language.languageChanged'));
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleLanguageChange(currentLanguage.code === 'en' ? 'ru' : 'en')}
        className={`h-8 w-12 p-0 text-lg ${className} relative`}
        title={t('language.selectLanguage')}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          currentLanguage.flag
        )}
      </Button>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Languages className="w-4 h-4 text-muted-foreground" />
        <div className="flex rounded-lg border border-border overflow-hidden">
          {languages.map((language) => (
            <Button
              key={language.code}
              variant={currentLanguage.code === language.code ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleLanguageChange(language.code)}
              className={`rounded-none border-0 ${
                currentLanguage.code === language.code 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-transparent hover:bg-muted'
              }`}
              disabled={isLoading}
            >
              {isLoading && currentLanguage.code === language.code ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <span className="mr-1">{language.flag}</span>
              )}
              {language.nativeName}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Default dropdown variant
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 sm:h-9 sm:w-auto px-1 sm:px-3 bg-card/50 hover:bg-card/80 transition-colors duration-200 flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Languages className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{t('navigation.language')}</span>
          <span className="sm:hidden">{currentLanguage.flag}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-56 sm:w-64 lg:w-72 bg-card/95 backdrop-blur-sm border-border/50 shadow-lg" 
        align="end"
      >
        <div className="p-2">
          <div className="text-sm font-medium text-muted-foreground px-2 py-1.5">
            {t('language.selectLanguage')}
          </div>
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className="flex items-center gap-3 px-2 py-1.5 hover:bg-card/80 rounded-md cursor-pointer"
            >
              <span className="text-lg">{language.flag}</span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium">{language.nativeName}</span>
                <span className="text-xs text-muted-foreground">{language.name}</span>
              </div>
              {currentLanguage.code === language.code && (
                <Check className="w-4 h-4 text-primary" />
              )}
              {isLoading && currentLanguage.code === language.code && (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Standalone compact flag button for mobile/header use
export const LanguageFlag: React.FC<{ className?: string }> = () => {
  const { i18n, t } = useTranslation();
  const { user, setUser } = useGlobalStore();
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  const isLoading = useI18nLoading();

  const handleToggle = async () => {
    const newLanguage = currentLanguage.code === 'en' ? 'ru' : 'en';
    await i18n.changeLanguage(newLanguage);
    
    // Save language preference to localStorage
    localStorage.setItem("language", newLanguage);
    
    // Save language preference to user profile if user is logged in
    if (user && user.username) {
      const updatedUser = saveLanguageToUserProfile(newLanguage);
      if (updatedUser) {
        setUser(updatedUser);
        console.log(`Language preference saved to user profile: ${newLanguage}`);
      }
    }
    
    // Dispatch custom event to notify other components about language change
    window.dispatchEvent(new CustomEvent('languageChange', { detail: newLanguage }));
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 sm:h-9 sm:w-auto px-1 sm:px-3 bg-card/50 hover:bg-card/80 transition-colors duration-200"
      onClick={handleToggle}
      title={t('language.switchTo', { language: currentLanguage.code === 'en' ? 'Русский' : 'English' })}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        currentLanguage.flag
      )}
    </Button>
  );
};

export default LanguageSwitcher; 