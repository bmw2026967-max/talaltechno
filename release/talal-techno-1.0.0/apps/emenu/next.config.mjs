import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Docker builds set NEXT_STANDALONE=true. Local Windows builds skip standalone
  // because symlink creation needs Developer Mode / elevated permissions.
  output: process.env.NEXT_STANDALONE === 'true' ? 'standalone' : undefined,
  outputFileTracingRoot: path.join(directory, '../../'),
  basePath: basePath || undefined,
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    NEXT_PUBLIC_BASE_PATH: basePath
  }
};

export default nextConfig;
