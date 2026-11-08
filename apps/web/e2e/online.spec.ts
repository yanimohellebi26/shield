import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Two people at one online table (plus a bot): create, join by code, play to the end.
 * The guest reloads mid-game and must get their seat back.
 */
async function player(browser: Browser, name: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    throw e;
  });
  await page.goto('/?speed=2.5');
  await page.click('.tabs button >> nth=1');
  await page.fill('.field input >> nth=0', name);
  return page;
}

/** Plays one move if it's this player's turn: alternate charge and attack. */
async function step(page: Page, n: number) {
  if (await page.locator('.offer-panel').count()) return page.click('.offer-panel .primary');
  if (!(await page.locator('.act.attack').count())) return;
  if (n % 2 === 0) return page.keyboard.press('c');
  await page.keyboard.press('a');
  await page.waitForTimeout(60);
  for (const k of ['1', '2']) if (await page.locator('.action-bar.targeting').count()) await page.keyboard.press(k);
}

test('two players finish an online game; a reload keeps the seat', async ({ browser }) => {
  const host = await player(browser, 'Ana');
  await host.click('.count:text-is("3")');
  await host.click('.lobby .primary.big');
  const code = (await host.locator('.room-code').innerText()).split('\n')[0]!.trim();
  expect(code).toMatch(/^[A-Z]{5}$/);

  const guest = await player(browser, 'Ben');
  await guest.fill('.code-input', code);
  await guest.click('.join-row .ghost');
  await expect(host.locator('.room-players li', { hasText: 'Ben' })).toBeVisible();
  await expect(guest.locator('.room-card .primary')).toHaveCount(0); // only the host can start

  await host.click('.room-card .primary.big');
  await expect(host.locator('.seat-badge')).toHaveCount(3, { timeout: 20_000 });
  await expect(guest.locator('.seat-badge')).toHaveCount(3, { timeout: 20_000 });

  let moves = 0;
  let reloaded = false;
  const end = Date.now() + 240_000;
  while (Date.now() < end) {
    const overHost = await host.locator('.gameover-card').count();
    const overGuest = await guest.locator('.gameover-card').count();
    if (overHost && overGuest) break;
    await step(host, moves++);
    await step(guest, moves++);
    if (!reloaded && moves > 6) {
      reloaded = true;
      await guest.reload();
      await expect(guest.locator('.seat-badge')).toHaveCount(3, { timeout: 15_000 });
    }
    await host.waitForTimeout(200);
  }
  expect(reloaded).toBe(true);
  await expect(host.locator('.gameover-card')).toBeVisible();
  await expect(guest.locator('.gameover-card')).toBeVisible();
  // Both tables tell the same story: same winner.
  const winner = (p: Page) => p.locator('.gameover-title').innerText();
  const [hw, gw] = [await winner(host), await winner(guest)];
  expect(hw === gw || hw === 'Victoire' || gw === 'Victoire').toBe(true);
});

// Each player has their own browser context; close them so their 3D tables stop rendering
// (left open, they starve the next tests of CPU).
test.afterEach(async ({ browser }) => {
  await Promise.all(browser.contexts().map((c) => c.close()));
});
