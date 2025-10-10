/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_INTL_CONFIG: './next-intl.config.ts'
  }
};

export default nextConfig;
