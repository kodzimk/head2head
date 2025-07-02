import { useEffect, useState } from 'react';
import { i18nLoadingEvent } from '../i18n/i18n';
import { useTranslation } from 'react-i18next';

export function LanguageLoadingIndicator() {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const handleLoadingChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setIsLoading(customEvent.detail);
    };

    i18nLoadingEvent.addEventListener('i18nLoadingStateChange', handleLoadingChange);

    return () => {
      i18nLoadingEvent.removeEventListener('i18nLoadingStateChange', handleLoadingChange);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-primary/10 border border-primary/20 rounded-lg px-4 py-2 text-sm text-primary flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
      <span>{t('language.loading')}</span>
    </div>
  );
} 