import path from 'node:path';
import type {NextConfig} from 'next';

// Astryx ships prebuilt CSS, so no StyleX compiler is configured here.
// Add one only if a swizzled component or custom stylex.create() code needs it
// (see `npx astryx docs styling-overview`).
const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    // npm workspaces hoist dependencies to the repository root.
    root: path.join(__dirname, '../..'),
  },
};

export default nextConfig;
