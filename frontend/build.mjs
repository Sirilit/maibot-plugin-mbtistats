import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.resolve(
  here,
  "../mbtistats/assets/template/mbti-stats/dashboard.bundle.js",
);

await build({
  entryPoints: [path.join(here, "src/scripts.mjs")],
  bundle: true,
  format: "iife",
  globalName: "MbtistatsDashboardBundle",
  outfile,
  target: ["es2020"],
  charset: "utf8",
  legalComments: "none",
  footer: {
    js: "window.setupCharts = MbtistatsDashboardBundle.setupCharts;",
  },
});

console.log(`built ${outfile}`);
