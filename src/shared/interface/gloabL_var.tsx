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