import { createContext, useContext, useState, ReactNode } from 'react'

interface MyContextProps {
  lastEventsLength: number
  setLastEventsLength: React.Dispatch<React.SetStateAction<number>>
}
interface MyContextProviderProps {
  children: ReactNode
}
const MyContext = createContext<MyContextProps | undefined>(undefined)

export function useMyContext() {
  const context = useContext(MyContext)
  if (!context) throw new Error('useMyContext must be used within a MyContextProvider')
  return context
}

export function MyContextProvider({ children }: MyContextProviderProps) {
  const [lastEventsLength, setLastEventsLength] = useState(0)
  return <MyContext.Provider value={{ lastEventsLength, setLastEventsLength }}>{children}</MyContext.Provider>
}
