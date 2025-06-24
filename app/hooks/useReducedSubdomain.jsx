import { useLocation } from "react-use";

import { useLocation } from "react-router-dom";

export const useReducedSubdomain = () => {
  const location = useLocation();
  const hostname = location.hostname;

  const parts = hostname.split(".");

  // Handle localhost or IPs (no subdomain)
  if (hostname === "localhost" || parts.length < 3) return null;

  // Strip www if present
  if (parts[0] === "www") parts.shift();

  // Remove the last two elements (domain and TLD)
  const subdomainParts = parts.slice(0, -2);

  return subdomainParts.length ? subdomainParts.join(".") : null;
};
