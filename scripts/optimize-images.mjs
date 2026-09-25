// One-off image slimming for the site's own static assets (run: node scripts/optimize-images.mjs).
//  - hero banners: add a .webp next to each .png (code now points at the .webp)
//  - Raghu's avatar: shrunk in place (same path, still referenced by the API/DB)
//  - blog cover .jpg files: re-encoded in place, capped at 1600px wide
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const kb = (f) => Math.round(fs.statSync(f).size / 1024);
const report = [];
const note = (label, before, after) => report.push(`${label}: ${before} KB -> ${after} KB`);

const heroDir = "public/assets/images";
for (const f of fs.readdirSync(heroDir)) {
  if (!/^hero-.*\.png$/.test(f)) continue;
  const src = path.join(heroDir, f);
  const dest = src.replace(/\.png$/, ".webp");
  await sharp(src).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dest);
  note(f, kb(src), kb(dest));
}

{
  const src = "public/assets/raghu_boddu_hero.png";
  const dest = "public/assets/raghu_boddu_hero.webp";
  await sharp(src).webp({ quality: 82 }).toFile(dest);
  note("raghu_boddu_hero", kb(src), kb(dest));
}

{
  const f = "public/assets/raghu_boddu.png";
  const before = kb(f);
  const buf = await sharp(f).resize({ width: 512, height: 512, fit: "cover" }).png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
  fs.writeFileSync(f, buf);
  note("raghu_boddu.png (in place, 512px)", before, kb(f));
}

const blogDir = "public/images/blogs";
for (const f of fs.readdirSync(blogDir)) {
  if (!/\.jpe?g$/i.test(f)) continue;
  const p = path.join(blogDir, f);
  const before = kb(p);
  if (before < 250) continue;
  const buf = await sharp(p).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  if (buf.length < fs.statSync(p).size) fs.writeFileSync(p, buf);
  note(f, before, kb(p));
}
console.log(report.join("\n"));
