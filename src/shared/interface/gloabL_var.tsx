import { createContext, useContext } from 'react'
import type { Battle, User } from "./user"
import type { Question } from "./question"
import { initialUser } from "./user"

interface GlobalStoreType {
  user: User ;
  setUser: (user: User ) => void;
}



export const GlobalStore = createContext<GlobalStoreType>({
  user:initialUser,
  setUser: () => {}
})

export const useGlobalStore = () => {
    const context = useContext(GlobalStore)
    if (!context) {
        throw new Error("useGlobalStore must be used within a GlobalStoreProvider")
    }
    return context
}

interface ThemeStoreType {
  theme: boolean;
  setTheme: (theme: boolean) => void;
}

export const ThemeStore = createContext<ThemeStoreType>({
  theme: false,
  setTheme: () => {}
})

export const useThemeStore = () => {
  const context = useContext(ThemeStore)
  if (!context) {
    throw new Error("useThemeStore must be used within a ThemeStoreProvider")
  }
  return context
}

interface CurrentQuestionStoreType {
  currentQuestion: Question | null;
  setCurrentQuestion: (currentQuestion: Question | null) => void;
}

export const CurrentQuestionStore = createContext<CurrentQuestionStoreType>({
  currentQuestion: null,
  setCurrentQuestion: () => {}
})

export const useCurrentQuestionStore = () => {
  const context = useContext(CurrentQuestionStore)
  if (!context) {
    throw new Error("useCurrentQuestionStore must be used within a CurrentQuestionStoreProvider")
  }
  return context
}

interface ScoreStoreType {
  firstOpponentScore: number;
  secondOpponentScore: number;
  setFirstOpponentScore: (firstOpponentScore: number) => void;
  setSecondOpponentScore: (secondOpponentScore: number) => void;
}

export const ScoreStore = createContext<ScoreStoreType>({
  firstOpponentScore: 0,
  secondOpponentScore: 0,
  setFirstOpponentScore: () => {},
  setSecondOpponentScore: () => {}
})

export const useScoreStore = () => {
  const context = useContext(ScoreStore)
  if (!context) {
    throw new Error("useScoreStore must be used within a ScoreStoreProvider")
  }
  return context
}

interface TextStoreType {
  text: string ;
  setText: (text: string) => void;
}


export const TextStore = createContext<TextStoreType>({
  text: '',
  setText: () => {}
})

export const useTextStore = () => {
  const context = useContext(TextStore)
  if (!context) {
    throw new Error("useTextStore must be used within a TextStoreProvider")
  } 
  return context
}

interface LoserStoreType {
  loser: string;
  setLoser: (loser: string) => void;
}

export const LoserStore = createContext<LoserStoreType>({
  loser: '',
  setLoser: () => {}
})

export const useLoserStore = () => {
  const context = useContext(LoserStore)
  if (!context) {
    throw new Error("useLoserStore must be used within a LoserStoreProvider")
  }
  return context
}

interface WinnerStoreType {
  winner: string;
  setWinner: (winner: string) => void;
}

export const WinnerStore = createContext<WinnerStoreType>({
  winner: '',
  setWinner: () => {}
})

export const useWinnerStore = () => {
  const context = useContext(WinnerStore)
  if (!context) {
    throw new Error("useWinnerStore must be used within a WinnerStoreProvider")
  }
  return context
}

interface ResultStoreType {
  result: string;
  setResult: (result: string) => void;
}

export const ResultStore = createContext<ResultStoreType>({
  result: '',
  setResult: () => {}
})

export const useResultStore = () => {
  const context = useContext(ResultStore)
  if (!context) {
    throw new Error("useResultStore must be used within a ResultStoreProvider")   
  }
  return context
}

interface BattleStoreType {
  battle: Battle[];
  setBattle: (battle: Battle[]) => void;
}

export const BattleStore = createContext<BattleStoreType>({
  battle: [],
  setBattle: () => {}
})

export const useBattleStore = () => {
  const context = useContext(BattleStore)
  if (!context) {
    throw new Error("useBattleStore must be used within a BattleStoreProvider")
  }
  return context
}

// API Configuration
export const API_BASE_URL = 'https://api.head2head.dev';
export const WS_BASE_URL = 'wss://api.head2head.dev';

// API Key Management
let currentKeyIndex = 0;
const API_KEYS = [
    "AIzaSyA3JnveYgQNYEi8T978o72O9_XcBZK4SYs",  // Replace with your actual API keys
    "AIzaSyCpYEITMlV_m27_66CXTwHBWjQV1atJpzo",
    "AIzaSyBTtYVDO4VwKhMBqTI1SwZH0SeKdI9AH_Q",
    "AIzaSyCXgxp9zjCQFYK5XWDDBej6hrtbaF0Ne5Q",
    "AIzaSyCVt8ILtxE81Fb2XLnHyu_nTjEWHm9qnyQ"
];

export const getNextApiKey = () => {
    const key = API_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    return key;
};

// Enhanced fetch function with API key rotation
export const fetchWithApiKey = async (url: string, options: RequestInit = {}) => {
  const apiKey = localStorage.getItem('apiKey');
  
  const defaultOptions: RequestInit = {
    credentials: 'include', // Add credentials include
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, mergedOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

// Enhanced axios instance with API key rotation
import axios from 'axios';

export const axiosWithApiKey = axios.create();

axiosWithApiKey.interceptors.request.use((config) => {
    const apiKey = getNextApiKey();
    config.headers['X-API-Key'] = apiKey;
    return config;
});

// Battle-specific state management
interface BattleState {
  [battleId: string]: {
    currentQuestion: any;
    firstOpponentScore: number;
    secondOpponentScore: number;
    winner: string;
    loser: string;
    result: string;
    questions: any[];
    isActive: boolean;
  }
}

interface BattleStateStoreType {
  battleStates: BattleState;
  setBattleState: (battleId: string, state: Partial<BattleState[string]>) => void;
  getBattleState: (battleId: string) => BattleState[string] | null;
  clearBattleState: (battleId: string) => void;
  isBattleActive: (battleId: string) => boolean;
}

export const BattleStateStore = createContext<BattleStateStoreType>({
  battleStates: {},
  setBattleState: () => {},
  getBattleState: () => null,
  clearBattleState: () => {},
  isBattleActive: () => false,
})

export const useBattleStateStore = () => {
  const context = useContext(BattleStateStore)
  if (!context) {
    throw new Error('useBattleStateStore must be used within a BattleStateProvider')
  }
  return context
}

interface OpponentStoreType {
  opponentUsername: string;
  opponentAvatar: string;
  setOpponentUsername: (username: string) => void;
  setOpponentAvatar: (avatar: string) => void;
  setOpponent: (username: string, avatar: string) => void;
}

export const OpponentStore = createContext<OpponentStoreType>({
  opponentUsername: '',
  opponentAvatar: '',
  setOpponentUsername: () => {},
  setOpponentAvatar: () => {},
  setOpponent: () => {}
})

export const useOpponentStore = () => {
  const context = useContext(OpponentStore)
  if (!context) {
    throw new Error("useOpponentStore must be used within a OpponentStoreProvider")
  }
  return context
}

interface RefreshViewStoreType {
  refreshView: boolean;
  setRefreshView: (refreshView: boolean) => void;
}

export const RefreshViewStore = createContext<RefreshViewStoreType>({
  refreshView: false,
  setRefreshView: () => {}
})

export const useRefreshViewStore = () => {
  const context = useContext(RefreshViewStore)
  if (!context) {
    throw new Error("useRefreshViewStore must be used within a RefreshViewStoreProvider")
  }
  return context
}