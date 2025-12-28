## Build pipeline
- Install deps: `npm install`
- Build once: `npm run build` -> outputs compiled JS to `dist/background/service_worker.js`, `dist/content/content_script.js`, `dist/ui/palette.js` plus copied `dist/ui/styles.css`, `dist/ui/palette.html`, and `dist/manifest.json`.
- Watch mode: `npm run dev` (rebuilds JS and recopies static assets/manifest on change).
- Load unpacked in Chrome from the `dist/` directory after a build.

Notes:
- TypeScript is strict (see `tsconfig.json`); `npm run build` runs `tsc --noEmit` before bundling.
- Bundling uses `tsup` with ESM output and no code-splitting to keep predictable file names for the manifest.
