import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "172.28.0.1",
    "192.168.3.201"
  ],
  webpack(config, { isServer }) {
    if (isServer) {
      config.output = config.output ?? {};
      config.output.chunkFilename = "chunks/[name].js";
    }
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb"
    }
  }
};

export default nextConfig;
