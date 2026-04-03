const esbuild = require("esbuild");
const { glob } = require("glob");
const path = require("path");

const production = process.argv.includes("--minify");
const watch = process.argv.includes("--watch");

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode"],
    alias: {
      "@core": path.resolve(__dirname, "src/core"),
      "@services": path.resolve(__dirname, "src/services"),
      "@commands": path.resolve(__dirname, "src/commands"),
      "@lokal-types": path.resolve(__dirname, "src/types"),
      "@": path.resolve(__dirname, "src"),
    },
    logLevel: "silent",
    plugins: [
      /* add to the end of plugins if you want to clean dist before build */
      {
        name: "clean-dist",
        setup(build) {
          build.onStart(() => {
            const distPath = path.join(__dirname, "dist");
            try {
              // fs.rmSync(distPath, { recursive: true, force: true });
            } catch (e) {}
          });
        },
      },
    ],
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
