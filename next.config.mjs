/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma est externalisé du bundle serveur (Next 15).
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
