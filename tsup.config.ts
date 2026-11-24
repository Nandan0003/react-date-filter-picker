import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    styles: "src/styles.css",
  },
  format: ["esm", "cjs"],
  dts: { entry: { index: "src/index.ts" } },
  sourcemap: true,
  clean: true,
  target: "es2020",
  external: ["react", "react-dom", "react/jsx-runtime"],
  // Mark the bundle as a Client Component for Next.js App Router / RSC users.
  banner: { js: '"use client";' },
});
