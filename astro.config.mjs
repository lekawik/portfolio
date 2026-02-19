import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

import react from "@astrojs/react";

import sitemap from "@astrojs/sitemap";

import alpinejs from "@astrojs/alpinejs";

export default defineConfig({
  site: "https://ssamama.com",
  image: { remotePatterns: [{ protocol: "https", hostname: "ssamama.com" }] },
  integrations: [tailwind(), react(), sitemap(), alpinejs()]
});
