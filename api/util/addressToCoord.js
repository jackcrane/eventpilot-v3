import fetch from "node-fetch";
import { writeFileSync } from "fs";
import { HttpProxyAgent } from "http-proxy-agent";
import { proxies } from "./proxy-list.js";

let proxyIndex = 0;

const getNextAgent = () => {
  const raw = proxies[proxyIndex % proxies.length];
  proxyIndex += 1;
  const proxyUrl = raw.startsWith("http") ? raw : `http://${raw}`;
  return new HttpProxyAgent(proxyUrl);
};

export const addressToCoordinates = async (address) => {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&` +
    `street=${encodeURIComponent(address)}&addressdetails=1`;

  for (let attempt = 0; attempt < proxies.length; attempt++) {
    const agent = getNextAgent();
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "EventPilot" },
        agent,
      });
      if (!res.ok) throw new Error(res.statusText);

      const data = (await res.json())?.[0];
      if (!data?.address) return null;

      return {
        ...data.address,
        lat: data.lat,
        lon: data.lon,
      };
    } catch (err) {
      const badProxy =
        proxies[(proxyIndex - 1 + proxies.length) % proxies.length];
      console.warn(
        `Proxy ${badProxy} failed (attempt ${attempt + 1}): ${err.message}`
      );
    }
  }

  console.error(`All proxies failed for address: ${address}`);
  return null;
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

(async () => {
  const results = [];
  for (const addr of addresses) {
    results.push(await addressToCoordinates(addr));
    console.log(addr);
  }
  writeFileSync("./out.json", JSON.stringify(results, null, 2));
})();
