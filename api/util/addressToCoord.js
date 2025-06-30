import fetch from "node-fetch";
import { writeFileSync } from "fs";

let lastRequestTime = 0;

export const addressToCoordinates = async (address) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const delay = 1100; // 1.1 seconds

  if (timeSinceLastRequest < delay) {
    console.log("Delaying request", timeSinceLastRequest);
    await new Promise((resolve) =>
      setTimeout(resolve, delay - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
  const startTime = new Date();
  const url = `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(
    address
  )}&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "EventPilot",
      },
    });

    if (!response.ok) {
      console.log("Response not ok", response.status, response.statusText);
      return null;
    }

    const data = (await response.json())?.[0];

    if (!data?.address) return null;

    const endTime = new Date();
    const timeTaken = endTime - startTime;
    console.log("Time taken", timeTaken);

    return {
      ...data.address,
      lat: data.lat,
      lon: data.lon,
      lookupTime: timeTaken,
    };
  } catch {
    return null;
  }
};

const addresses = [
  "1521 Salem Woods",
  "2161 Grandin Rd",
  "801 Plum St",
  "2600 Clifton Ave",
  "520 Vine St",
  "953 Eden Park Dr",
  "100 Joe Nuxhall Way",
  "3400 Vine St",
  "1014 Vine St",
  "2692 Madison Rd",
  "1301 Western Ave",
  "1 Procter & Gamble Plaza",
  "441 Vine St",
  "605 Elm St",
  "1001 Victory Pkwy",
  "2001 Anderson Ferry Rd",
  "3500 Lumford Pl",
  "120 E 5th St",
  "3825 Edwards Rd",
  "1111 Elm St",
  "1501 Eden Ave",
  "1223 Sycamore St",
  "2701 Spring Grove Ave",
  "2728 Short Vine St",
  "1005 Gilbert Ave",
  "2045 Reading Rd",
  "1900 Madison Rd",
  "101 W Central Pkwy",
  "342 Ludlow Ave",
  "3500 Burnet Ave",
];

const results = [];
for (const address of addresses) {
  const result = await addressToCoordinates(address);
  results.push(result);
}

writeFileSync("./out.json", JSON.stringify(results, null, 2));
