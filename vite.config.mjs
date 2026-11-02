import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { assertProductionReleaseApproved } from './scripts/production-release-gate.mjs';
import { preflightProductionBuild } from './scripts/preflight-production-build.mjs';

// Reject unapproved production commits before Vite produces deployable assets.
// Does not alter any existing React UI, CSS, markup, or visual assets.
assertProductionReleaseApproved();
// This is enforced for npm, direct Vite and hosting-provider builds, not just npm lifecycle scripts.
await preflightProductionBuild();

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Keep SDK services independently cacheable without touching UI source.
        manualChunks(id) {
          const path = id.replaceAll('\\', '/');
          if (path.includes('/node_modules/@firebase/firestore/')) return 'firebase-firestore';
          if (path.includes('/node_modules/@firebase/auth/')) return 'firebase-auth';
          if (path.includes('/node_modules/@firebase/storage/')) return 'firebase-storage';
          if (path.includes('/node_modules/@firebase/')) return 'firebase-core';
        },
      },
    },
  },
});
