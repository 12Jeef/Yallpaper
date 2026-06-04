// vite.config.ts
import { defineConfig } from "vite";
import { staticBuildExtension } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

export default defineConfig({
  plugins: [viteWesl({ extensions: [staticBuildExtension] })],
  build: {
    assetsDir: ".",
  },
});
