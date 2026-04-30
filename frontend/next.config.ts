import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

/** Optionally wrap with bundle analyzer — silently skip if package is missing. */
function wrapBundleAnalyzer(config: NextConfig): NextConfig {
  if (process.env.ANALYZE !== "true") return config;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: withBundleAnalyzer } = require("@next/bundle-analyzer");
    return withBundleAnalyzer({ enabled: true })(config) as unknown as NextConfig;
  } catch {
    return config;
  }
}

export default wrapBundleAnalyzer(nextConfig);
