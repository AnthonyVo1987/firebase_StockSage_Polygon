
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // No webpack function for async_hooks for v1.2.9
  allowedDevOrigins: ['3000-firebase-studio-1748651395252.cluster-t23zgfo255e32uuvburngnfnn4.cloudworkstations.dev'],
};

export default nextConfig;
