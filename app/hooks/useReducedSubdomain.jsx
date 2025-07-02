import { useLocation } from "react-use";

export const useReducedSubdomain = () => {
  const location = useLocation();
  const hostname = location.hostname;

  const parts = hostname.split(".");

  // Special handling for localhost (e.g., paddlefest.localhost)
  if (hostname.endsWith("localhost")) {
    const index = parts.findIndex((p) => p === "localhost");
    const subdomainParts = parts.slice(0, index);
    return subdomainParts.length ? subdomainParts.join(".") : null;
  }

  // Handle www stripping and normal domains
  if (parts[0] === "www") parts.shift();

  // Remove the last two parts (domain and TLD)
  const subdomainParts = parts.slice(0, -2);

  return subdomainParts.length ? subdomainParts.join(".") : null;
};
