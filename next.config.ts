import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
    localPatterns: [{ pathname: "/uploads/**" }, { pathname: "/logo.png" }],
  },
};

export default nextConfig;
