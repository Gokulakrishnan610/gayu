
import type {NextConfig} from 'next';
import CopyPlugin from 'copy-webpack-plugin';
import path from 'path';


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
   webpack: (config, { isServer }) => {
    // Only run this plugin on the client build
    if (!isServer) {
        config.plugins.push(
            new CopyPlugin({
                patterns: [
                    {
                        from: path.join(__dirname, 'node_modules/leaflet/dist/images'),
                        to: path.join(__dirname, '.next/static/media'), // Adjust destination if needed
                    },
                     // Optional: If you were importing leaflet.css directly and still need it copied
                     {
                        from: path.join(__dirname, 'node_modules/leaflet/dist/leaflet.css'),
                       to: path.join(__dirname, '.next/static/css'),
                      },
                ],
            })
        );
    }

    return config;
  },
};

export default nextConfig;
