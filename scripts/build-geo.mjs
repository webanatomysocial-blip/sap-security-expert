// Splits the country-state-city dataset into small per-country files under
// public/geo so the browser only downloads the country a visitor picks
// (instead of the 7.7 MB city database). Re-run after upgrading the package:
//   node scripts/build-geo.mjs
import fs from "node:fs";
import path from "node:path";
import { Country, State, City } from "country-state-city";

const out = path.join(process.cwd(), "public", "geo");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "states"), { recursive: true });
fs.mkdirSync(path.join(out, "cities"), { recursive: true });

const countries = Country.getAllCountries()
  .map((c) => [c.name, c.isoCode])
  .sort((a, b) => a[0].localeCompare(b[0]));
// Small enough to bundle: dropdowns and flags need it synchronously.
fs.writeFileSync(path.join(process.cwd(), "src", "constants", "countries.json"), JSON.stringify(countries));

for (const [, iso] of countries) {
  const states = (State.getStatesOfCountry(iso) || [])
    .map((s) => [s.name, s.isoCode])
    .sort((a, b) => a[0].localeCompare(b[0]));
  if (states.length) fs.writeFileSync(path.join(out, "states", `${iso}.json`), JSON.stringify(states));

  // { "<stateIso>": [cityNames] }; the whole-country list is the flattened values.
  const byState = {};
  for (const c of City.getCitiesOfCountry(iso) || []) (byState[c.stateCode] ||= []).push(c.name);
  if (Object.keys(byState).length) fs.writeFileSync(path.join(out, "cities", `${iso}.json`), JSON.stringify(byState));
}
console.log("geo files written to", out);
