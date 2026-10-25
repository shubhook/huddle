import tailwind from "bun-plugin-tailwind";
import { cp, rm } from "node:fs/promises";
import path from "node:path";

const outdir = path.join(process.cwd(), "dist");
await rm(outdir, { recursive: true, force: true });

const entrypoints = [...new Bun.Glob("src/**/*.html").scanSync()];

const result = await Bun.build({
  entrypoints,
  outdir,
  plugins: [tailwind],
  minify: true,
  target: "browser",
  sourcemap: "linked",
  // Inline BUN_PUBLIC_* (API and WS URLs) like the dev server does via bunfig.toml.
  env: "BUN_PUBLIC_*",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});

for (const output of result.outputs) {
  console.log(` ${path.relative(process.cwd(), output.path)}  ${(output.size / 1024).toFixed(1)} KB`);
}

// Bun.build only copies assets referenced from script/link/img tags, so files
// named only in <meta> (og.png) are copied from public/ verbatim.
const publicdir = path.join(process.cwd(), "public");
await cp(publicdir, outdir, { recursive: true });
for (const file of new Bun.Glob("**/*").scanSync(publicdir)) {
  console.log(` ${path.join("dist", file)}  ${(Bun.file(path.join(publicdir, file)).size / 1024).toFixed(1)} KB`);
}
