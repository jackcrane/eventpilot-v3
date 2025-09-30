import { createContext, useContext } from 'react';

import { useDayOfSession } from '../hooks/useDayOfSession';

const DayOfSessionContext = createContext(null);

export const DayOfSessionProvider = ({ children }) => {
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
