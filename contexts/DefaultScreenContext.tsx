import { AuthManager } from '@/utils/auth';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export type DefaultScreenType = 'dashboard' | 'grades' | 'schedule' | 'transcript' | 'settings';

interface DefaultScreenContextType {
  defaultScreen: DefaultScreenType;
  setDefaultScreen: (screen: DefaultScreenType) => Promise<void>;
  isLoading: boolean;
}

const DefaultScreenContext = createContext<DefaultScreenContextType | undefined>(undefined);

interface DefaultScreenProviderProps {
  children: ReactNode;
}

export function DefaultScreenProvider({ children }: DefaultScreenProviderProps) {
  const [defaultScreen, setDefaultScreenState] = useState<DefaultScreenType>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDefaultScreen();
  }, []);

  const loadDefaultScreen = async () => {
    try {
      const stored = await AuthManager.getDefaultScreen();
      if (stored && ['dashboard', 'grades', 'schedule', 'transcript', 'settings'].includes(stored)) {
        setDefaultScreenState(stored as DefaultScreenType);
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const setDefaultScreen = async (screen: DefaultScreenType) => {
    try {
      await AuthManager.storeDefaultScreen(screen);
      setDefaultScreenState(screen);
    } catch (error) {
    }
  };

  return (
    <DefaultScreenContext.Provider value={{ defaultScreen, setDefaultScreen, isLoading }}>
      {children}
    </DefaultScreenContext.Provider>
  );
}

export function useDefaultScreen() {
  const context = useContext(DefaultScreenContext);
  if (context === undefined) {
    throw new Error('useDefaultScreen must be used within a DefaultScreenProvider');
  }
  return context;
}
