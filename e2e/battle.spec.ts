import { expect, test, type Page } from '@playwright/test';
import { center, WIDTH, HEIGHT } from '../src/scene/board';
import { checkpointKey, encodeCheckpoint } from '../src/game/checkpoint';
import { combatForecast, initialState, type GameState } from '../src/game/rules';

async function tilePosition(page: Page, x: number, y: number): Promise<[number, number]> {
  const bounds = await page.locator('#game canvas').boundingBox();
  if (!bounds) throw new Error('Phaser canvas is missing');
  const position = center({ x, y });
  return [bounds.x + position.x * bounds.width / WIDTH, bounds.y + position.y * bounds.height / HEIGHT];
}

const titleMenu = (page: Page) => page.getByRole('dialog', { name: '蒼の境界' });
const newGame = (page: Page) => titleMenu(page).getByRole('button', { name: 'はじめから' });
const continueGame = (page: Page) => titleMenu(page).getByRole('button', { name: '続きから' });

async function reloadCampaign(page: Page): Promise<void> {
  await page.reload();
  await continueGame(page).click();
}

test('play the opening campaign from chapter one through the watchtower', async ({ page }, testInfo) => {
  test.setTimeout(210_000);
  const errors: string[] = [];
  const loadedArt = new Set<string>();
  page.on('response', response => {
    const url = new URL(response.url());
    if (response.ok() && url.pathname.endsWith('.webp')) loadedArt.add(url.pathname);
  });
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  const state = async (): Promise<GameState> => page.evaluate(() => window.__GAME_TEST__!.getState());
  const ready = async (): Promise<void> => {
    await expect.poll(() => page.evaluate(() => window.__GAME_TEST__!.isBusy())).toBe(false);
  };
  const waitForAttack = async (id: string): Promise<void> => {
    // The dialog closes before its close event starts the attack.
    await expect.poll(async () => {
      const attacker = (await state()).units.find(unit => unit.id === id);
      return !attacker || attacker.attacked;
    }).toBe(true);
    await ready();
  };
  const tile = async (x: number, y: number): Promise<void> => {
    await page.mouse.click(...await tilePosition(page, x, y));
    await ready();
  };
  try {
    await page.goto('./');
    await expect(continueGame(page)).toBeDisabled();
    await page.screenshot({ path: testInfo.outputPath('title-start.png') });
    await newGame(page).click();
    await expect.poll(async () => (await state()).turn).toBe('blue');
    await expect(page.locator('#phase-banner')).not.toHaveClass(/visible/);
    await expect.poll(() => Array.from(loadedArt).some(path => /pass[^/]*\.webp$/.test(path))).toBe(true);
    const endTurn = (await page.locator('#end-turn').boundingBox())!;
    expect(endTurn.y + endTurn.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await page.screenshot({ path: testInfo.outputPath('battle-start.png'), fullPage: true });
    await expect(page.locator('#field-hint')).toContainText('青い味方');
    await tile(1, 4);
    await expect(page.locator('#field-hint')).toContainText('青く光るマス');
    const portraitAsset = Array.from(loadedArt).find(path => /portraits[^/]*\.webp$/.test(path));
    expect(portraitAsset).toBeDefined();
    const portraitMatchesAtlas = await page.locator('#selected-portrait').evaluate(async (canvas, path) => {
      const atlas = new Image();
      atlas.src = path!;
      await atlas.decode();
      const expected = document.createElement('canvas');
      expected.width = expected.height = 64;
      expected.getContext('2d')!.drawImage(atlas, 64, 0, 64, 64, 0, 0, 64, 64);
      return atlas.naturalWidth === 320 && atlas.naturalHeight === 64 &&
        (canvas as HTMLCanvasElement).toDataURL() === expected.toDataURL();
    }, portraitAsset);
    expect(portraitMatchesAtlas).toBe(true);
    await page.mouse.move(...await tilePosition(page, 4, 4));
    await expect(page.locator('#tile-detail')).toContainText('移動 3マス');
    await expect(page.locator('#terrain-chip')).toContainText('道');
    await page.screenshot({ path: testInfo.outputPath('battle-route.png'), fullPage: true });
    const observedMotions = await page.locator('#combat-stage').evaluateHandle(stage => {
      const seen = new Map<string, Set<string>>();
      new MutationObserver(() => {
        const motion = stage.getAttribute('data-motion');
        if (stage.hasAttribute('hidden') || !motion) return;
        const side = stage.classList.contains('left') ? 'left' : 'right';
        const pose = stage.querySelector(`#stage-${side}`)?.getAttribute('data-pose');
        if (!pose) return;
        if (!seen.has(motion)) seen.set(motion, new Set());
        seen.get(motion)!.add(pose);
      }).observe(stage, { attributes: true, subtree: true, attributeFilter: ['class', 'data-pose'] });
      return seen;
    });
    let capturedImpact = false;
    let capturedBlade = false;
    // Open with Lina’s spell, finish the mage with Astel, then attack the raider from cover.
    const plan = [
      [{ id: 'blue-1', x: 4, y: 1 }, { id: 'blue-2', x: 4, y: 4, targetId: 'red-2' }],
      [{ id: 'blue-1', x: 5, y: 1, targetId: 'red-2' }, { id: 'blue-2', x: 4, y: 3 }],
      [{ id: 'blue-1', x: 6, y: 0, targetId: 'red-1' }],
    ];
    for (const round of plan) {
      for (const action of round) {
        const active = (await state()).units.find(unit => unit.id === action.id)!;
        await tile(active.x, active.y);
        await tile(action.x, action.y);
        const current = await state();
        expect(current.units.find(unit => unit.id === active.id)).toMatchObject({ x: action.x, y: action.y });
        if (!action.targetId) continue;
        const target = current.units.find(unit => unit.id === action.targetId)!;
        const forecast = combatForecast(current, active.id, target.id)!;
        const attackDialog = page.getByRole('dialog', { name: '戦闘予告' });
        await page.mouse.move(...await tilePosition(page, target.x, target.y));
        await expect(page.locator('#tile-detail')).toContainText(`与ダメージ ${forecast.opening.damage}`);
        await tile(target.x, target.y);
        await expect(attackDialog).toBeVisible();
        if (!capturedImpact) {
          await expect(attackDialog).toContainText(`敵HP ${target.hp} → ${forecast.opening.remainingHp}`);
          await expect(attackDialog).toContainText(forecast.counter ? `反撃 ${forecast.counter.damage}ダメージ` : '反撃なし');
          await page.screenshot({ path: testInfo.outputPath('battle-forecast.png'), fullPage: true });
          await attackDialog.getByRole('button', { name: '戻る' }).click();
          await expect(attackDialog).toBeHidden();
          expect(await state()).toEqual(current);
          await tile(target.x, target.y);
        }
        await attackDialog.getByRole('button', { name: '攻撃する' }).click();
        if (!capturedImpact) {
          await expect(page.locator('#stage-label')).toContainText(`−${forecast.opening.damage}`);
          await expect(page.locator('#game canvas')).toBeHidden();
          await expect(page.locator('#hud-right [role="meter"]')).toHaveAttribute('aria-valuenow', String(forecast.opening.remainingHp));
          const painted = await page.locator('#stage-left canvas').evaluate((canvas: HTMLCanvasElement) => {
            const rgba = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
            return {
              width: canvas.width,
              pixels: rgba.filter((value, index) => index % 4 === 3 && value > 0).length,
            };
          });
          expect(painted.width).toBe(64);
          expect(painted.pixels).toBeGreaterThan(300);
          await page.screenshot({ path: testInfo.outputPath('battle-impact.png'), fullPage: true });
          if (forecast.counter) await expect(page.locator('#stage-label')).toContainText(`反撃　−${forecast.counter.damage}`);
          capturedImpact = true;
        } else if (!capturedBlade && active.id === 'blue-1') {
          await expect(page.locator('#combat-stage')).toHaveClass(/blade impact/);
          await page.screenshot({ path: testInfo.outputPath('battle-blade.png'), fullPage: true });
          capturedBlade = true;
        }
        await waitForAttack(active.id);
        await expect(page.locator('#game canvas')).toBeVisible();
        const resolved = await state();
        if (!resolved.winner) await expect(page.locator('#game')).toBeFocused();
        expect(resolved.units.find(unit => unit.id === target.id)?.hp ?? 0).toBe(forecast.opening.remainingHp);
        if (forecast.counter) expect(resolved.units.find(unit => unit.id === active.id)?.hp ?? 0).toBe(forecast.counter.remainingHp);
      }
      if ((await state()).winner) break;
      await page.getByRole('button', { name: /行動を終える/ }).click();
      await expect.poll(async () => { const result = await state(); return result.winner || (result.turn === 'blue' && !await page.evaluate(() => window.__GAME_TEST__!.isBusy())); }, { timeout: 15_000 }).toBeTruthy();
      if ((await state()).winner) break;
    }
    const motions = await observedMotions.evaluate(seen =>
      Object.fromEntries([...seen].map(([motion, poses]) => [motion, [...poses]])));
    for (const motion of ['sword', 'axe', 'spell']) {
      expect(motions[motion]).toEqual(expect.arrayContaining(['windup', 'advance', 'release', 'strike', 'recover']));
    }
    await observedMotions.dispose();
    expect((await state()).winner).toBe('blue');
    await expect(page.getByRole('heading', { name: '戦いに勝利！' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('battle-victory.png'), fullPage: true });
    await reloadCampaign(page);
    const openFormation = page.getByRole('button', { name: /編成へ進む/ });
    const formationDialog = page.getByRole('dialog', { name: '出撃前の編成' });
    await expect(openFormation).toBeVisible();
    expect((await state()).winner).toBe('blue');
    await openFormation.click();
    await expect.poll(() => Array.from(loadedArt).some(path => /river[^/]*\.webp$/.test(path))).toBe(true);
    if (process.env.GITHUB_PAGES === 'true') {
      const base = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'tactical-rpg-starter';
      expect(Array.from(loadedArt).every(path => path.startsWith(`/${base}/assets/`))).toBe(true);
    }
    await formationDialog.getByRole('radio', { name: /灯守の盾/ }).check();
    await formationDialog.getByRole('radio', { name: /彗星の杖/ }).check();
    const vitality = formationDialog.getByRole('radio', { name: /アステルの体力訓練/ });
    await vitality.check();
    await expect(page.locator('#astel-preview')).toContainText('HP 11 → 13');
    await expect(page.locator('#lina-preview')).toContainText('攻撃 5 → 7');
    await page.screenshot({ path: testInfo.outputPath('formation.png'), fullPage: true });
    await formationDialog.getByRole('button', { name: '戦果に戻る' }).click();
    expect((await state()).chapterId).toBe(1);
    await reloadCampaign(page);
    await openFormation.click();
    await expect(vitality).toBeChecked();
    await expect(formationDialog.getByRole('radio', { name: /灯守の盾/ })).toBeChecked();
    await expect(formationDialog.getByRole('radio', { name: /彗星の杖/ })).toBeChecked();
    const desktopSize = page.viewportSize()!;
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileDialog = (await formationDialog.boundingBox())!;
    expect(mobileDialog.x).toBeGreaterThanOrEqual(0);
    expect(mobileDialog.x + mobileDialog.width).toBeLessThanOrEqual(390);
    await page.screenshot({ path: testInfo.outputPath('formation-mobile.png') });
    await page.setViewportSize(desktopSize);
    await formationDialog.getByRole('button', { name: /第2章に出撃する/ }).click();
    await expect(page.locator('#mission-objective')).toContainText('護衛');
    await expect(page.locator('#phase-banner')).not.toHaveClass(/visible/);
    expect((await state())).toMatchObject({ chapterId: 2, formation: { astel: 'shield', lina: 'comet', training: 'vitality' } });
    expect((await state()).units.find(unit => unit.id === 'blue-1')?.hp).toBe(13);
    await tile(1, 3);
    await expect(page.locator('#selected-equipment')).toContainText('灯守の盾');
    await expect(page.locator('#selected-stats')).toContainText('守備 4');
    await page.screenshot({ path: testInfo.outputPath('escort-start.png'), fullPage: true });

    const enemyPhase = async (): Promise<void> => {
      const previousTurn = (await state()).turnNumber;
      await page.locator('#end-turn').click();
      await expect.poll(async () => {
        const current = await state();
        return !await page.evaluate(() => window.__GAME_TEST__!.isBusy()) &&
          (current.winner !== null || current.turnNumber === previousTurn + 2);
      }, { timeout: 12_000 }).toBe(true);
    };

    for (let round = 0; round < 6 && !(await state()).winner; round++) await enemyPhase();
    await expect(page.getByRole('heading', { name: '護衛失敗' })).toBeVisible();
    const lost = await state();
    expect(lost.units.some(unit => unit.id === 'blue-escort')).toBe(false);
    expect(lost.units.some(unit => unit.team === 'blue')).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('escort-defeat.png'), fullPage: true });
    await page.getByRole('button', { name: /もう一度戦う/ }).click();
    expect(await state()).toMatchObject({ chapterId: 2, turnNumber: 1, winner: null });

    const order = async (id: string, x: number, y: number, targetId?: string): Promise<void> => {
      const unit = (await state()).units.find(item => item.id === id)!;
      await tile(unit.x, unit.y);
      if (unit.x !== x || unit.y !== y) await tile(x, y);
      expect((await state()).units.find(item => item.id === id)).toMatchObject({ x, y });
      if (!targetId) return;
      const target = (await state()).units.find(item => item.id === targetId)!;
      await tile(target.x, target.y);
      const attackDialog = page.getByRole('dialog', { name: '戦闘予告' });
      const chapterId = (await state()).chapterId;
      const cometDuel = chapterId === 2 && id === 'blue-2' && targetId === 'red-2';
      const shieldDuel = chapterId === 3 && id === 'blue-1' && targetId === 'red-1';
      if (cometDuel) {
        await expect(attackDialog).toContainText('攻撃 4ダメージ');
        await expect(attackDialog).toContainText('低木 −1');
        await page.screenshot({ path: testInfo.outputPath('formation-combat.png'), fullPage: true });
      }
      await attackDialog.getByRole('button', { name: '攻撃する' }).click();
      if (cometDuel || shieldDuel) {
        await expect(page.locator('#combat-stage')).toBeVisible();
        await expect(page.locator('#hud-left .duel-weapon')).toHaveText(cometDuel ? '彗星の杖' : '灯守の盾');
        const canvas = page.locator('#stage-left canvas');
        const color = cometDuel ? [220, 224, 255] : [57, 117, 105];
        expect(await canvas.evaluate((sprite: HTMLCanvasElement, [r, g, b]) => {
          const { data } = sprite.getContext('2d')!.getImageData(0, 0, sprite.width, sprite.height);
          return data.some((value, offset) =>
            offset % 4 === 0 && value === r && data[offset + 1] === g && data[offset + 2] === b && data[offset + 3] === 255);
        }, color)).toBe(true);
        if (cometDuel) await page.screenshot({ path: testInfo.outputPath('battle-comet.png'), fullPage: true });
      }
      await waitForAttack(id);
    };
    await order('blue-1', 2, 3);
    await order('blue-2', 4, 5);
    await order('blue-escort', 1, 3);
    const beforeReload = await state();
    await reloadCampaign(page);
    await expect(page.locator('#checkpoint-status')).toContainText('前回の続き');
    expect(await state()).toEqual(beforeReload);
    await expect(page.locator('#selected-stats')).toContainText('攻撃不可');
    await enemyPhase();

    await order('blue-1', 2, 4);
    await order('blue-2', 4, 5, 'red-2');
    await order('blue-escort', 3, 3);
    expect((await state()).winner).toBeNull();
    await enemyPhase();
    await order('blue-1', 4, 5, 'red-1');
    await order('blue-escort', 5, 3);
    await enemyPhase();
    await order('blue-escort', 7, 3);
    await expect(page.getByRole('heading', { name: '護衛成功！' })).toBeVisible();
    expect((await state()).winner).toBe('blue');
    await page.screenshot({ path: testInfo.outputPath('escort-victory.png'), fullPage: true });
    await reloadCampaign(page);
    await expect(page.getByRole('heading', { name: '護衛成功！' })).toBeVisible();
    await page.getByRole('button', { name: /第3章へ進む/ }).click();
    await expect(page.locator('#chapter-label')).toHaveText('第3章');
    await expect(page.locator('#hold-progress')).toHaveText('防衛 0 / 3');
    await expect(page.locator('#hold-status')).toHaveText('見張り台 · 無人');
    await expect(page.locator('#phase-banner')).not.toHaveClass(/visible/);
    expect((await state()).formation).toEqual(beforeReload.formation);
    await page.screenshot({ path: testInfo.outputPath('finale-start.png'), fullPage: true });
    await order('blue-1', 4, 2);
    await expect(page.locator('#hold-status')).toHaveText('見張り台 · アステル');
    await order('blue-2', 3, 4);
    await enemyPhase();
    await expect(page.locator('#hold-progress')).toHaveText('防衛 1 / 3');
    const held = await state();
    await reloadCampaign(page);
    await expect(page.locator('#hold-progress')).toHaveText('防衛 1 / 3');
    expect(await state()).toEqual(held);
    await order('blue-2', 3, 4, 'red-2');
    await order('blue-1', 4, 2, 'red-1');
    await enemyPhase();
    await expect(page.locator('#hold-progress')).toHaveText('防衛 2 / 3');
    expect((await state()).winner).toBeNull();
    await expect(page.locator('#phase-banner')).not.toHaveClass(/visible/);
    await page.screenshot({ path: testInfo.outputPath('finale-last-stand.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#hold-status')).toBeInViewport();
    await expect(page.locator('#hold-progress')).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('finale-mobile.png') });
    await page.setViewportSize(desktopSize);
    await order('blue-2', 3, 4, 'red-2');
    await enemyPhase();
    await expect(page.getByRole('heading', { name: '見張り台を守り抜いた！' })).toBeVisible();
    expect(await state()).toMatchObject({ chapterId: 3, holdTurns: 3, holdGoal: 3, winner: 'blue' });
    await reloadCampaign(page);
    await page.getByRole('button', { name: /第4章へ進む/ }).click();
    const interlude = page.getByRole('dialog', { name: '境界に灯がともる' });
    await expect(interlude).toContainText('第3章クリア');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(interlude.getByRole('button', { name: /第4章に出撃する/ })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('watchtower-interlude-mobile.png') });
    await interlude.getByRole('button', { name: '戦果に戻る' }).click();
    expect(await state()).toMatchObject({ chapterId: 3, winner: 'blue' });
    expect(errors, errors.join('\n')).toEqual([]);
  } finally {
    await testInfo.attach('browser-errors', { body: errors.join('\n') || '(none)', contentType: 'text/plain' });
    await testInfo.attach('game-state', { body: JSON.stringify(await state().catch(() => null), null, 2), contentType: 'application/json' });
  }
});

test('continue a legacy victory through the sluice and the new ending', async ({ page }, testInfo) => {
  test.setTimeout(160_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const legacy = initialState(3);
  legacy.units.find(unit => unit.id === 'blue-1')!.x = 4;
  legacy.holdTurns = 2;
  legacy.holdGoal = 2;
  legacy.turnNumber = 5;
  legacy.winner = 'blue';
  const v3 = { ...JSON.parse(encodeCheckpoint(legacy)), version: 3, holdGoal: undefined };
  await page.addInitScript(({ key, checkpoint }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, checkpoint);
  }, { key: checkpointKey, checkpoint: JSON.stringify(v3) });
  const state = () => page.evaluate(() => window.__GAME_TEST__!.getState());
  const board = page.locator('#game');
  let capturedCommander = false;
  const tile = async (x: number, y: number): Promise<void> => {
    await board.scrollIntoViewIfNeeded();
    await page.mouse.click(...await tilePosition(page, x, y));
  };
  const order = async (id: string, x: number, y: number, targetId?: string): Promise<void> => {
    const unit = (await state()).units.find(unit => unit.id === id)!;
    await tile(unit.x, unit.y);
    await expect.poll(async () => (await state()).selectedId).toBe(id);
    if (unit.x !== x || unit.y !== y) await tile(x, y);
    await expect.poll(async () => (await state()).units.find(unit => unit.id === id)).toMatchObject({ x, y });
    if (!targetId) return;
    const target = (await state()).units.find(unit => unit.id === targetId)!;
    await tile(target.x, target.y);
    await page.getByRole('button', { name: '攻撃する' }).click();
    if (targetId === 'red-4' && !capturedCommander) {
      await expect(page.locator('#combat-stage')).toBeVisible();
      await expect(page.locator('#duel-ground')).toHaveText('砦の石畳');
      await expect(page.locator('#hud-right strong')).toHaveText('サイラス');
      await page.screenshot({ path: testInfo.outputPath('fort-duel.png'), fullPage: true });
      capturedCommander = true;
    }
    await expect.poll(async () => {
      const attacker = (await state()).units.find(unit => unit.id === id);
      return !attacker || attacker.attacked;
    }).toBe(true);
    await expect.poll(() => page.evaluate(() => window.__GAME_TEST__!.isBusy())).toBe(false);
  };
  const end = async (): Promise<void> => {
    const turn = (await state()).turnNumber;
    await page.locator('#end-turn').click();
    await expect.poll(async () => (await state()).turnNumber, { timeout: 15_000 }).toBe(turn + 2);
    await expect.poll(() => page.evaluate(() => window.__GAME_TEST__!.isBusy())).toBe(false);
  };
  const [astel, lina, sera, io] = ['blue-1', 'blue-2', 'blue-3', 'blue-4'] as const;
  await page.goto('./');
  await continueGame(page).click();
  await expect(page.locator('#hold-progress')).toHaveText('防衛 2 / 2');
  await page.getByRole('button', { name: /第4章へ進む/ }).click();
  await expect(page.getByRole('dialog', { name: '境界に灯がともる' })).toContainText('セラ');
  await page.getByRole('button', { name: /第4章に出撃する/ }).click();
  await expect(page.locator('#chapter-label')).toHaveText('第4章');
  await expect(page.locator('#roster')).toContainText('セラ');
  await expect(page.locator('#roster')).toContainText('イオ');
  await expect(page.locator('#capture-progress')).toHaveText('確保 0 / 2');
  await expect(page.locator('#phase-banner')).not.toHaveClass(/visible/);
  await page.screenshot({ path: testInfo.outputPath('sluice-start.png'), fullPage: true });
  await order(astel, 2, 2);
  await order(io, 4, 1, 'red-1');
  await order(lina, 4, 4, 'red-3');
  await end();
  await order(io, 1, 1);
  await order(astel, 4, 1);
  await order(lina, 4, 4, 'red-3');
  await end();
  await order(astel, 5, 1, 'red-2');
  await order(lina, 6, 4);
  await expect(page.locator('#capture-progress')).toHaveText('確保 1 / 2');
  expect((await state()).winner).toBeNull();
  const partial = await state();
  await reloadCampaign(page);
  expect(await state()).toEqual(partial);
  await end();
  await order(astel, 6, 1);
  await expect(page.getByRole('heading', { name: '水門が開いた！' })).toBeVisible();
  expect((await state()).units.filter(unit => unit.team === 'blue')).toHaveLength(4);
  await page.getByRole('button', { name: /終章へ進む/ }).click();
  await expect(page.getByRole('dialog', { name: '流れが戻る朝' })).toContainText('サイラス');
  await page.getByRole('button', { name: /終章に出撃する/ }).click();
  await expect(page.locator('#chapter-label')).toHaveText('終章');
  await expect(page.locator('#mission-objective')).toHaveText('監潮官サイラスを倒す');
  expect((await state()).units).toHaveLength(8);
  await expect(page.locator('#phase-banner')).not.toHaveClass(/visible/);
  await page.screenshot({ path: testInfo.outputPath('fort-start.png'), fullPage: true });
  await order(astel, 2, 3);
  await order(io, 4, 1, 'red-1');
  await order(sera, 3, 3);
  await order(lina, 4, 4, 'red-2');
  await end();
  await order(astel, 3, 1);
  await order(io, 4, 1, 'red-4');
  await order(sera, 4, 3);
  await order(lina, 5, 4, 'red-2');
  await end();
  await order(io, 6, 0, 'red-3');
  await order(lina, 6, 2, 'red-3');
  await end();
  await order(astel, 5, 1, 'red-4');
  await order(io, 4, 1, 'red-4');
  await order(sera, 6, 4);
  await end();
  await order(astel, 5, 1, 'red-4');
  await order(io, 4, 1, 'red-4');
  await order(sera, 6, 2, 'red-4');
  await expect(page.getByRole('heading', { name: '観潮砦を奪還した！' })).toBeVisible();
  expect(await state()).toMatchObject({ chapterId: 5, winner: 'blue' });
  await reloadCampaign(page);
  await page.getByRole('button', { name: /結末を見る/ }).click();
  const ending = page.getByRole('dialog', { name: '水の先にある灯' });
  await expect(ending).toContainText('全5章クリア');
  await page.screenshot({ path: testInfo.outputPath('new-ending.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(ending.getByRole('button', { name: 'タイトルへ' })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('new-ending-mobile.png') });
  await ending.getByRole('button', { name: 'タイトルへ' }).click();
  await expect(titleMenu(page)).toContainText('全5章クリア');
  await continueGame(page).click();
  await expect(page.getByRole('button', { name: /結末を見る/ })).toBeFocused();
  await page.getByRole('button', { name: '第1章から遊ぶ' }).click();
  await titleMenu(page).getByRole('button', { name: '第1章から始める' }).click();
  expect(await state()).toMatchObject({ chapterId: 1, turnNumber: 1, winner: null });
});

test.describe('touch screen', () => {
  test.use({ hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('mobile layout and sound control remain usable', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      const start = OscillatorNode.prototype.start;
      document.documentElement?.setAttribute('data-synth-starts', '0');
      OscillatorNode.prototype.start = function (when?: number) {
        const root = document.documentElement;
        root.dataset.synthStarts = String(Number(root.dataset.synthStarts ?? 0) + 1);
        start.call(this, when);
      };
    });
    const assetPaths: string[] = [];
    page.on('response', response => {
      if (['script', 'stylesheet'].includes(response.request().resourceType()) && response.ok()) {
        assetPaths.push(new URL(response.url()).pathname);
      }
    });
    const response = await page.goto('./');
    expect(response?.ok()).toBe(true);
    if (process.env.GITHUB_PAGES === 'true') {
      const base = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'tactical-rpg-starter';
      expect(new URL(page.url()).pathname).toBe(`/${base}/`);
      expect(assetPaths).toHaveLength(2);
      expect(assetPaths.every(path => path.startsWith(`/${base}/assets/`))).toBe(true);
    }
    await expect.poll(() => page.evaluate(() => Boolean(window.__GAME_TEST__))).toBe(true);
    await expect(newGame(page)).toBeFocused();
    const titleSound = titleMenu(page).getByRole('button', { name: '音声' });
    const audioStarts = () => page.locator('html').getAttribute('data-synth-starts').then(Number);
    await expect(titleSound).toHaveAttribute('aria-pressed', 'true');
    await titleSound.tap();
    await expect(titleSound).toHaveAttribute('aria-pressed', 'false');
    await page.screenshot({ path: testInfo.outputPath('title-mobile.png') });
    await newGame(page).tap();
    await expect(page.locator('#phase-banner')).not.toHaveClass(/visible/);
    const scale = () => page.locator('#game canvas').evaluate((canvas: HTMLCanvasElement) => {
      const bounds = canvas.getBoundingClientRect();
      return { x: bounds.width / canvas.width, y: bounds.height / canvas.height };
    });
    await expect.poll(scale).toEqual({ x: 2, y: 2 });
    await page.touchscreen.tap(...await tilePosition(page, 1, 4));
    const getState = () => page.evaluate(() => window.__GAME_TEST__!.getState());
    await expect.poll(async () => (await getState()).selectedId).toBe('blue-2');
    const battleSound = page.locator('#sound-toggle');
    await expect(battleSound).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.touchscreen.tap(...await tilePosition(page, 2, 4));
    await expect.poll(async () => (await getState()).units[1].x).toBe(2);
    await expect(page.locator('#end-turn')).toBeEnabled();
    expect(await audioStarts()).toBe(0);
    const beforeReload = await getState();
    await page.reload();
    await expect(titleSound).toHaveAttribute('aria-pressed', 'false');
    await continueGame(page).tap();
    expect(await getState()).toEqual(beforeReload);
    await expect(battleSound).toHaveAttribute('aria-pressed', 'false');
    await battleSound.tap();
    await expect.poll(audioStarts).toBeGreaterThan(0);
    const setBackground = (hidden: boolean) => page.evaluate(hidden => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
    await setBackground(true);
    const backgroundStarts = await audioStarts();
    // Observe two soundtrack beats while backgrounded.
    await page.evaluate(() => new Promise(resolve => window.setTimeout(resolve, 600)));
    expect(await audioStarts()).toBe(backgroundStarts);
    await setBackground(false);
    await expect.poll(audioStarts).toBeGreaterThan(backgroundStarts);
    await page.locator('#return-title').tap();
    await expect(titleSound).toHaveAttribute('aria-pressed', 'true');
    await continueGame(page).tap();
    await page.screenshot({ path: testInfo.outputPath('battle-mobile.png'), fullPage: true });
    await page.locator('#restart').tap();
    await page.locator('#game').scrollIntoViewIfNeeded();
    await page.touchscreen.tap(...await tilePosition(page, 1, 4));
    await page.touchscreen.tap(...await tilePosition(page, 4, 4));
    await expect.poll(() => page.evaluate(() => window.__GAME_TEST__!.isBusy())).toBe(false);
    await expect(page.locator('#field-hint')).toContainText('橙の枠');
    await page.touchscreen.tap(...await tilePosition(page, 6, 4));
    const forecast = page.getByRole('dialog', { name: '戦闘予告' });
    await expect(forecast).toContainText('反撃');
    await forecast.getByRole('button', { name: '戻る' }).tap();
    await expect(forecast).toBeHidden();
    expect((await getState()).units[3].hp).toBe(7);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect.poll(scale).toEqual({ x: 2, y: 2 });
    await page.locator('#game').scrollIntoViewIfNeeded();
    await page.touchscreen.tap(...await tilePosition(page, 6, 4));
    await expect(forecast).toBeVisible();
    await forecast.getByRole('button', { name: '攻撃する' }).tap();
    const stage = page.locator('#combat-stage');
    await expect(stage).toBeInViewport();
    await expect(stage).toHaveAttribute('data-motion', 'spell');
    await expect(stage.locator('#stage-label')).toContainText('−3');
    await page.screenshot({ path: testInfo.outputPath('battle-landscape.png') });
    await expect.poll(async () => (await getState()).units[3].hp).toBe(4);
    expect((await getState()).units[1].hp).toBe(6);
    await page.setViewportSize({ width: 375, height: 812 });
    await expect.poll(scale).toEqual({ x: 2, y: 2 });
    await page.setViewportSize({ width: 320, height: 720 });
    await expect.poll(scale).toEqual({ x: 1, y: 1 });
    await page.setViewportSize({ width: 720, height: 320 });
    await expect.poll(scale).toEqual({ x: 1, y: 1 });
  });
});

test('map movement plays the walking cycle before returning to ready', async ({ page }) => {
  await page.goto('./');
  await newGame(page).click();
  await expect(page.locator('#phase-banner')).not.toHaveClass(/visible/);
  const apiFrame = () => page.evaluate(() => window.__GAME_TEST__!.getUnitFrame('blue-2'));
  await page.mouse.click(...await tilePosition(page, 1, 4));
  await expect.poll(apiFrame).toBe('blue-2-south-ready');

  const recording = await page.evaluateHandle(() => {
    const test = window.__GAME_TEST__!;
    return { frames: new Promise<string[]>(resolve => {
      const frames: string[] = [];
      const collect = (): void => {
        if (test.isBusy()) {
          const frame = test.getUnitFrame('blue-2');
          if (typeof frame === 'string' && frame !== frames.at(-1)) frames.push(frame);
        } else if (frames.length) {
          resolve(frames);
          return;
        }
        requestAnimationFrame(collect);
      };
      requestAnimationFrame(collect);
    }) };
  });
  await page.mouse.click(...await tilePosition(page, 4, 4));
  const frames = await recording.evaluate(sample => sample.frames);
  await recording.dispose();
  expect(frames.slice(0, 3)).toEqual(['blue-2-side-step-a', 'blue-2-side-pass', 'blue-2-side-step-b']);
  expect(frames.every(frame => !frame.endsWith('-ready'))).toBe(true);
  await expect.poll(apiFrame).toBe('blue-2-side-ready');
  expect(await page.evaluate(() => window.__GAME_TEST__!.getState().units[1])).toMatchObject({ x: 4, y: 4, moved: true });
});

test('reduced motion keeps both hits and HP readable', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await newGame(page).click();
  await expect(page.locator('#phase-banner')).not.toHaveClass(/visible/);
  const getState = () => page.evaluate(() => window.__GAME_TEST__!.getState());
  await page.mouse.click(...await tilePosition(page, 1, 4));
  await expect.poll(async () => (await getState()).selectedId).toBe('blue-2');
  await page.mouse.click(...await tilePosition(page, 4, 4));
  await expect(page.locator('#end-turn')).toBeEnabled();
  expect(await page.evaluate(() => window.__GAME_TEST__!.getUnitFrame('blue-2'))).toBe('blue-2-side-ready');
  await page.mouse.click(...await tilePosition(page, 6, 4));
  const forecast = page.getByRole('dialog', { name: '戦闘予告' });
  await forecast.getByRole('button', { name: '攻撃する' }).click();
  const stage = page.locator('#combat-stage');
  const label = stage.locator('#stage-label');
  await expect(label).toHaveText('先制攻撃　−3');
  await expect(stage).toHaveCSS('animation-name', 'none');
  await expect(stage.locator('#stage-left canvas')).toHaveCSS('animation-name', 'none');
  await expect(stage.locator('#hud-right [role="meter"]')).toHaveAttribute('aria-valuenow', '4');
  await expect(page.locator('#game canvas')).toBeHidden();
  await expect(label).toHaveText('反撃　−3');
  await expect(stage.locator('#hud-left [role="meter"]')).toHaveAttribute('aria-valuenow', '6');
  await page.screenshot({ path: testInfo.outputPath('battle-reduced-motion.png') });
  await expect(stage).toBeHidden();
  await expect(page.locator('#game canvas')).toBeVisible();
  const state = await getState();
  expect(state.units.find(unit => unit.id === 'blue-2')).toMatchObject({ hp: 6, x: 4, y: 4, attacked: true });
  expect(state.units.find(unit => unit.id === 'red-2')?.hp).toBe(4);
});

test('title screen restores a saved move and protects it from a cancelled restart', async ({ page }) => {
  const getState = () => page.evaluate(() => window.__GAME_TEST__!.getState());
  await page.goto('./');
  const board = page.locator('#game');
  await expect(continueGame(page)).toBeDisabled();
  await expect(newGame(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(board).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await getState()).selectedId).toBe('blue-1');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tile-detail')).toContainText('移動 1マス');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await getState()).units[0].x).toBe(2);
  await expect(page.locator('#end-turn')).toBeEnabled();
  const beforeTitle = await getState();
  await page.getByRole('button', { name: 'タイトルへ' }).click();
  await expect(continueGame(page)).toBeFocused();
  await newGame(page).click();
  await expect(titleMenu(page).getByRole('button', { name: '戻る' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(newGame(page)).toBeFocused();
  await reloadCampaign(page);
  await expect(board).toBeFocused();
  expect(await getState()).toEqual(beforeTitle);
});

test('waiting through enemy turns leads to defeat', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const getState = () => page.evaluate(() => window.__GAME_TEST__!.getState());
  await page.goto('./');
  await newGame(page).click();
  await expect(page.locator('#end-turn')).toBeEnabled();
  for (let round = 1; round <= 9; round++) {
    await page.locator('#end-turn').click();
    if (round === 1) await expect(page.locator('#phase-banner')).toContainText('敵フェイズ');
    await expect.poll(async () => {
      const state = await getState();
      const busy = await page.evaluate(() => window.__GAME_TEST__!.isBusy());
      return !busy && (state.winner !== null || (state.turn === 'blue' && state.turnNumber > round * 2));
    }, { timeout: 10_000 }).toBe(true);
    if ((await getState()).winner) break;
  }
  const final = await getState();
  expect(final.winner).toBe('red');
  expect(final.units.every(unit => unit.team === 'red')).toBe(true);
  await expect(page.getByRole('heading', { name: '部隊は敗走した' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('battle-defeat.png'), fullPage: true });
  await page.setViewportSize({ width: 320, height: 720 });
  const frame = await page.locator('.battle-frame').boundingBox();
  const card = await page.locator('.outcome-card').boundingBox();
  expect(frame && card && card.y >= frame.y && card.y + card.height <= frame.y + frame.height).toBe(true);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await getState()).turnNumber).toBe(1);
  expect((await getState()).units).toHaveLength(4);
  await expect(page.locator('#game')).toBeFocused();
});
