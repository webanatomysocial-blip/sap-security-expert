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

// Detects the user's country/state/city from the browser's location, the
// same way a "use my location" button on a maps site works. Once location
// is detected, forms will auto-sync country, state, and city.
const supportsGeolocation = () => typeof navigator !== "undefined" && !!navigator.geolocation;

export default function useGeoCountryLock() {
  const [geo, setGeo] = useState(() => ({
    status: supportsGeolocation() ? "loading" : "unsupported",
    country: "",
    state: "",
    city: "",
  }));

  const detectLocation = () => {
    if (!supportsGeolocation()) return;
    setGeo((g) => ({ ...g, status: "loading" }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await res.json();
          const country = matchCountryName(data.countryName);
          if (!country) {
            setGeo({ status: "error", country: "", state: "", city: "" });
            return;
          }
          const rawState = data.principalSubdivision || "";
          const matchedState = matchStateName(country, rawState);
          const rawCity = data.city || data.locality || "";
          const matchedCity = matchCityName(country, matchedState, rawCity);

          setGeo({
            status: "ready",
            country,
            state: matchedState,
            city: matchedCity,
          });
        } catch {
          setGeo((g) => ({ ...g, status: "error" }));
        }
      },
      () => setGeo((g) => ({ ...g, status: "denied" })),
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  useEffect(() => {
    detectLocation();
  }, []);

  return { ...geo, requestLocation: detectLocation };
}
