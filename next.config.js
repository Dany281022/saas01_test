/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api',
        destination: 'http://localhost:8000/api',
      },
    ];
  },
};

module.exports = nextConfig;
