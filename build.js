import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as simpleIcons from "simple-icons";

const TILE_SIZE = 256;
const ICON_SIZE = 180;
const ICON_PADDING = (TILE_SIZE - ICON_SIZE) / 2;
const BORDER_RADIUS = 44;
const SOURCE_VIEWBOX_SIZE = 24;
const MIN_CONTRAST_RATIO = 3;

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

function relativeLuminance(hex) {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function renderIcon(icon, themeName) {
  const theme = THEMES[themeName];
  const brandColor = `#${icon.hex.toUpperCase()}`;
  const foreground =
    contrastRatio(brandColor, theme.background) >= MIN_CONTRAST_RATIO ? brandColor : theme.fallbackForeground;
  const scale = ICON_SIZE / SOURCE_VIEWBOX_SIZE;
  const title = escapeXml(icon.title);

  return `<svg width="${TILE_SIZE}" height="${TILE_SIZE}" viewBox="0 0 ${TILE_SIZE} ${TILE_SIZE}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}" data-slug="${icon.slug}" data-brand-color="${brandColor}"><title>${title}</title><rect width="${TILE_SIZE}" height="${TILE_SIZE}" rx="${BORDER_RADIUS}" fill="${theme.background}"/><path d="${icon.path}" fill="${foreground}" transform="translate(${ICON_PADDING} ${ICON_PADDING}) scale(${scale})"/></svg>`;
}

function getUpstreamIcons() {
  const icons = Object.values(simpleIcons)
    .filter(
      (icon) =>
        icon &&
        typeof icon === "object" &&
        typeof icon.slug === "string" &&
        typeof icon.title === "string" &&
        typeof icon.hex === "string" &&
        typeof icon.path === "string" &&
        typeof icon.svg === "string",
    )
    .sort((first, second) => first.slug.localeCompare(second.slug));

  if (icons.length === 0) {
    throw new Error("Simple Icons did not export any icons.");
  }

  const uniqueSlugs = new Set(icons.map((icon) => icon.slug));
  if (uniqueSlugs.size !== icons.length) {
    throw new Error("Simple Icons exported duplicate slugs.");
  }

  return icons;
}

function buildIconMap(upstreamIcons) {
  const result = {};

  for (const icon of upstreamIcons) {
    for (const themeName of Object.keys(THEMES)) {
      result[`${icon.slug}-${themeName}`] = renderIcon(icon, themeName);
    }
  }

  return result;
}

const upstreamIcons = getUpstreamIcons();
const iconMap = buildIconMap(upstreamIcons);

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
for (const entry of fs.readdirSync(staticDir, { withFileTypes: true })) {
  fs.cpSync(path.join(staticDir, entry.name), path.join(distDir, entry.name), { recursive: entry.isDirectory() });
}
fs.writeFileSync(path.join(distDir, "icons.json"), `${JSON.stringify(iconMap)}\n`, "utf8");

console.log(`Generated ${Object.keys(iconMap).length} themed SVGs from ${upstreamIcons.length} Simple Icons.`);
