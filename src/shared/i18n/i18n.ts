import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { User } from '../interface/user';

// Import translation files
import en from './locales/en.json';
import ru from './locales/ru.json';

// Create a custom event for language loading state
export const i18nLoadingEvent = new EventTarget();
const LOADING_EVENT = 'i18nLoadingStateChange';

export const emitLoadingState = (isLoading: boolean) => {
  i18nLoadingEvent.dispatchEvent(new CustomEvent(LOADING_EVENT, { detail: isLoading }));
};

const resources = {
  en: {
    translation: en
  },
  ru: {
    translation: ru
  }
};

// List of countries where Russian is commonly used
const russianSpeakingCountries = [
  'ru', // Russia
  'by', // Belarus
  'kz', // Kazakhstan
  'kg', // Kyrgyzstan
  'uz', // Uzbekistan
  'tj', // Tajikistan
  'ua', // Ukraine
  'md', // Moldova
  'am', // Armenia
  'az'  // Azerbaijan
];

// Function to detect the initial language
const detectInitialLanguage = (): string => {
  // First check localStorage
  const savedLanguage = localStorage.getItem("language");
  if (savedLanguage && ['en', 'ru'].includes(savedLanguage)) {
    console.log('Using saved language from localStorage:', savedLanguage);
    return savedLanguage;
  }

  // Check browser language
  const browserLang = navigator.language.toLowerCase();
  const langCode = browserLang.split('-')[0];
  const country = browserLang.split('-')[1];
  
  console.log('Initial detection - Browser language:', browserLang, 'code:', langCode, 'country:', country);
  
  // If language code is 'ru' or from a Russian-speaking country, use Russian
  if (langCode === 'ru') {
    console.log('Detected Russian from language code');
    return 'ru';
  }

  // If country is in Russian-speaking countries list, use Russian
  if (country && russianSpeakingCountries.includes(country.toLowerCase())) {
    console.log('Detected Russian from country code');
    return 'ru';
  }

  // Check timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log('Initial detection - Timezone:', timezone);
  
  // If timezone is in a Russian-speaking region, use Russian
  if (timezone.startsWith('Europe/') || timezone.startsWith('Asia/')) {
    const region = timezone.split('/')[1].toLowerCase();
    
    // List of Russian-speaking regions
    const russianRegions = [
      'moscow',
      'petersburg',
      'minsk',
      'almaty',
      'astana',
      'bishkek',
      'tashkent',
      'dushanbe',
      'kiev',
      'chisinau',
      'yerevan',
      'baku',
      'qyzylorda',
      'omsk',
      'novosibirsk',
      'irkutsk',
      'yakutsk',
      'vladivostok',
      'magadan',
      'kamchatka',
      'kaliningrad'
    ];
    
    if (russianRegions.some(r => region.includes(r.toLowerCase()))) {
      console.log('Detected Russian from timezone region:', region);
      return 'ru';
    }
  }

  // Default to English if no Russian detection
  console.log('No Russian locale detected, using English');
  return 'en';
};

// Get the initial language
const initialLanguage = detectInitialLanguage();
console.log('Setting initial language to:', initialLanguage);

// Save initial language to localStorage if not already set
if (!localStorage.getItem("language")) {
  localStorage.setItem("language", initialLanguage);
}

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    debug: true,

    interpolation: {
      escapeValue: false,
    },

    defaultNS: 'translation',
    
    react: {
      useSuspense: false,
    }
  });

// Function to update language based on user preference
export const setUserLanguage = async (user: User) => {
  if (user.language && ['en', 'ru'].includes(user.language)) {
    emitLoadingState(true);
    try {
      await i18n.changeLanguage(user.language);
      localStorage.setItem("language", user.language);
      console.log('Language updated to:', user.language);
    } finally {
      emitLoadingState(false);
    }
  }
};

// Function to save language preference to user profile
export const saveLanguageToUserProfile = (language: string) => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user: User = JSON.parse(userStr);
      user.language = language;
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem("language", language);
      console.log('Language saved to profile:', language);
      return user;
    }
  } catch (error) {
    console.warn('Error saving language to user profile:', error);
  }
  return null;
};

// Add loading state to language change
const originalChangeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = async (lng: string | undefined, callback?: ((err: any, t: TFunction) => void) | undefined) => {
  emitLoadingState(true);
  try {
    const result = await originalChangeLanguage(lng, callback);
    if (lng) {
      localStorage.setItem("language", lng);
    }
    return result;
  } finally {
    emitLoadingState(false);
  }
};

// Debug function to check current language settings
export const debugLanguageDetection = () => {
  console.log('Current language settings:');
  console.log('- Current i18n language:', i18n.language);
  console.log('- Browser language:', navigator.language);
  console.log('- Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log('- Local storage language:', localStorage.getItem("language"));
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
        console.log('- User language:', user.language);
    }
  } catch (error) {
    console.error('Error reading user data:', error);
  }
};

// Call debug on init
debugLanguageDetection();

export default i18n; 