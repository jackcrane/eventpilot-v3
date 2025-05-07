import { useLocation } from "react-use";

export const useReducedSubdomain = () => {
  const location = useLocation();
  const hostname = location.hostname;
  const parts = hostname.split(".");
  let subdomain = parts[0];

  if (subdomain === "www" && parts.length > 1) {
    subdomain = parts[1];
  }

  return subdomain;
};
