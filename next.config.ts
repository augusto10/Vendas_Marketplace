import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://172.28.0.1:3000",
    "http://172.28.0.1:3001",
    "http://192.168.3.201:3000",
    "http://192.168.3.201:3001"
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
