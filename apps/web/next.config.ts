import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://marketing-8lpfws3er-adams-projects-235734ea.vercel.app/api/:path*",
      },
    ];
  },
};

export default nextConfig;
