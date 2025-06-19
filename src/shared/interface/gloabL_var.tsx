import { createContext, useContext } from "react"
import type { User } from "./user"
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
