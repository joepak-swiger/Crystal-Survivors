import { expect, test } from '@playwright/test';

test('loads, starts, moves, pauses, restarts, and exposes the run HUD', async ({ page }) => {
  test.setTimeout(60_000);
  const fatal: string[] = [];
  page.on('pageerror', (error) => fatal.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') fatal.push(message.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /crystal survivors/i })).toBeVisible();
  await page.getByRole('button', { name: /begin your run/i }).click();
  await expect(page.locator('#hud')).toBeVisible();
  const beforeX = await page.evaluate(() => (window as any).__crystalSurvivorsTest.player.x as number);
  await page.keyboard.down('d'); await page.waitForTimeout(400); await page.keyboard.up('d');
  const afterX = await page.evaluate(() => (window as any).__crystalSurvivorsTest.player.x as number);
  expect(afterX).toBeGreaterThan(beforeX);
  await expect(page.locator('#foes')).not.toHaveText('0', { timeout: 25_000 });
  await page.evaluate(() => {
    const game = (window as any).__crystalSurvivorsTest;
    game.enemies.push({ x: game.player.x + 66, y: game.player.y, id: 9000, kind: 'goblin', hp: 1, maxHp: 1,
      speed: 0, damage: 0, radius: 16, contactTimer: 0, fuse: 0 });
  });
  await expect(page.locator('#kills')).not.toHaveText('0', { timeout: 25_000 });
  await page.keyboard.press('Escape'); await expect(page.getByRole('heading', { name: 'PAUSED' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'artifacts/active-combat.png' });

  await page.evaluate(() => {
    const game = (window as any).__crystalSurvivorsTest;
    game.player.xp = game.player.xpNext - 1;
    game.gems.push({ x: game.player.x, y: game.player.y, value: 1, id: 9001 });
  });
  await expect(page.getByRole('heading', { name: 'Choose your path' })).toBeVisible();
  await page.waitForTimeout(240);
  await page.screenshot({ path: 'artifacts/upgrade-selection.png' });
  await page.keyboard.press('1');
  await expect(page.getByRole('heading', { name: 'Choose your path' })).toBeHidden();

  await page.evaluate(() => {
    const game = (window as any).__crystalSurvivorsTest;
    game.player.hp = 1; game.player.invulnerable = 0;
    game.enemies.push({ x: game.player.x + 5, y: game.player.y, id: 9002, kind: 'goblin', hp: 1000, maxHp: 1000,
      speed: 0, damage: 10, radius: 16, contactTimer: 0, fuse: 0 });
  });
  await expect(page.getByRole('heading', { name: 'GAME OVER' })).toBeVisible();
  await page.waitForTimeout(240);
  await page.screenshot({ path: 'artifacts/game-over.png' });
  await page.getByRole('button', { name: /fight again/i }).click();
  await expect(page.locator('#hpText')).toHaveText('100 / 100');

  await page.evaluate(() => {
    const game = (window as any).__crystalSurvivorsTest;
    game.elapsed = game.config.survivalSeconds - 0.03;
  });
  await expect(page.getByRole('heading', { name: 'VICTORY' })).toBeVisible();
  await page.waitForTimeout(240);
  await page.screenshot({ path: 'artifacts/victory.png' });
  await page.getByRole('button', { name: /fight again/i }).click();
  await expect(page.locator('#hpText')).toHaveText('100 / 100');
  expect(fatal).toEqual([]);
});
