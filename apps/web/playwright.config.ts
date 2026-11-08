import { defineConfig } from '@playwright/test';

/**
 * End-to-end checks against the dev server, in the system Chrome.
 * Software rendering (SwiftShader) keeps them runnable without a GPU and acts as a
 * worst-case device: if the game never stalls there, it won't on real hardware.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 6 * 60_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    viewport: { width: 1600, height: 900 },
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  webServer: [
    { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 60_000 },
    { command: 'npm run start -w @shield/server', cwd: '../..', port: 2567, reuseExistingServer: true, timeout: 60_000 },
  ],
});
