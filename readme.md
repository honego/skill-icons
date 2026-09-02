<p align="center"><img align="center" width="280" src="./.github/text-logo.svg#gh-dark-mode-only"/></p>
<p align="center"><img align="center" width="280" src="./.github/text-logo-light.svg#gh-light-mode-only"/></p>
<h3 align="center">Showcase your skills on GitHub or your résumé with ease.</h3>

---

This fork keeps the familiar Skill Icons routes and SVG layout while sourcing its
icon catalog from the official [Simple Icons](https://simpleicons.org/) npm
package. The repository does not maintain individual icon SVG files.

## Usage

Use either `i` or `icons` to provide comma-separated icon IDs:

```md
[![My Skills](https://skillicons.dev/icons?i=js,html,css,wasm)](https://skillicons.dev)
```

Use either `t` or `theme` to select `dark` or `light`. The default is `dark`:

```md
[![My Skills](https://skillicons.dev/icons?icons=java,kotlin,nodejs,figma&theme=light)](https://skillicons.dev)
```

Use `perline` to select between 1 and 50 icons per row. The default is 15:

```md
[![My Skills](https://skillicons.dev/icons?i=aws,gcp,azure,react,vue,flutter&perline=3)](https://skillicons.dev)
```

`/icons?i=all` renders the complete current catalog.

## API

| Route            | Response                                              |
| ---------------- | ----------------------------------------------------- |
| `GET /icons`     | A composed SVG for the requested icons.               |
| `GET /api/icons` | All canonical IDs derived from the generated SVG map. |
| `GET /api/svgs`  | The complete generated SVG map.                       |

The live icon list is available from
[`/api/icons`](https://skillicons.dev/api/icons), so there is no hand-maintained
README list to synchronize.

Existing short aliases such as `js`, `ts`, `py`, `go`, `k8s`, `cf`, `postgres`,
`next`, `mongo`, and `md` remain supported when their upstream icon is present.

## Icon pipeline

GitHub Actions is the source of truth for generated assets:

1. `npm ci` installs the locked Simple Icons and Wrangler 4 versions.
2. The build discovers every icon exported by Simple Icons.
3. Each path is centered without stretching in a 256 × 256 tile with a 180 ×
   180 icon area and consistent rounded backgrounds.
4. Brand colors are retained when they have enough contrast; otherwise an
   automatic light or dark foreground is used.
5. Dark and light variants are written to `dist/icons.json`.
6. The generated count, variants, JSON, tile size, and Wrangler bundle are
   verified before deployment.

Updating the `simple-icons` dependency is enough to pick up upstream additions;
no source list or SVG directory needs to be edited. Requests for new brand icons
should be made in the
[Simple Icons repository](https://github.com/simple-icons/simple-icons).

Please review the Simple Icons
[legal disclaimer](https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md)
before using its brand assets.

## License

This project is available under the [MIT License](./LICENSE). Simple Icons assets
are distributed under their upstream terms.
