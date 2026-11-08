import { expect, test, type Page } from '@playwright/test';

/**
 * Plays whole games with every seat on autoplay and fails if the table ever stops progressing.
 * Regression test for the "attack freezes" bug: animations were frame-driven, so a slow device
 * stretched an attack into what looked like a freeze.
 */

interface Snapshot {
  seq: number;
  phase: string | undefined;
  busy: boolean;
  flyers: string[];
  log: string[];
}

const snapshot = (page: Page) =>
  page.evaluate((): Snapshot => {
    const s = (window as any).__shield.getState();
    return { seq: s.game?.seq ?? -1, phase: s.game?.phase, busy: s.busy, flyers: Object.keys(s.flyers), log: s.log.slice(-4).map((l: any) => l.text) };
  });

async function playFor(page: Page, players: number, ms: number) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/?autoplay&speed=3');
  await page.click(`.count:text-is("${players}")`);
  await page.click('.lobby .primary.big');
  let games = 0;
  let lastSeq = -1;
  let lastChange = Date.now();
  let longestGap = 0;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const st = await snapshot(page);
    if (st.seq !== lastSeq) {
      if (lastSeq >= 0) longestGap = Math.max(longestGap, Date.now() - lastChange);
      lastSeq = st.seq;
      lastChange = Date.now();
    }
    if (st.phase === 'over' && !st.busy) {
      games++;
      await page.click('.gameover .primary');
      lastSeq = -1;
      lastChange = Date.now();
    }
    expect(Date.now() - lastChange, `table stalled: ${JSON.stringify(st)}`).toBeLessThan(12_000);
    await page.waitForTimeout(400);
  }
  expect(errors, errors.join('\n')).toEqual([]);
  return { games, longestGap };
}

test('8-player table never stalls (desktop)', async ({ page }) => {
  const r = await playFor(page, 8, 120_000);
  test.info().annotations.push({ type: 'result', description: `${r.games} games, longest gap ${r.longestGap} ms` });
  expect(r.games + 1).toBeGreaterThan(0);
});

test('never stalls on a 4× slower CPU', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await playFor(page, 6, 120_000);
});

test('phone layout never stalls', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await playFor(page, 8, 90_000);
});
