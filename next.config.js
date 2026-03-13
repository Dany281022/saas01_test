/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',    // Indique à Next.js de générer du HTML/JS pur pour AWS
  images: {
    unoptimized: true  // Obligatoire pour l'exportation statique
  }
};

module.exports = nextConfig;
