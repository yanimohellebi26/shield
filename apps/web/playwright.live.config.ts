import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/** Same checks against the deployed site: `LIVE_URL=https://… npx playwright test -c playwright.live.config.ts online` */
export default defineConfig({
  ...base,
  webServer: undefined,
  use: { ...base.use, baseURL: process.env.LIVE_URL ?? 'https://shield-game-five.vercel.app' },
});
