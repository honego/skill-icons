import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { icons as skillIconSet } from "@iconify-json/skill-icons";
import { icons as deviconSet } from "@iconify-json/devicon";
import { SHORT_NAMES } from "../aliases.js";

const DEVICON_WORDMARK_SUFFIX = "-wordmark";
const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const iconFile = path.join(projectRoot, "dist", "icons.json");
const legacyIconDirectory = path.join(projectRoot, "icons");

function fail(message) {
  throw new Error(`Build verification failed: ${message}`);
}

function removeThemeSuffix(name) {
  return name.replace(/-(?:dark|light)$/, "");
}

if (fs.existsSync(legacyIconDirectory)) {
  fail("the legacy icons/ directory still exists");
}

if (!fs.existsSync(iconFile)) {
  fail("dist/icons.json does not exist");
}

let icons;
try {
  icons = JSON.parse(fs.readFileSync(iconFile, "utf8"));
} catch (error) {
  fail(`dist/icons.json is not valid JSON (${error.message})`);
}

const generatedNames = new Set(Object.keys(icons));
const skillIconNames = Object.keys(skillIconSet.icons);
const skillCanonicalNames = new Set(skillIconNames.map(removeThemeSuffix));
const deviconNames = Object.entries(deviconSet.icons)
  .filter(([name, icon]) => !name.endsWith(DEVICON_WORDMARK_SUFFIX) && typeof icon.body === "string")
  .map(([name]) => name)
  .sort();
const selectedCanonicalNames = new Set(skillCanonicalNames);
const deviconFallbackNames = [];
for (const name of deviconNames) {
  const resolvesToSelectedAlias =
    SHORT_NAMES[name]?.some((candidate) => selectedCanonicalNames.has(candidate)) ?? false;
  if (selectedCanonicalNames.has(name) || resolvesToSelectedAlias) continue;
  selectedCanonicalNames.add(name);
  deviconFallbackNames.push(name);
}

if (skillIconNames.length === 0 || deviconNames.length === 0) {
  fail("one or more upstream icon packages exported no icons");
}

for (const name of skillIconNames) {
  const svg = icons[name];
  if (typeof svg !== "string" || !svg.includes('data-source="@iconify-json/skill-icons"')) {
    fail(`original Skill Icon ${name} is missing or was overwritten`);
  }
}

for (const name of deviconFallbackNames) {
  for (const theme of ["dark", "light"]) {
    const key = `${name}-${theme}`;
    const svg = icons[key];
    if (typeof svg !== "string" || !svg.includes('data-source="@iconify-json/devicon"')) {
      fail(`Devicon fallback ${key} is missing or has the wrong source`);
    }
  }
}

for (const [name, svg] of Object.entries(icons)) {
  if (typeof svg !== "string") {
    fail(`${name} is not an SVG string`);
  }
  if (!svg.includes('width="256"') || !svg.includes('height="256"')) {
    fail(`${name} does not use the configured tile size`);
  }
}

const expectedSvgCount = skillIconNames.length + deviconFallbackNames.length * 2;
const generatedSvgCount = generatedNames.size;
if (generatedSvgCount !== expectedSvgCount) {
  fail(`expected ${expectedSvgCount} SVGs, found ${generatedSvgCount}`);
}

console.log(`Verified ${generatedSvgCount} SVGs with Skill Icons → colored Devicon source priority.`);
