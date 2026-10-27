import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { assertProductionReleaseApproved } from './scripts/production-release-gate.mjs';

// Reject unapproved production commits before Vite produces deployable assets.
// Does not alter any existing React UI, CSS, markup, or visual assets.
assertProductionReleaseApproved();

export default defineConfig({
  plugins: [react()],
});
