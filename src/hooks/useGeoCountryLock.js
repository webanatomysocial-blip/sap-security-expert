import { useEffect, useState } from "react";
import { COUNTRIES, statesForCountry, citiesForCountry } from "../constants/countries";

// A few common names the reverse-geocoder returns that don't exactly match
// our COUNTRIES list (from country-state-city).
const ALIASES = {
  "United States of America": "United States",
  USA: "United States",
  "Russian Federation": "Russia",
  "South Korea": "Korea, Republic of",
  "Republic of Korea": "Korea, Republic of",
  "Czech Republic": "Czechia",
  "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
};

function matchCountryName(name) {
  if (!name) return "";
  const direct = COUNTRIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (direct) return direct.name;
  const aliased = ALIASES[name];
  if (aliased) return aliased;
  const partial = COUNTRIES.find(
    (c) => c.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(c.name.toLowerCase())
  );
  return partial ? partial.name : "";
}

function matchStateName(countryName, stateName) {
  if (!countryName || !stateName) return "";
  const states = statesForCountry(countryName);
  if (!states.length) return stateName;
  const sLower = stateName.toLowerCase();
  const direct = states.find((s) => s.name.toLowerCase() === sLower);
  if (direct) return direct.name;
  const partial = states.find(
    (s) => s.name.toLowerCase().includes(sLower) || sLower.includes(s.name.toLowerCase())
  );
  return partial ? partial.name : stateName;
}

function matchCityName(countryName, stateName, cityName) {
  if (!countryName || !cityName) return "";
  const cities = citiesForCountry(countryName, stateName);
  if (!cities.length) return cityName;
  const cLower = cityName.toLowerCase();
  const direct = cities.find((c) => (typeof c === "string" ? c : c.name).toLowerCase() === cLower);
  if (direct) return typeof direct === "string" ? direct : direct.name;
  const partial = cities.find((c) => {
    const name = (typeof c === "string" ? c : c.name).toLowerCase();
    return name.includes(cLower) || cLower.includes(name);
  });
  return partial ? (typeof partial === "string" ? partial : partial.name) : cityName;
}

const supportsGeolocation = () => typeof navigator !== "undefined" && !!navigator.geolocation;

// Detects the user's country/state/city from the browser's location, the
// same way a "use my location" button on a maps site works. Once location
// is detected, forms will auto-sync country, state, and city.
async function reverseGeocodeCoords(latitude, longitude) {
  // Try OpenStreetMap Nominatim first (reliable, fast)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.address) {
        const country = matchCountryName(data.address.country);
        const rawState = data.address.state || data.address.state_district || data.address.region || "";
        const matchedState = matchStateName(country, rawState);
        const rawCity = data.address.city || data.address.town || data.address.village || data.address.county || "";
        const matchedCity = matchCityName(country, matchedState, rawCity);
        if (country) {
          return { country, state: matchedState, city: matchedCity };
        }
      }
    }
  } catch {
    // fallback to BigDataCloud
  }

  // Fallback to BigDataCloud
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const country = matchCountryName(data.countryName);
      const rawState = data.principalSubdivision || "";
      const matchedState = matchStateName(country, rawState);
      const rawCity = data.city || data.locality || "";
      const matchedCity = matchCityName(country, matchedState, rawCity);
      if (country) {
        return { country, state: matchedState, city: matchedCity };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

async function fetchLocationByIP() {
  // 1. Try our server endpoint first (/api/geoip) which is never blocked by browser adblockers or privacy extensions
  try {
    const res = await fetch("/api/geoip");
    if (res.ok) {
      const data = await res.json();
      if (data?.status === "success" && data.country) {
        const country = matchCountryName(data.country);
        const rawState = data.state || "";
        const matchedState = matchStateName(country, rawState);
        const rawCity = data.city || "";
        const matchedCity = matchCityName(country, matchedState, rawCity);
        if (country) {
          return { country, state: matchedState, city: matchedCity };
        }
      }
    }
  } catch {
    // fallback
  }

  // 2. Direct client-side fallback to ipwho.is
  try {
    const res = await fetch("https://ipwho.is/");
    if (res.ok) {
      const data = await res.json();
      if (data?.success) {
        const country = matchCountryName(data.country);
        const rawState = data.region || "";
        const matchedState = matchStateName(country, rawState);
        const rawCity = data.city || "";
        const matchedCity = matchCityName(country, matchedState, rawCity);
        if (country) {
          return { country, state: matchedState, city: matchedCity };
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export default function useGeoCountryLock() {
  const [geo, setGeo] = useState(() => ({
    status: supportsGeolocation() ? "loading" : "unsupported",
    country: "",
    state: "",
    city: "",
    showHelp: false,
  }));

  const detectLocation = async (manualClick = false) => {
    setGeo((g) => ({ ...g, status: "loading", showHelp: false }));

    // 1. Immediately fetch IP geolocation so fields fill without any delay
    let currentIP = null;
    try {
      currentIP = await fetchLocationByIP();
      if (currentIP && currentIP.country) {
        setGeo({
          status: "ready",
          country: currentIP.country,
          state: currentIP.state || "",
          city: currentIP.city || "",
          showHelp: false,
        });
      }
    } catch {
      // ignore
    }

    // 2. Also query GPS if browser supports it to get more granular coordinates
    if (supportsGeolocation()) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const result = await reverseGeocodeCoords(latitude, longitude);
            if (result && result.country) {
              setGeo({
                status: "ready",
                country: result.country,
                state: result.state || "",
                city: result.city || "",
                showHelp: false,
              });
              return;
            }
          } catch {
            // ignore
          }

          if (!currentIP) {
            const fallbackIP = await fetchLocationByIP();
            if (fallbackIP && fallbackIP.country) {
              setGeo({
                status: "ready",
                country: fallbackIP.country,
                state: fallbackIP.state || "",
                city: fallbackIP.city || "",
                showHelp: false,
              });
            }
          }
        },
        async (err) => {
          if (!currentIP) {
            const fallbackIP = await fetchLocationByIP();
            if (fallbackIP && fallbackIP.country) {
              setGeo({
                status: "ready",
                country: fallbackIP.country,
                state: fallbackIP.state || "",
                city: fallbackIP.city || "",
                showHelp: false,
              });
              return;
            }
            setGeo((g) => ({
              ...g,
              status: "denied",
              showHelp: manualClick || err?.code === 1,
            }));
          }
        },
        { timeout: 5000, maximumAge: 300000, enableHighAccuracy: false }
      );
    } else if (!currentIP) {
      setGeo((g) => ({ ...g, status: "unsupported" }));
    }
  };

  useEffect(() => {
    detectLocation(false);
  }, []);

  return { ...geo, requestLocation: () => detectLocation(true) };
}
