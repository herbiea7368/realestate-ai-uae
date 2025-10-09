import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin({
  locales: ['en', 'ar'],
  defaultLocale: 'en'
});

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@realestate-ai-uae/ui'],
  experimental: {
    typedRoutes: true
  }
};

export default withNextIntl(nextConfig);
