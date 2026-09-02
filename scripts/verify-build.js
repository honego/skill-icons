import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as simpleIcons from "simple-icons";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const iconFile = path.join(projectRoot, "dist", "icons.json");
const legacyIconDirectory = path.join(projectRoot, "icons");

function fail(message) {
  throw new Error(`Build verification failed: ${message}`);
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

const upstreamIcons = Object.values(simpleIcons).filter(
  (icon) =>
    icon &&
    typeof icon === "object" &&
    typeof icon.slug === "string" &&
    typeof icon.title === "string" &&
    typeof icon.hex === "string" &&
    typeof icon.path === "string" &&
    typeof icon.svg === "string",
);

if (upstreamIcons.length === 0) {
  fail("Simple Icons exported no icons");
}

for (const icon of upstreamIcons) {
  for (const theme of ["dark", "light"]) {
    const key = `${icon.slug}-${theme}`;
    const svg = icons[key];
    if (typeof svg !== "string") {
      fail(`missing ${key}`);
    }
    if (!svg.includes('width="256"') || !svg.includes('height="256"')) {
      fail(`${key} does not use the configured tile size`);
    }
  }
}

const expectedSvgCount = upstreamIcons.length * 2;
const generatedSvgCount = Object.keys(icons).length;
if (generatedSvgCount !== expectedSvgCount) {
  fail(`expected ${expectedSvgCount} SVGs, found ${generatedSvgCount}`);
}

console.log(`Verified ${generatedSvgCount} dark/light SVGs for ${upstreamIcons.length} icons.`);
