import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { dirs: ["app", "components", "hooks", "lib", "data", "types"] },
};

export default nextConfig;
