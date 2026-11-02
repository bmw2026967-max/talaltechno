import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Docker builds set NEXT_STANDALONE=true. Local Windows builds skip standalone
  // because symlink creation needs Developer Mode / elevated permissions.
  output: process.env.NEXT_STANDALONE === 'true' ? 'standalone' : undefined,
  outputFileTracingRoot: path.join(directory, '../../'),
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    NEXT_PUBLIC_EMENU_URL: process.env.NEXT_PUBLIC_EMENU_URL || '/menu'
  }
};

export default nextConfig;
