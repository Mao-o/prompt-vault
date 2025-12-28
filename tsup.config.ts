import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "background/service_worker": "src/background/service_worker.ts",
    "content/content_script": "src/content/content_script.ts",
    "ui/palette": "src/ui/palette.ts"
  },
  format: ["esm"],
  target: "chrome120",
  outDir: "dist",
  splitting: false,
  sourcemap: true,
  minify: false,
  clean: false,
  dts: false,
  platform: "browser",
  treeshake: true
});
