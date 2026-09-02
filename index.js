import { SHORT_NAMES } from "./aliases.js";

const ICONS_PER_LINE = 15;
const ONE_ICON = 48;
const GRID_SIZE = 300;
const GRID_GAP = 44;
const SCALE = ONE_ICON / (GRID_SIZE - GRID_GAP);
const ICON_CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";

let catalogPromise;

function removeThemeSuffix(name) {
  return name.replace(/-(?:dark|light)$/, "");
}

async function loadCatalog(request, env) {
  if (!catalogPromise) {
    const iconsUrl = new URL("/icons.json", request.url);
    catalogPromise = env.ASSETS.fetch(iconsUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load generated icons: ${response.status}`);
        }
        return response.json();
      })
      .then((icons) => {
        const iconKeys = Object.keys(icons);
        const iconNameList = [...new Set(iconKeys.map(removeThemeSuffix))].sort();
        const themedIcons = new Set(iconKeys.filter((name) => /-(?:dark|light)$/.test(name)).map(removeThemeSuffix));

        return {
          icons,
          iconNameList,
          iconNames: new Set(iconNameList),
          themedIcons,
        };
      })
      .catch((error) => {
        catalogPromise = undefined;
        throw error;
      });
  }

  return catalogPromise;
}

function generateSvg(iconNames, perLine, icons) {
  const iconSvgList = iconNames.map((name) => icons[name]);
  const width = Math.min(perLine * GRID_SIZE, iconNames.length * GRID_SIZE) - GRID_GAP;
  const height = Math.ceil(iconSvgList.length / perLine) * GRID_SIZE - GRID_GAP;
  const scaledHeight = height * SCALE;
  const scaledWidth = width * SCALE;

  return `
  <svg width="${scaledWidth}" height="${scaledHeight}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">
    ${iconSvgList
      .map(
        (icon, index) => `
        <g transform="translate(${(index % perLine) * GRID_SIZE}, ${Math.floor(index / perLine) * GRID_SIZE})">
          ${icon}
        </g>`,
      )
      .join(" ")}
  </svg>
  `;
}

function resolveAlias(name, iconNames) {
  if (iconNames.has(name)) return name;
  return SHORT_NAMES[name]?.find((candidate) => iconNames.has(candidate));
}

function parseShortNames(names, catalog, theme = "dark") {
  return names
    .map((name) => resolveAlias(name, catalog.iconNames))
    .filter(Boolean)
    .map((name) => (catalog.themedIcons.has(name) ? `${name}-${theme}` : name));
}

async function handleRequest(request, env, ctx) {
  const { pathname, searchParams } = new URL(request.url);
  const path = pathname.replace(/^\/|\/$/g, "");

  if (path === "icons") {
    const iconParam = searchParams.get("i") || searchParams.get("icons");
    if (!iconParam) {
      return new Response("You didn't specify any icons!", { status: 400 });
    }

    const theme = searchParams.get("t") || searchParams.get("theme");
    if (theme && theme !== "dark" && theme !== "light") {
      return new Response('Theme must be either "light" or "dark"', {
        status: 400,
      });
    }

    const perLineValue = searchParams.get("perline") || ICONS_PER_LINE;
    const perLine = Number(perLineValue);
    if (!Number.isInteger(perLine) || perLine < 1 || perLine > 50) {
      return new Response("Icons per line must be a number between 1 and 50", {
        status: 400,
      });
    }

    let cache;
    let cacheKey;
    if (request.method === "GET" && iconParam === "all") {
      const cacheUrl = new URL("/icons", request.url);
      cacheUrl.searchParams.set("i", "all");
      cacheUrl.searchParams.set("theme", theme || "dark");
      cacheUrl.searchParams.set("perline", String(perLine));
      cache = caches.default;
      cacheKey = new Request(cacheUrl);

      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) return cachedResponse;
    }

    const catalog = await loadCatalog(request, env);
    const iconShortNames = iconParam === "all" ? catalog.iconNameList : iconParam.split(",");
    const iconNames = parseShortNames(iconShortNames, catalog, theme || undefined);

    if (iconNames.length === 0) {
      return new Response("You didn't format the icons param correctly!", {
        status: 400,
      });
    }

    const response = new Response(generateSvg(iconNames, perLine, catalog.icons), {
      headers: {
        "Cache-Control": ICON_CACHE_CONTROL,
        "Content-Type": "image/svg+xml;charset=UTF-8",
      },
    });

    if (cache && cacheKey) ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }

  if (path === "api/icons") {
    const { iconNameList } = await loadCatalog(request, env);
    return new Response(JSON.stringify(iconNameList), {
      headers: { "Content-Type": "application/json;charset=UTF-8" },
    });
  }

  if (path === "api/svgs") {
    const { icons } = await loadCatalog(request, env);
    return new Response(JSON.stringify(icons), {
      headers: { "Content-Type": "application/json;charset=UTF-8" },
    });
  }

  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch (error) {
      return new Response(error?.stack || String(error), { status: 500 });
    }
  },
};
