import { useState, useEffect } from 'react';
import { i18nLoadingEvent } from '../i18n/i18n';

export const useI18nLoading = () => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleLoadingChange = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;
      setIsLoading(customEvent.detail);
    };

    i18nLoadingEvent.addEventListener('i18nLoadingStateChange', handleLoadingChange);

    return () => {
      i18nLoadingEvent.removeEventListener('i18nLoadingStateChange', handleLoadingChange);
    };
  }, []);

  return isLoading;
}; 