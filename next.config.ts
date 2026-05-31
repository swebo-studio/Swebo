import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
    localPatterns: [{ pathname: "/uploads/**" }, { pathname: "/logo.png" }, { pathname: "/size-guide.png" }],
  },
};

export default nextConfig;
