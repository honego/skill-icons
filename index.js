const SHORT_NAMES = Object.freeze({
  js: ["javascript"],
  html: ["html5"],
  css: ["css", "css3"],
  ts: ["typescript"],
  py: ["python"],
  java: ["openjdk"],
  tailwind: ["tailwindcss"],
  vue: ["vuedotjs", "vuejs"],
  vuejs: ["vuedotjs"],
  nuxt: ["nuxt", "nuxtjs"],
  nuxtjs: ["nuxt"],
  go: ["go", "golang"],
  golang: ["go"],
  cf: ["cloudflare"],
  azure: ["microsoftazure"],
  wasm: ["webassembly"],
  postgres: ["postgresql"],
  k8s: ["kubernetes"],
  next: ["nextdotjs", "nextjs"],
  nextjs: ["nextdotjs"],
  mongo: ["mongodb"],
  md: ["markdown"],
  ps: ["adobephotoshop", "photoshop"],
  photoshop: ["adobephotoshop"],
  ai: ["adobeillustrator", "illustrator"],
  illustrator: ["adobeillustrator"],
  pr: ["adobepremierepro", "premiere"],
  premiere: ["adobepremierepro"],
  ae: ["adobeaftereffects", "aftereffects"],
  aftereffects: ["adobeaftereffects"],
  scss: ["sass"],
  sc: ["scala"],
  net: ["dotnet"],
  gatsbyjs: ["gatsby"],
  gql: ["graphql"],
  vlang: ["v"],
  aws: ["amazonwebservices"],
  amazonwebservices: ["amazonwebservices"],
  bots: ["discord"],
  express: ["express", "expressjs"],
  expressjs: ["express"],
  googlecloud: ["googlecloud", "gcp"],
  gcp: ["googlecloud"],
  mui: ["mui", "materialui"],
  materialui: ["mui"],
  windi: ["windicss"],
  unreal: ["unrealengine"],
  nest: ["nestjs"],
  ktorio: ["ktor"],
  pwsh: ["powershell"],
  au: ["adobeaudition", "audition"],
  audition: ["adobeaudition"],
  rollup: ["rollupdotjs", "rollupjs"],
  rollupjs: ["rollupdotjs"],
  rxjs: ["reactivex"],
  rxjava: ["reactivex"],
  ghactions: ["githubactions"],
  sklearn: ["scikitlearn"],
  nodejs: ["nodedotjs"],
});

const ICONS_PER_LINE = 15;
const ONE_ICON = 48;
const GRID_SIZE = 300;
const GRID_GAP = 44;
const SCALE = ONE_ICON / (GRID_SIZE - GRID_GAP);

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

async function handleRequest(request, env) {
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

    const catalog = await loadCatalog(request, env);
    const iconShortNames = iconParam === "all" ? catalog.iconNameList : iconParam.split(",");
    const iconNames = parseShortNames(iconShortNames, catalog, theme || undefined);

    if (iconNames.length === 0) {
      return new Response("You didn't format the icons param correctly!", {
        status: 400,
      });
    }

    return new Response(generateSvg(iconNames, perLine, catalog.icons), {
      headers: { "Content-Type": "image/svg+xml;charset=UTF-8" },
    });
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
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      return new Response(error?.stack || String(error), { status: 500 });
    }
  },
};
