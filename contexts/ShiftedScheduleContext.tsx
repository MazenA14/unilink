import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface ShiftedScheduleContextType {
  isShiftedScheduleEnabled: boolean;
  setShiftedScheduleEnabled: (enabled: boolean) => void;
}

const ShiftedScheduleContext = createContext<ShiftedScheduleContextType | undefined>(undefined);

interface ShiftedScheduleProviderProps {
  children: ReactNode;
}

export function ShiftedScheduleProvider({ children }: ShiftedScheduleProviderProps) {
  const [isShiftedScheduleEnabled, setShiftedScheduleEnabled] = useState(false);

  // Load the cached value on component mount
  useEffect(() => {
    const loadCachedValue = async () => {
      try {
        const cachedValue = await AsyncStorage.getItem('shiftedScheduleEnabled');
        if (cachedValue !== null) {
          setShiftedScheduleEnabled(JSON.parse(cachedValue));
        }
      } catch (error) {
        // Failed to load shifted schedule preference
      }
    };

    loadCachedValue();
  }, []);

  // Cache the value whenever it changes
  const handleSetShiftedScheduleEnabled = async (enabled: boolean) => {
    setShiftedScheduleEnabled(enabled);
    try {
      await AsyncStorage.setItem('shiftedScheduleEnabled', JSON.stringify(enabled));
    } catch (error) {
      // Failed to cache shifted schedule preference
    }
  };

  return (
    <ShiftedScheduleContext.Provider value={{ 
      isShiftedScheduleEnabled, 
      setShiftedScheduleEnabled: handleSetShiftedScheduleEnabled 
    }}>
      {children}
    </ShiftedScheduleContext.Provider>
  );
}

export function useShiftedSchedule() {
  const context = useContext(ShiftedScheduleContext);
  if (context === undefined) {
    throw new Error('useShiftedSchedule must be used within a ShiftedScheduleProvider');
  }
  return context;
}
