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
});
