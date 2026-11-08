import { expect, test } from '@playwright/test';

/**
 * Rendering budget. Draw calls and triangles are device-independent, so they make a stable
 * budget; frame times are reported for information (software rendering is far slower than a GPU).
 */
test('rendering stays within budget during play', async ({ page }) => {
  await page.goto('/?autoplay&speed=2&off=bloom');
  await page.click('.count:text-is("8")');
  await page.click('.lobby .primary.big');
  await page.waitForTimeout(3000);
  await page.evaluate(() => ((window as any).__perf = { frames: [], worst: 0 }));
  await page.waitForTimeout(25_000);
  const r = await page.evaluate(() => {
    const p = (window as any).__perf;
    const f = [...p.frames].sort((a: number, b: number) => a - b);
    return { calls: p.calls, tris: p.tris, programs: p.programs, p50: f[Math.floor(f.length / 2)], p95: f[Math.floor(f.length * 0.95)] };
  });
  test.info().annotations.push({ type: 'perf', description: JSON.stringify(r) });
  console.log('perf', r);
  expect(r.calls).toBeLessThan(400);
  expect(r.tris).toBeLessThan(200_000);
  expect(r.programs).toBeLessThan(40);
});
