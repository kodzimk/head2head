import { createContext, useContext } from "react"
import type { User } from "./user"

interface GlobalStoreType {
  user: User | undefined;
  setUser: (user: User | undefined) => void;
}

export const GlobalStore = createContext<GlobalStoreType | null>(null)

export const useGlobalStore = () => {
    const context = useContext(GlobalStore)
    if (!context) {
        throw new Error("useGlobalStore must be used within a GlobalStoreProvider")
    }
    return context
}