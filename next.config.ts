import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
    localPatterns: [{ pathname: "/uploads/**" }, { pathname: "/logo.png" }, { pathname: "/size-guide.png" }],
  },
};

export default nextConfig;
