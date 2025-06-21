import { createContext, useContext } from "react"
import type { Battle, User } from "./user"
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
  currentQuestion: any;
  setCurrentQuestion: (currentQuestion: any) => void;
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