import { defineConfig } from 'vitest/config';

/** Balance simulations: `npm run balance -w @shield/engine`. Slow; prints a report. */
export default defineConfig({ test: { include: ['sim/**/*.sim.ts'], testTimeout: 30 * 60_000, silent: false } });
