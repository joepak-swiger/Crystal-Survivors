/// <reference types="vite/client" />
import { Application, Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { GameSimulation } from './game/simulation';
import { ARENA_RADIUS } from './game/model';
import { CLOUD } from './game/content';
import './style.css';

async function main(): Promise<void> {
const root = document.querySelector<HTMLDivElement>('#game')!;
const sim = new GameSimulation({ survivalSeconds: 180 });
// The test surface is stripped from production builds; browser checks can stage late-run UI without fake screenshots.
if (import.meta.env.DEV) Object.defineProperty(window, '__crystalSurvivorsTest', { value: sim });
sim.setViewport(root.clientWidth, root.clientHeight);
const app = new Application();
await app.init({ resizeTo: root, background: '#101a1c', antialias: false, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
root.prepend(app.canvas);
app.canvas.setAttribute('aria-label', 'Crystal Survivors arena');
app.canvas.style.imageRendering = 'pixelated';

const world = new Container();
const floor = new Graphics();
const actors = new Graphics();
const fx = new Graphics();
const cloud = new Sprite(Texture.EMPTY);
cloud.anchor.set(0.5, 0.82);
cloud.roundPixels = true;
cloud.scale.set(1.12);
world.addChild(floor, actors, fx, cloud);
app.stage.addChild(world);

const ui = document.createElement('div');
ui.className = 'interface';
ui.innerHTML = `
  <div class="hud" id="hud" hidden>
    <div class="brand">CRYSTAL <span>SURVIVORS</span></div>
    <div class="hud-stats"><div><small>VITALITY</small><div class="bar"><i id="hp"></i></div><b id="hpText">100 / 100</b></div>
      <div><small>EXPERIENCE <span id="level">LV 1</span></small><div class="bar xp"><i id="xp"></i></div><b id="xpText">0 / 6</b></div></div>
    <div class="run-stats"><span id="clock">00:00</span><span>☠ <b id="kills">0</b></span><span>FOES <b id="foes">0</b></span><span class="ability">BUSTER SWORD</span><button class="pause-button" id="pause">Ⅱ</button></div>
  </div>
  <div class="modal" id="modal"></div>
  <div class="toast" id="toast">WASD / ARROWS TO MOVE <span>·</span> ESC TO PAUSE</div>`;
root.appendChild(ui);
const hud = ui.querySelector<HTMLDivElement>('#hud')!;
const modal = ui.querySelector<HTMLDivElement>('#modal')!;
const toast = ui.querySelector<HTMLDivElement>('#toast')!;

const keys = new Set<string>();
const keymap: Record<string, string> = { ArrowUp: 'w', ArrowDown: 's', ArrowLeft: 'a', ArrowRight: 'd' };
window.addEventListener('keydown', (event) => {
  const key = keymap[event.key] ?? event.key.toLowerCase();
  if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'escape'].includes(key)) event.preventDefault();
  keys.add(key);
  if (event.repeat) return;
  if (key === 'escape' || key === 'p') sim.togglePause();
  if (sim.phase === 'title' && (key === 'enter' || key === ' ')) beginRun();
  if ((sim.phase === 'victory' || sim.phase === 'defeat') && (key === 'enter' || key === ' ')) beginRun();
  if (sim.phase === 'levelup' && ['1', '2', '3'].includes(key)) sim.selectUpgrade(Number(key) - 1);
});
window.addEventListener('keyup', (event) => keys.delete(keymap[event.key] ?? event.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
ui.querySelector('#pause')!.addEventListener('click', () => sim.togglePause());

function beginRun(): void { sim.start(); toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 4200); }
function selectUpgrade(index: number): void { sim.selectUpgrade(index); }

const directionRows = CLOUD.animation.rows;
let animationTime = 0;
let cachedPhase = '';
let atlas: Texture | undefined;
let cloudFrames: Texture[] = [];
try {
  atlas = await Assets.load<Texture>('/assets/cloud-walk-placeholder.png');
  cloudFrames = Array.from({ length: directionRows * CLOUD.animation.framesPerDirection }, (_, index) => new Texture({ source: atlas!.source,
    frame: new Rectangle((index % CLOUD.animation.framesPerDirection) * CLOUD.animation.frameWidth,
      Math.floor(index / CLOUD.animation.framesPerDirection) * CLOUD.animation.frameHeight,
      CLOUD.animation.frameWidth, CLOUD.animation.frameHeight) }));
  cloud.texture = cloudFrames[0]!;
} catch (error) { console.warn('Cloud placeholder atlas unavailable; using a geometric hero.', error); }

function screenPoint(x: number, y: number): { x: number; y: number } {
  return { x: app.screen.width / 2 + x - sim.player.x, y: app.screen.height / 2 + y - sim.player.y };
}
function drawFloor(): void {
  floor.clear();
  const tile = 72;
  const cameraX = sim.player.x, cameraY = sim.player.y;
  const left = Math.floor((cameraX - app.screen.width / 2) / tile) * tile;
  const top = Math.floor((cameraY - app.screen.height / 2) / tile) * tile;
  for (let x = left; x < cameraX + app.screen.width / 2 + tile; x += tile) for (let y = top; y < cameraY + app.screen.height / 2 + tile; y += tile) {
    const p = screenPoint(x, y);
    const variant = (Math.floor(x / tile) * 17 + Math.floor(y / tile) * 31) & 3;
    floor.rect(p.x, p.y, tile + 1, tile + 1).fill(['#344e3e', '#375342', '#3a5543', '#324b3d'][variant]!);
    if (((Math.floor(x / tile) + Math.floor(y / tile) * 3) & 7) === 0) {
      floor.circle(p.x + 16 + variant * 5, p.y + 18 + variant * 3, 2).fill({ color: '#8a9861', alpha: 0.35 });
      floor.circle(p.x + 49, p.y + 53, 1.5).fill({ color: '#c1a36d', alpha: 0.28 });
    }
  }
  const edge = screenPoint(0, 0);
  floor.circle(edge.x, edge.y, ARENA_RADIUS).stroke({ color: '#ceb979', width: 8, alpha: 0.9 });
  floor.circle(edge.x, edge.y, ARENA_RADIUS - 8).stroke({ color: '#1d2e27', width: 5, alpha: 0.9 });
}

function drawActors(): void {
  actors.clear();
  const p = screenPoint(sim.player.x, sim.player.y);
  for (const gem of sim.gems) {
    const q = screenPoint(gem.x, gem.y);
    actors.circle(q.x, q.y, 12).fill({ color: '#44dbf2', alpha: 0.16 });
    actors.poly([q.x, q.y - 8, q.x + 7, q.y, q.x, q.y + 8, q.x - 7, q.y]).fill('#85f4ff').stroke({ color: '#e8ffff', width: 2 });
  }
  for (const enemy of sim.enemies) {
    const q = screenPoint(enemy.x, enemy.y);
    const bomb = enemy.kind === 'bomb';
    const color = bomb ? '#ef744f' : '#7dc55b';
    const radius = enemy.radius;
    actors.ellipse(q.x, q.y + 12, radius * 1.1, radius * 0.55).fill({ color: '#111615', alpha: 0.5 });
    actors.circle(q.x, q.y, radius + 3).fill({ color: bomb ? '#66352f' : '#43563b' });
    actors.circle(q.x, q.y - 2, radius).fill(color).stroke({ color: bomb ? '#ffc579' : '#d1ee83', width: 2 });
    actors.circle(q.x - 5, q.y - 5, 3).fill('#fff3bf'); actors.circle(q.x + 5, q.y - 5, 3).fill('#fff3bf');
    actors.circle(q.x - 5, q.y - 5, 1.4).fill('#452d2a'); actors.circle(q.x + 5, q.y - 5, 1.4).fill('#452d2a');
    if (enemy.kind === 'bomb' && enemy.fuse > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(animationTime * 18);
      actors.circle(q.x, q.y, 30 + pulse * 9).stroke({ color: '#ffb45b', width: 3, alpha: 0.45 + pulse * 0.45 });
      actors.circle(q.x, q.y - radius - 9, 3).fill('#ffe8a0');
    }
    const width = 42;
    actors.roundRect(q.x - width / 2, q.y - radius - 11, width, 4, 2).fill('#17201d');
    actors.roundRect(q.x - width / 2, q.y - radius - 11, width * Math.max(0, enemy.hp / enemy.maxHp), 4, 2).fill(bomb ? '#ff9c5c' : '#b4e66b');
  }
  // A golden ring under Cloud anchors the eye while the camera follows him.
  actors.ellipse(p.x, p.y + 10, 21, 10).fill({ color: '#101513', alpha: 0.5 });
  actors.ellipse(p.x, p.y + 7, 22, 10).stroke({ color: '#ffd878', width: 2, alpha: 0.75 });
}

function drawEffects(): void {
  fx.clear();
  for (const beam of sim.beams) {
    const q = screenPoint(beam.x, beam.y), angle = Math.atan2(beam.vy, beam.vx);
    fx.moveTo(q.x - Math.cos(angle) * 22, q.y - Math.sin(angle) * 22)
      .lineTo(q.x + Math.cos(angle) * 22, q.y + Math.sin(angle) * 22)
      .stroke({ color: '#8cf6ff', width: 9, alpha: 0.35 });
    fx.moveTo(q.x - Math.cos(angle) * 19, q.y - Math.sin(angle) * 19)
      .lineTo(q.x + Math.cos(angle) * 19, q.y + Math.sin(angle) * 19)
      .stroke({ color: '#e9ffff', width: 4 });
  }
  for (const effect of sim.effects) {
    const q = screenPoint(effect.x, effect.y), t = effect.life / effect.maxLife;
    if (effect.kind === 'slash') {
      const spread = 1.18 * (1 - t * 0.24), radius = 73 + (1 - t) * 15;
      fx.arc(q.x, q.y, radius, effect.angle - spread, effect.angle + spread)
        .stroke({ color: '#fff3a4', width: 10 * t + 2, alpha: Math.min(1, t + 0.18) });
      fx.arc(q.x, q.y, radius - 8, effect.angle - spread * 0.82, effect.angle + spread * 0.82)
        .stroke({ color: '#80f7ff', width: 3, alpha: t });
    } else if (effect.kind === 'blast') {
      fx.circle(q.x, q.y, 152 * (1 - t * 0.5)).stroke({ color: '#ffb15d', width: 8, alpha: t });
      fx.circle(q.x, q.y, 92 * (1 - t * 0.4)).fill({ color: '#ffd280', alpha: 0.13 * t });
    } else {
      fx.circle(q.x, q.y, 10 * (1 - t * 0.4)).fill({ color: '#fff3c1', alpha: t });
    }
  }
}

function updateHud(): void {
  const p = sim.player;
  hud.hidden = sim.phase === 'title';
  ui.querySelector('#hp')!.setAttribute('style', `width:${Math.max(0, p.hp / p.maxHp * 100)}%`);
  ui.querySelector('#hpText')!.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  ui.querySelector('#xp')!.setAttribute('style', `width:${p.xp / p.xpNext * 100}%`);
  ui.querySelector('#xpText')!.textContent = `${p.xp} / ${p.xpNext}`;
  ui.querySelector('#level')!.textContent = `LV ${p.level}`;
  ui.querySelector('#kills')!.textContent = `${p.kills}`;
  ui.querySelector('#foes')!.textContent = `${sim.enemies.filter((enemy) => enemy.hp > 0).length}`;
  const seconds = Math.floor(sim.elapsed);
  ui.querySelector('#clock')!.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const phase = sim.phase;
  if (phase === cachedPhase) return;
  cachedPhase = phase;
  modal.replaceChildren();
  modal.className = phase === 'title' || phase === 'levelup' || phase === 'paused' || phase === 'victory' || phase === 'defeat' ? 'modal visible' : 'modal';
  if (phase === 'title') {
    modal.innerHTML = `<section class="panel title-panel"><div class="eyebrow">A PIXEL FANTASY SURVIVAL</div><h1>CRYSTAL<br><em>SURVIVORS</em></h1><p>One SOLDIER. One sword. An army in the dark.</p><div class="hero-chip">✦ &nbsp; CLOUD STRIFE &nbsp;·&nbsp; BUSTER SWORD</div><button class="primary" id="start">BEGIN YOUR RUN <span>↗</span></button><small>WASD / ARROWS TO MOVE · ATTACKS ARE AUTOMATIC</small></section>`;
    modal.querySelector('#start')!.addEventListener('click', beginRun);
  } else if (phase === 'paused') {
    modal.innerHTML = `<section class="panel compact"><div class="eyebrow">THE BATTLE WAITS</div><h2>PAUSED</h2><button class="primary" id="resume">RESUME <span>Ⅱ</span></button><small>PRESS ESC OR P TO CONTINUE</small></section>`;
    modal.querySelector('#resume')!.addEventListener('click', () => sim.togglePause());
  } else if (phase === 'levelup') {
    modal.innerHTML = `<section class="panel level-panel"><div class="eyebrow">MATERIA RESONANCE · LEVEL ${p.level}</div><h2>Choose your path</h2><p>Choose one blessing to carry into battle.</p><div class="cards">${sim.upgrades.map((u, i) => `<button class="upgrade-card" data-index="${i}"><span class="card-index">0${i + 1}</span><span class="card-glyph">${['✦', '⚔', '♥', '➤', '◈', '➳'][['damage','haste','vitality','swift','magnet','blade-beam'].indexOf(u.id)]}</span><b>${u.title}</b><small>${u.detail}</small><kbd>${i + 1}</kbd></button>`).join('')}</div><small>CLICK A CARD OR PRESS 1, 2, 3</small></section>`;
    modal.querySelectorAll<HTMLButtonElement>('.upgrade-card').forEach((button) => button.addEventListener('click', () => selectUpgrade(Number(button.dataset.index))));
  } else if (phase === 'victory' || phase === 'defeat') {
    const win = phase === 'victory';
    modal.innerHTML = `<section class="panel compact"><div class="eyebrow">${win ? 'A LEGEND ENDURES' : 'THE CRYSTAL FADES'}</div><h2>${win ? 'VICTORY' : 'GAME OVER'}</h2><p>${win ? 'You survived the onslaught.' : 'The horde claimed this battlefield.'}</p><div class="summary"><span>SURVIVED <b>${formatTime(sim.elapsed)}</b></span><span>FOES DEFEATED <b>${p.kills}</b></span><span>LEVEL REACHED <b>${p.level}</b></span></div><button class="primary" id="restart">FIGHT AGAIN <span>↻</span></button><small>PRESS ENTER OR SPACE TO RESTART</small></section>`;
    modal.querySelector('#restart')!.addEventListener('click', beginRun);
  }
}
function formatTime(seconds: number): string {
  const whole = Math.floor(seconds); return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

app.ticker.add((ticker) => {
  const dt = Math.min(ticker.deltaMS / 1000, 0.05);
  animationTime += dt;
  sim.setMoveInput({ x: Number(keys.has('d')) - Number(keys.has('a')), y: Number(keys.has('s')) - Number(keys.has('w')) });
  // Optional left stick and D-pad support for standard Gamepad API layouts.
  const pad = navigator.getGamepads?.().find((candidate) => candidate?.connected);
  if (pad) {
    const x = Math.abs(pad.axes[0] ?? 0) > 0.18 ? pad.axes[0]! : Number(Boolean(pad.buttons[15]?.pressed)) - Number(Boolean(pad.buttons[14]?.pressed));
    const y = Math.abs(pad.axes[1] ?? 0) > 0.18 ? pad.axes[1]! : Number(Boolean(pad.buttons[13]?.pressed)) - Number(Boolean(pad.buttons[12]?.pressed));
    if (Math.abs(x) + Math.abs(y) > 0) sim.setMoveInput({ x, y });
    if (pad.buttons[0]?.pressed && (sim.phase === 'title' || sim.phase === 'victory' || sim.phase === 'defeat')) beginRun();
  }
  sim.tick(dt);
  drawFloor(); drawActors(); drawEffects();
  if (atlas) {
    const moving = Math.hypot(sim.player.facing.x, sim.player.facing.y) > 0;
    const angle = Math.atan2(sim.player.facing.y, sim.player.facing.x);
    const row = ((Math.round(angle / (Math.PI / 4)) + 14) % directionRows);
    const frame = moving ? Math.floor(animationTime * 8) % CLOUD.animation.framesPerDirection : 0;
    cloud.texture = cloudFrames[row * 4 + frame]!;
    cloud.visible = sim.phase !== 'title';
    cloud.x = app.screen.width / 2;
    cloud.y = app.screen.height / 2 + 6;
    cloud.alpha = sim.player.invulnerable > 0 && Math.floor(animationTime * 18) % 2 === 0 ? 0.48 : 1;
  } else cloud.visible = false;
  updateHud();
});

window.addEventListener('resize', () => {
  app.renderer.resize(root.clientWidth, root.clientHeight);
  sim.setViewport(root.clientWidth, root.clientHeight);
});
}

void main();
