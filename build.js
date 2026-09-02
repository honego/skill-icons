import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { icons as skillIconSet } from "@iconify-json/skill-icons";
import { icons as deviconSet } from "@iconify-json/devicon";
import { SHORT_NAMES } from "./aliases.js";

const TILE_SIZE = 256;
const ICON_SIZE = 180;
const ICON_PADDING = (TILE_SIZE - ICON_SIZE) / 2;
const BORDER_RADIUS = 60;
const DEVICON_WORDMARK_SUFFIX = "-wordmark";

const THEMES = {
  dark: {
    background: "#242938",
    fallbackForeground: "#FFFFFF",
  },
  light: {
    background: "#F4F2ED",
    fallbackForeground: "#111827",
  },
};

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(projectRoot, "dist");
const staticDir = path.join(projectRoot, "static");

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function removeThemeSuffix(name) {
  return name.replace(/-(?:dark|light)$/, "");
}

function getIconifyDimensions(icon, iconSet) {
  return {
    left: icon.left ?? iconSet.left ?? 0,
    top: icon.top ?? iconSet.top ?? 0,
    width: icon.width ?? iconSet.width ?? 16,
    height: icon.height ?? iconSet.height ?? 16,
  };
}

function renderOriginalSkillIcon(name, icon) {
  const { left, top, width, height } = getIconifyDimensions(icon, skillIconSet);
  const title = escapeXml(removeThemeSuffix(name).replaceAll("-", " "));

  return [
    `<svg width="${TILE_SIZE}" height="${TILE_SIZE}"`,
    ` viewBox="${left} ${top} ${width} ${height}"`,
    ' xmlns="http://www.w3.org/2000/svg" role="img"',
    ` aria-label="${title}" data-source="@iconify-json/skill-icons">`,
    `<title>${title}</title>${icon.body}</svg>`,
  ].join("");
}

function renderTiledIcon({ body, dimensions, name, source, themeName, foreground }) {
  const theme = THEMES[themeName];
  const title = escapeXml(name.replaceAll("-", " "));
  const { left, top, width, height } = dimensions;

  return [
    `<svg width="${TILE_SIZE}" height="${TILE_SIZE}"`,
    ` viewBox="0 0 ${TILE_SIZE} ${TILE_SIZE}" fill="none"`,
    ' xmlns="http://www.w3.org/2000/svg" role="img"',
    ` aria-label="${title}" data-source="${source}">`,
    `<title>${title}</title>`,
    `<rect width="${TILE_SIZE}" height="${TILE_SIZE}"`,
    ` rx="${BORDER_RADIUS}" fill="${theme.background}"/>`,
    `<svg x="${ICON_PADDING}" y="${ICON_PADDING}"`,
    ` width="${ICON_SIZE}" height="${ICON_SIZE}"`,
    ` viewBox="${left} ${top} ${width} ${height}"`,
    ` preserveAspectRatio="xMidYMid meet" color="${foreground}">`,
    `${body}</svg></svg>`,
  ].join("");
}

function getColoredDevicons() {
  return Object.entries(deviconSet.icons)
    .filter(([name, icon]) => !name.endsWith(DEVICON_WORDMARK_SUFFIX) && typeof icon.body === "string")
    .map(([name, icon]) => ({ name, icon }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

function hasCanonicalIcon(iconMap, name) {
  return name in iconMap || `${name}-dark` in iconMap || `${name}-light` in iconMap;
}

function resolvesToExistingAlias(iconMap, name) {
  return SHORT_NAMES[name]?.some((candidate) => hasCanonicalIcon(iconMap, candidate)) ?? false;
}

function addOriginalSkillIcons(iconMap) {
  for (const [name, icon] of Object.entries(skillIconSet.icons).sort(([first], [second]) =>
    first.localeCompare(second),
  )) {
    iconMap[name] = renderOriginalSkillIcon(name, icon);
  }
}

function addDeviconFallbacks(iconMap) {
  let added = 0;

  for (const { name, icon } of getColoredDevicons()) {
    if (hasCanonicalIcon(iconMap, name) || resolvesToExistingAlias(iconMap, name)) continue;

    const dimensions = getIconifyDimensions(icon, deviconSet);
    for (const [themeName, theme] of Object.entries(THEMES)) {
      iconMap[`${name}-${themeName}`] = renderTiledIcon({
        body: icon.body,
        dimensions,
        name,
        source: "@iconify-json/devicon",
        themeName,
        foreground: theme.fallbackForeground,
      });
    }
    added += 1;
  }

  return added;
}

const iconMap = {};

addOriginalSkillIcons(iconMap);
const deviconFallbackCount = addDeviconFallbacks(iconMap);

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
for (const entry of fs.readdirSync(staticDir, { withFileTypes: true })) {
  fs.cpSync(path.join(staticDir, entry.name), path.join(distDir, entry.name), { recursive: entry.isDirectory() });
}
fs.writeFileSync(path.join(distDir, "icons.json"), `${JSON.stringify(iconMap)}\n`, "utf8");

console.log(
  `Generated ${Object.keys(iconMap).length} SVGs: ${Object.keys(skillIconSet.icons).length} original Skill Icons and ${deviconFallbackCount * 2} colored Devicon variants.`,
);
