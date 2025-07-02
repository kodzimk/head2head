import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { RefreshCw, Check, Info } from 'lucide-react';
import { generateUsernameSuggestions, isValidUsername } from '../utils/username-normalization';
import { useTranslation } from 'react-i18next';

interface UsernameSuggestionsProps {
  username: string;
  onSelect: (username: string) => void;
  className?: string;
}

export const UsernameSuggestions: React.FC<UsernameSuggestionsProps> = ({
  username,
  onSelect,
  className = ''
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { t } = useTranslation();

  // Check if the current username needs normalization
  const needsNormalization = username && !/^[a-zA-Z0-9_]*$/.test(username);
  const validation = isValidUsername(username);

  useEffect(() => {
    if (needsNormalization || !validation.valid) {
      const newSuggestions = generateUsernameSuggestions(username, 4);
      setSuggestions(newSuggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [username, needsNormalization, validation.valid]);

  const regenerateSuggestions = () => {
    const newSuggestions = generateUsernameSuggestions(username, 4);
    setSuggestions(newSuggestions);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSelect(suggestion);
    setShowSuggestions(false);
  };

  if (!showSuggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <Card className={`border-orange-200 bg-orange-50/50 dark:bg-orange-900/20 dark:border-orange-800 ${className}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
              {t('username.suggestions')}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              {needsNormalization 
                ? t('username.nonEnglishChars')
                : t('username.basedOnName')
              }
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={regenerateSuggestions}
            className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:text-orange-400 dark:hover:text-orange-300"
            title={t('username.regenerate')}
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {suggestions.map((suggestion, index) => (
            <Button
              key={`${suggestion}-${index}`}
              variant="outline"
              size="sm"
              onClick={() => handleSuggestionClick(suggestion)}
              className="justify-start text-left bg-white dark:bg-gray-800 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:border-orange-300 dark:hover:border-orange-600"
            >
              <Check className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{suggestion}</span>
            </Button>
          ))}
        </div>

        {needsNormalization && (
          <div className="text-xs text-orange-600 dark:text-orange-400 pt-1 border-t border-orange-200 dark:border-orange-800">
            {t('username.note')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UsernameSuggestions; 