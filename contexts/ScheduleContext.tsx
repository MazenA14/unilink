import { ScheduleType } from '@/components/schedule/types';
import React, { createContext, ReactNode, useContext, useState } from 'react';

interface ScheduleContextType {
  selectedScheduleType: ScheduleType | null;
  setSelectedScheduleType: (type: ScheduleType | null) => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

interface ScheduleProviderProps {
  children: ReactNode;
}

export function ScheduleProvider({ children }: ScheduleProviderProps) {
  const [selectedScheduleType, setSelectedScheduleType] = useState<ScheduleType | null>(null);

  return (
    <ScheduleContext.Provider value={{ selectedScheduleType, setSelectedScheduleType }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useScheduleContext() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useScheduleContext must be used within a ScheduleProvider');
  }
  return context;
}
