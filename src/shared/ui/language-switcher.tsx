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
          variant="outline"
          size="sm"
          className={`flex items-center gap-2 ${className}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Languages className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
          <span className="sm:hidden">{currentLanguage.flag}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="p-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t('language.selectLanguage')}
          </p>
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className="flex items-center justify-between cursor-pointer p-2 rounded-md hover:bg-muted"
              disabled={isLoading}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{language.flag}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{language.nativeName}</span>
                  <span className="text-xs text-muted-foreground">{language.name}</span>
                </div>
              </div>
              {currentLanguage.code === language.code && (
                isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 text-primary" />
                )
              )}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Standalone compact flag button for mobile/header use
export const LanguageFlag: React.FC<{ className?: string }> = ({ className = '' }) => {
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
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className={`h-8 w-8 p-0 text-lg hover:bg-muted rounded-full ${className}`}
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