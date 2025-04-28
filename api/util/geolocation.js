import { prisma } from "#prisma";

const cache = {};
const CACHE_TTL = 60000; // 1 minute in milliseconds

export const getGeolocation = async (ip) => {
  if (ip === "::1") {
    return {
      city: "Cincinnati",
      regionName: "Ohio",
    };
  }

  if (!ip) {
    return null;
  }

  // Check the cache first
  const cachedEntry = cache[ip];
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
    return cachedEntry.data;
  }

  // Try fetching from the database
  const geolocation = await prisma.geolocation.findFirst({
    where: {
      ip,
    },
  });

  if (geolocation) {
    const data = {
      city: geolocation.city,
      regionName: geolocation.regionName,
    };

    // Store in cache
    cache[ip] = { data, timestamp: Date.now() };
    return data;
  }

  // Fetch from external API if not found in database
  const res = await fetch(
    `http://ip-api.com/json/${ip}?fields=city,regionName`
  );
  const data = await res.json();

  if (data) {
    // Store in the database
    await prisma.geolocation.create({
      data: {
        ip,
        city: data.city,
        regionName: data.regionName,
      },
    });

    // Store in cache
    cache[ip] = { data, timestamp: Date.now() };
  }

  return data;
};
