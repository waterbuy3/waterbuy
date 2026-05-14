// Generates dist/client/index.html for static hosting (Vercel).
// TanStack Start + Cloudflare Workers produces no index.html — this fills that gap.

import { readdirSync, statSync, writeFileSync } from "fs";
import { join } from "path";

const clientDir = "dist/client/assets";
const files = readdirSync(clientDir);

// Largest non-chunk JS file = main entry bundle (contains createRoot)
const jsFiles = files
  .filter((f) => f.endsWith(".js") && !f.startsWith("_"))
  .map((f) => ({ name: f, size: statSync(join(clientDir, f)).size }))
  .sort((a, b) => b.size - a.size);

const mainJs = jsFiles[0].name;
const mainCss = files.find((f) => f.endsWith(".css")) ?? null;

// Minimal bootstrap data that TanStack Start's hydrate() expects on window.$_TSR.
// Without this, the invariant "Expected to find bootstrap data on window.$_TSR" fires
// because the client bundle was built for SSR hydration, not standalone SPA mode.
const bootstrap = `window.$_TSR={router:{matches:[],manifest:undefined,dehydratedData:undefined,lastMatchId:undefined},buffer:[],initialized:false,h:function(){},t:new Map()};`;

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="AquaPure" />
    <meta name="theme-color" content="#1a6fd4" />
    <title>AquaPure — Premium Water Delivery</title>
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png" />
    ${mainCss ? `<link rel="stylesheet" crossorigin href="/assets/${mainCss}" />` : ""}
    <script>${bootstrap}</script>
  </head>
  <body>
    <script type="module" src="/assets/${mainJs}"></script>
  </body>
</html>
`;

writeFileSync("dist/client/index.html", html);
console.log(`✓ Generated dist/client/index.html`);
console.log(`  entry JS : /assets/${mainJs}`);
console.log(`  entry CSS: /assets/${mainCss}`);
