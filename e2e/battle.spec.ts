import { expect, test } from '@playwright/test';
import { attackRange, movementRange, type GameState, type Unit } from '../src/game/rules';

const distance = (a: Unit | { x: number; y: number }, b: Unit): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

test('play an entire battle, inspect state, and restart', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  const state = async (): Promise<GameState> => page.evaluate(() => window.__GAME_TEST__!.getState());
  const ready = async (): Promise<void> => {
    await expect.poll(() => page.evaluate(() => window.__GAME_TEST__!.isBusy())).toBe(false);
  };
  const tile = async (x: number, y: number): Promise<void> => {
    const bounds = await page.locator('#game canvas').boundingBox();
    if (!bounds) throw new Error('Phaser canvas is missing');
    await page.mouse.click(bounds.x + (20 + x * 72 + 36) * bounds.width / 616,
      bounds.y + (20 + y * 72 + 36) * bounds.height / 472);
    await ready();
  };
  try {
    await page.goto('/');
    await expect.poll(async () => (await state()).turn).toBe('blue');
    await expect(page.locator('#phase-banner')).not.toHaveClass(/visible/);
    await page.screenshot({ path: testInfo.outputPath('battle-start.png'), fullPage: true });
    for (let round = 0; round < 12; round++) {
      let current = await state();
      for (const hero of current.units.filter(unit => unit.team === 'blue')) {
        current = await state();
        const active = current.units.find(unit => unit.id === hero.id);
        if (!active || active.attacked || current.winner) continue;
        await tile(active.x, active.y);
        current = await state();
        let target = current.units.find(unit => unit.team === 'red' &&
          attackRange(current, active.id).some(point => point.x === unit.x && point.y === unit.y));
        if (!target) {
          const enemies = current.units.filter(unit => unit.team === 'red');
          const best = movementRange(current, active.id).sort((a, b) =>
            Math.min(...enemies.map(enemy => distance(a, enemy))) -
            Math.min(...enemies.map(enemy => distance(b, enemy))))[0];
          if (best) await tile(best.x, best.y);
          current = await state();
          target = current.units.find(unit => unit.team === 'red' &&
            attackRange(current, active.id).some(point => point.x === unit.x && point.y === unit.y));
        }
        if (target) await tile(target.x, target.y);
      }
      current = await state();
      if (current.winner) break;
      await page.getByRole('button', { name: /行動を終える/ }).click();
      await expect.poll(async () => { const result = await state(); return result.winner || (result.turn === 'blue' && !await page.evaluate(() => window.__GAME_TEST__!.isBusy())); }, { timeout: 15_000 }).toBeTruthy();
      if ((await state()).winner) break;
    }
    expect((await state()).winner).toBe('blue');
    await expect(page.getByRole('heading', { name: '戦いに勝利！' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('battle-victory.png'), fullPage: true });
    await page.getByRole('button', { name: /もう一度戦う/ }).click();
    expect((await state()).winner).toBeNull();
    expect((await state()).turnNumber).toBe(1);
    expect(errors, errors.join('\n')).toEqual([]);
  } finally {
    await testInfo.attach('browser-errors', { body: errors.join('\n') || '(none)', contentType: 'text/plain' });
    await testInfo.attach('game-state', { body: JSON.stringify(await state().catch(() => null), null, 2), contentType: 'application/json' });
  }
});

test('mobile layout and sound control remain usable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => Boolean(window.__GAME_TEST__))).toBe(true);
  await expect(page.locator('#phase-banner')).not.toHaveClass(/visible/);
  await expect(page.getByRole('button', { name: '♪ 音声 ON' })).toBeVisible();
  await page.getByRole('button', { name: '♪ 音声 ON' }).click();
  await expect(page.getByRole('button', { name: '♪ 音声 OFF' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('battle-mobile.png'), fullPage: true });
});
