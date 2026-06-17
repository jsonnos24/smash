import { defineConfig } from "vite";

// On GitHub Pages the site is served from https://<user>.github.io/smash/,
// so production assets need the "/smash/" base. Dev server stays at root.
export default defineConfig(({ command }) => ({
  root: ".",
  base: command === "build" ? "/smash/" : "/",
  build: { outDir: "dist" },
}));
