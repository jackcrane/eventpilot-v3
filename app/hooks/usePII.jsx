import React, { useEffect, useState } from "react";
import { UAParser } from "ua-parser-js";

const getLocation = async () => {
  const f = await fetch("https://geolocation-db.com/json/");
  const data = await f.json();
  return data;
};

const isArc = () => {
  return getComputedStyle(document.documentElement).getPropertyValue(
    "--arc-palette-title"
  );
};

export const usePII = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const getData = async () => {
      const pii = await getPII();
      setData(pii);
    };
    getData();
  }, []);

  return data;
};

export const getPII = async () => {
  const fingerprint = await ThumbmarkJS.getFingerprint();
  const location = await getLocation();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let { browser, device, os } = new UAParser().getResult();
  if (isArc()) browser.name = "Arc";
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  return {
    fingerprint,
    location,
    tz,
    browser,
    device,
    os,
    screenWidth,
    screenHeight,
  };
};
