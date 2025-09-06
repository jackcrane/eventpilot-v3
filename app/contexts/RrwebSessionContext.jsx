import { createContext, useContext } from "react";
import { useRrweb } from "../hooks/useRrweb";

const Ctx = createContext({
  attachRegistration: async () => {},
  attachVolunteerRegistration: async () => {},
});

export const RrwebSessionProvider = ({ eventId, children }) => {
  const value = useRrweb({ eventId });
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useRrwebSession = () => useContext(Ctx);

