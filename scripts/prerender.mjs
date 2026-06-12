/* Build-time prerender of "/" (runs as npm postbuild, locally and on Netlify).
   1. Builds an SSR bundle of src/prerender-entry.jsx.
   2. Renders LandingPage to static HTML.
   3. Injects it into dist/index.html's #root — full landing copy in the raw
      served HTML; the client bundle re-renders on top on load.
   4. Preloads the laptop dashboard image (the LCP element).            */
import { build } from "vite";
import { readFileSync, writeFileSync, rmSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SSR_OUT = resolve(root, "dist-ssr");
const INDEX = resolve(root, "dist", "index.html");

await build({
  root,
  logLevel: "warn",
  build: {
    ssr: resolve(root, "src", "prerender-entry.jsx"),
    outDir: SSR_OUT,
    emptyOutDir: true,
  },
});

const { render } = await import(resolve(SSR_OUT, "prerender-entry.js"));
const appHtml = render();

let html = readFileSync(INDEX, "utf8");
if (!html.includes('<div id="root"></div>')) {
  throw new Error("prerender: dist/index.html #root anchor not found — aborting (index.html shape changed?)");
}
html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

/* preload the LCP image (the laptop dashboard) — hashed URL comes from the render */
const lcp = appHtml.match(/\/assets\/dashboard-[\w-]+\.png/);
if (lcp) {
  html = html.replace(
    "</title>",
    `</title>\n    <link rel="preload" as="image" href="${lcp[0]}" />`
  );
}

writeFileSync(INDEX, html);
rmSync(SSR_OUT, { recursive: true, force: true });

const kb = Math.round(appHtml.length / 1024);
console.log(`prerender: injected ${kb}KB of static landing HTML into dist/index.html${lcp ? ` · preloaded ${lcp[0]}` : ""}`);
