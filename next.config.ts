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
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'https',
        hostname: 'images.unsplash.com',
         port: '',
        pathname: '/**',
      },
    ],
  },
  // Remove @vis.gl/react-google-maps from transpilePackages if it exists
  // transpilePackages: ['@vis.gl/react-google-maps'] <--- Remove this line if present
};

export default nextConfig;
