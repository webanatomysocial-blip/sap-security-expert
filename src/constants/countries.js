import { Country, State, City } from "country-state-city";

export const COUNTRIES = Country.getAllCountries()
  .map((c) => ({ name: c.name, isoCode: c.isoCode }))
  .sort((a, b) => a.name.localeCompare(b.name));

const isoByName = new Map(COUNTRIES.map((c) => [c.name, c.isoCode]));

// ISO code -> flag emoji via regional indicator symbols (native, no data file).
export const countryFlag = (countryName) => {
  const isoCode = isoByName.get(countryName);
  if (!isoCode) return "";
  return [...isoCode.toUpperCase()]
    .map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))
    .join("");
};

export const statesForCountry = (countryName) => {
  const isoCode = isoByName.get(countryName);
  if (!isoCode) return [];
  return (State.getStatesOfCountry(isoCode) || [])
    .map((s) => ({ name: s.name, isoCode: s.isoCode }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

// Falls back to all cities in the country when it has no state-level data
// (many small countries), or when no state has been picked yet.
export const citiesForCountry = (countryName, stateName) => {
  const countryIso = isoByName.get(countryName);
  if (!countryIso) return [];
  if (stateName) {
    const states = State.getStatesOfCountry(countryIso) || [];
    const state = states.find((s) => s.name === stateName);
    if (state) return (City.getCitiesOfState(countryIso, state.isoCode) || []).map((c) => c.name);
  }
  return (City.getCitiesOfCountry(countryIso) || []).map((c) => c.name);
};
