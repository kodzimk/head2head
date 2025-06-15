import { createContext, useContext } from "react"
import type { User } from "./user"

interface GlobalStoreType {
  user: User ;
  setUser: (user: User ) => void;
}

export const GlobalStore = createContext<GlobalStoreType>()

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