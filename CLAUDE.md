# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

_pasi_ is a browser-based diagram editor (Next.js 16 / React 19). Users draw diagrams on a canvas with a GUI and the app emits LaTeX/`texdraw` code that can be pasted into a paper — and re-imported. It can alternatively emit SVG code (export only, no re-import). It is deployed as a **static export** to GitHub Pages at https://jplate.github.io/pasi.

## Commands

```bash
npm run dev        # local dev server (Next.js)
npm run build      # production build
npm run lint       # eslint src
npm run lint:fix   # eslint src --fix
npm run format     # prettier --write .
```

Deployment is automatic: pushing to the repo triggers the GitHub Actions workflow (`.github/workflows/nextjs.yml`), which builds and publishes to GitHub Pages. There is no manual deploy script.

There is **no test suite** in this repo (no test runner configured).

Formatting (`.prettierrc`): 4-space indent, single quotes, semicolons, 110-char print width, `jsxSingleQuote`. ESLint integrates Prettier, so lint failures often mean formatting drift — run `npm run format`.

## Architecture

### Static-shell + client-app split

The page is a server-rendered marketing/help shell that lazy-loads the interactive editor on the client:

- `src/app/page.tsx` → renders static help sections + `<AppShellLoader>`. It also renders a `#static-sections-fallback` (both light and dark copies) shown before hydration / for no-JS.
- `src/app/components/client/AppShellLoader.tsx` → dynamically imports `AppShell` with `ssr: false`.
- `src/app/components/client/AppShell.tsx` → owns top-level UI state: dark mode (persisted to `localStorage`), mobile detection (mobile is unsupported), `isMac`, and `diagramCode` (the code to load into the editor). Reads `?src=` query param against a hardcoded URL whitelist (`URLS`) to fetch sample diagrams. Renders the help sections and the `MainPanel`.
- `src/app/components/client/MainPanel.tsx` → **the editor**. ~3800 lines; this is the heart of the app.

Help-section content lives once in `src/app/Content.tsx` and is rendered through two parallel wrappers: `Sections.tsx` (interactive, inside the client app) and `StaticSections.tsx` / `StaticSection.tsx` (server/fallback). When editing help text, change `Content.tsx`; the wrappers just supply `dark`/`keyCmd`/`renderCodeButton` props differently.

### The Item class hierarchy (canvas components)

Everything drawable/selectable on the canvas is an `Item` subclass. See `ARCHITECTURE.md` for the full description; the tree:

```
Item (abstract)              src/app/components/client/items/Item.tsx
├─ Node (abstract)           items/Node.tsx — anchors; has radius + coords
│  ├─ ENode                  items/ENode.tsx — entity nodes; top-level list elements
│  │  ├─ SNode (abstract)    items/SNode.tsx — state nodes: connectors/arrows between nodes
│  │  │  ├─ Adjunction       items/snodes/*.tsx — concrete arrow kinds; each parses/emits
│  │  │  ├─ Identity           its own texdraw and drives the ItemEditor
│  │  │  ├─ Order
|  |  |  └─ Transition
│  │  └─ GNode               items/GNode.tsx — 'ghost nodes' that transfer group membership
│  └─ CNode                  items/CNode.tsx — contour nodes; arrays form a Contour
└─ Ornament (abstract)       items/Ornament.tsx — attached to a Node (no own Z-index)
   └─ Label                  items/ornaments/Label.tsx
```

To add a new arrow type, subclass `SNode` under `items/snodes/` and implement `getDefaultW0/W1/WC()` etc.; to add a new attachment, subclass `Ornament` under `items/ornaments/`.

### Central state: the `list`

`MainPanel` holds the canvas in a single state variable `list: (ENode | CNodeGroup)[]` — the top-level Z-ordered elements. A `CNodeGroup` (`CNodeGroup.tsx`) manages an array of `CNode`s defining a contour (splinegon). `MainPanel` owns dozens of `useState` hooks (selection, focusItem, grid, transform flags, unitScale, etc.); editing operations mutate copies of `list` and call `setList`.

Cross-cutting editor logic is factored out of `MainPanel` into helper modules in `components/client/`:

- `Moving.ts` (`move`), `Copying.ts` (`copyItems`, `getTopToBeCopied`)
- `Group.ts` — `StandardGroup`, grouping/membership helpers (`getGroups`, `getLeafMembers`, `depth`)
- `ItemEditor.tsx`, `CanvasEditor.tsx`, `TransformTab.tsx`, `GroupTab.tsx`, `EditorComponents.tsx` — the editor tabs/panes
- `Point.tsx` — used for click points before items are created

### Codec (texdraw ↔ diagram)

`src/app/codec/` round-trips the diagram to/from LaTeX `texdraw` code.

- `Codec1.tsx` — `getCode(list, unitScale)` serializes; `load(...)` parses. The format is versioned by the marker comment `%pasiCodecV1` (`versionString`). Each `Item` subclass contributes its own parse/encode (see the per-class encoding in the `snodes`/`ornaments` files).
- `General.ts` — compact base-N number encoding (`encode`/`decode`, `ENCODE_BASE`, `ENCODE_PRECISION`) used inside the trailing `%`-comments that store editor metadata not expressible in plain texdraw.
- `Texdraw.tsx` — texdraw primitives/parsing.

Sample texdraw strings (the "Othello" relationship diagram, contour examples) are inlined in `Content.tsx`.

### SVG export

A LaTeX/SVG menu button next to the 'Generate' button (state `outputFormat` in `MainPanel`) selects what that button emits into the code panel.

- `src/app/codec/Svg.tsx` — `getSvgCode(list, primaryColor, bg, unitScale, displayFontFactor)` composes the standalone `<svg>`: it collects the visible items in canvas Z-order, merges their bounds, and translates all canvas coordinates (y pointing up) into the SVG's own coordinate system via `svgX = x − minX + margin`, `svgY = maxY − y + margin`.
- Mirroring the texdraw pattern, each drawable class emits its own SVG: `getSvg(transX, transY, …)` and `getSvgBounds()` on `ENode`, `SNode`, `CNodeGroup`, and `Ornament`/`Label`. These must mirror what the corresponding React components (`ENodeComp`, `ConnectorComp`, `Contour`, `Label.Component`) draw — when changing how something is rendered on the canvas, update its `getSvg` too.
- `src/app/util/SvgTools.ts` — shared helpers: number formatting (`fSvg`), color strings, the canvas shading blend, bounds merging, text escaping.
- Deliberate exclusions: GNodes (but not their Labels) and all editor chrome (mark borders, selection titles, ghost gradients, hidden connector-node circles). Colors follow the current display mode.

### Utilities & constants

- `src/app/Constants.ts` — canvas geometry (`H=650`, widths, coordinate bounds), rotation/scaling increments, `MAX_HISTORY`, `MAX_GROUP_LEVEL`.
- `src/app/util/MathTools.ts` — geometry: bezier length/angle/sampling, point rotation/scaling, `getBounds`, `getPath`, base64 bool packing.
- `src/app/util/History.ts` — `useHistory` undo/redo stack used by `MainPanel`.
- `src/app/util/Misc.ts` — `useThrottle`, `matchKeys` (keyboard combo matching), array comparison helpers.
- `src/app/Hotkeys.tsx` — single source of truth for keyboard shortcuts: `hotkeys` array, `hotkeyMap`, and the `HotkeyComp` used to render them in help text.

## Conventions & gotchas

- `@/*` path alias maps to `src/*` (`tsconfig.json`).
- React Compiler is enabled (`babel-plugin-react-compiler`); avoid patterns that defeat it.
- Tailwind **v4** (config-less, via `@tailwindcss/postcss`); theme/utilities live in `src/app/globals.css`, not a `tailwind.config`.
- `AppShell` calls `Object.freeze(Object.prototype)` on mount to guard against prototype pollution.
- Dark/light mode is driven by a `dark`/`light` class on `<html>`/`<body>` plus the `color-scheme` CSS property; many components take a `dark` prop and there are duplicated light/dark static fallbacks.
- Mobile is explicitly **not supported** — `AppShell` shows a "use a desktop" notice instead of the editor.
