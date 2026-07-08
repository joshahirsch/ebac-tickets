/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Type-checking still runs and will fail the build on type errors.
  // ESLint style rules are skipped during production builds to avoid
  // lint-only failures blocking deploys; run `npm run lint` locally instead.
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Server Actions are enabled by default in Next 14; keep body limit generous for attachments metadata.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
