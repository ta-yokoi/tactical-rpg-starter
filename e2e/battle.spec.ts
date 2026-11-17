import { expect, test } from '@playwright/test';
import type { GameState } from '../src/game/rules';

test('select, move, and advance the turn in the browser', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  const state = async (): Promise<GameState> => page.evaluate(() => window.__GAME_TEST__!.getState());
  const tile = async (x: number, y: number): Promise<void> => {
    const canvas = page.locator('#game canvas');
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('Phaser canvas is missing');
    await page.mouse.click(bounds.x + (20 + x * 72 + 36) * bounds.width / 616,
      bounds.y + (20 + y * 72 + 36) * bounds.height / 472);
  };
  try {
    await page.goto('/');
    await expect.poll(async () => (await state()).turn).toBe('blue');
    await tile(1, 1);
    await expect.poll(async () => (await state()).selectedId).toBe('blue-1');
    await tile(2, 1);
    await expect.poll(async () => (await state()).units.find(unit => unit.id === 'blue-1')?.x).toBe(2);
    await page.getByRole('button', { name: /ターン終了/ }).click();
    await expect.poll(async () => (await state()).turn).toBe('red');
    await tile(6, 1);
    await expect.poll(async () => (await state()).selectedId).toBe('red-1');
    await tile(5, 1);
    await expect.poll(async () => (await state()).units.find(unit => unit.id === 'red-1')?.x).toBe(5);
    await page.getByRole('button', { name: /ターン終了/ }).click();
    await tile(2, 1);
    await tile(4, 1);
    await tile(5, 1);
    await expect.poll(async () => (await state()).units.find(unit => unit.id === 'red-1')?.hp).toBe(2);
    await page.screenshot({ path: testInfo.outputPath('battle.png'), fullPage: true });
    expect(errors, errors.join('\n')).toEqual([]);
  } finally {
    await testInfo.attach('browser-errors', { body: errors.join('\n') || '(none)', contentType: 'text/plain' });
    await testInfo.attach('game-state', { body: JSON.stringify(await state().catch(() => null), null, 2), contentType: 'application/json' });
  }
});
