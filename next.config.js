/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    allowedDevOrigins: ["192.168.2.17"], // autorise accès réseau local
  },

  async rewrites() {
    return [
      {
        source: "/api",
        destination: "http://127.0.0.1:8000/api",
      },
    ];
  },
};

module.exports = nextConfig;
