import { createContext, type ReactNode, useContext } from 'react';

import { DayOfSessionState, useDayOfSession } from '@/hooks/useDayOfSession';

const DayOfSessionContext = createContext<DayOfSessionState | null>(null);

type ProviderProps = {
  children: ReactNode;
};

export const DayOfSessionProvider = ({ children }: ProviderProps) => {
  const value = useDayOfSession();
  return (
    <DayOfSessionContext.Provider value={value}>
      {children}
    </DayOfSessionContext.Provider>
  );
};

export const useDayOfSessionContext = () => {
  const context = useContext(DayOfSessionContext);
  if (!context) {
    throw new Error('useDayOfSessionContext must be used within a DayOfSessionProvider');
  }
  return context;
};
