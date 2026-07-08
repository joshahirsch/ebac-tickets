import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Next 16/Turbopack was inferring C:\Users\Josh_ as the workspace root
  // because multiple package-lock.json files exist. Pin it to this app folder.
  turbopack: {
    root: __dirname,
  },

  experimental: {
    // Keep body limit generous for attachment metadata/server actions.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;