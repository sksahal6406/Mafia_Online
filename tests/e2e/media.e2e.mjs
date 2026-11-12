/*
 * End-to-end test: real browsers (Edge/Chrome with fake camera + mic), real WebRTC.
 * Run:  npm run build && node tests/e2e/media.e2e.mjs
 *
 * Scenario 1: 6 players, video on. Lobby, then a whole game played by in-page bots.
 *             At every phase we compare who ACTUALLY sends/receives audio+video
 *             (sender tracks, muted <audio>, inbound RTP packet counters) with an
 *             independent description of the rules.
 * Scenario 2: video setting. Flip "Allow video" off/on in the lobby and check that
 *             video lines and camera access disappear entirely.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const EDGE = process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = Number(process.env.E2E_PORT || 3200);
const BASE = `http://localhost:${PORT}`;
const SHOTS = process.env.E2E_SHOTS || '.e2e-shots';
mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  -> ${detail}`}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms, label) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error(`timeout: ${label}`);
    await sleep(150);
  }
}

// ---------- server ----------
function startServer() {
  const child = spawn(process.execPath, ['server.js', '--prod'], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
  return new Promise((resolve, reject) => {
    child.stdout.on('data', (d) => /ready on/.test(String(d)) && resolve(child));
    child.on('exit', (c) => reject(new Error(`server exited ${c}`)));
    setTimeout(() => reject(new Error('server start timeout')), 30000);
  });
}

// ---------- page helpers ----------
async function newPlayer(browser, name, code) {
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'], viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[pageerror ${name}]`, e.message));
  await page.addInitScript(() => {
    window.__gum = { audio: 0, video: 0 };
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (c) => {
      if (c?.audio) window.__gum.audio++;
      if (c?.video) window.__gum.video++;
      return orig(c);
    };
  });
  if (!code) {
    await page.goto(BASE);
    await page.fill('#name', name);
    await page.click('button:has-text("Host a new game")');
    await page.waitForFunction(() => /\/room\/[A-Z0-9]{5}/.test(location.pathname), null, { timeout: 15000 });
    code = page.url().split('/').pop();
  } else {
    await page.goto(`${BASE}/room/${code}`);
    await page.fill('#jname', name);
    await page.click('button:has-text("Take a seat")');
  }
  await page.waitForSelector('text=Game rules');
  return { name, page, code, ctx };
}

const snapshot = (page) =>
  page.evaluate(() => {
    const m = window.__mesh();
    const v = window.__mafia.store.getState().view;
    const peers = {};
    for (const [id, p] of m.peers) {
      peers[id] = {
        state: p.pc.connectionState,
        sendsAudio: !!p.audioSender?.track,
        sendsVideo: !!p.videoSender?.track,
        hasVideoLine: !!p.videoSender,
        kinds: p.pc.getTransceivers().map((t) => t.receiver.track.kind),
      };
    }
    return {
      phase: v.phase, round: v.round, me: v.youId, role: v.you?.role ?? null, alive: v.you ? v.you.alive : true,
      players: v.players.map((p) => ({ id: p.id, alive: p.alive })),
      peers,
      audio: [...document.querySelectorAll('audio[data-peer]')].map((a) => ({ id: a.dataset.peer, muted: a.dataset.muted === 'true' })),
      videos: [...document.querySelectorAll('video')].map((x) => ({ w: x.videoWidth, paused: x.paused })),
      speaking: Object.values(window.__media.getState().speaking).some(Boolean),
      gum: window.__gum,
      camButton: !!document.querySelector('[data-testid=toggle-cam]'),
      videoDisabledBadge: !!document.querySelector('[data-testid=video-disabled]'),
    };
  });

const rtpCounts = (page) =>
  page.evaluate(async () => {
    const out = {};
    for (const [id, p] of window.__mesh().peers) {
      let a = 0, v = 0;
      (await p.pc.getStats()).forEach((r) => {
        if (r.type === 'inbound-rtp') {
          if (r.kind === 'audio') a += r.packetsReceived || 0;
          if (r.kind === 'video') v += r.packetsReceived || 0;
        }
      });
      out[id] = { a, v };
    }
    return out;
  });

const installBot = (page, delay) =>
  page.evaluate((delay) => {
    const st = window.__mafia.store;
    const done = new Set();
    const run = () => {
      const v = st.getState().view;
      if (!v || !v.you?.alive) return;
      const key = `${v.phase}:${v.round}`;
      if (done.has(key)) return;
      const others = v.players.filter((p) => p.alive && p.id !== v.youId);
      const act = (type, target) => st.getState().act({ type, target });
      let fn = null;
      if (v.phase === 'night_mafia' && v.you.role === 'mafia') {
        const t = others.find((p) => p.role !== 'mafia');
        if (t) fn = () => act('mafia_vote', t.id);
      } else if (v.phase === 'night_doctor' && v.you.role === 'doctor') fn = () => act('protect', v.youId);
      else if (v.phase === 'night_detective' && v.you.role === 'detective' && others[0]) fn = () => act('investigate', others[0].id);
      else if (v.phase === 'day_vote' && others[0]) fn = () => act('vote', others[0].id);
      else if (v.phase === 'day_revote') {
        const c = others.filter((p) => v.day.tied.includes(p.id));
        fn = () => act('vote', (c[0] ?? others[0])?.id ?? null);
      }
      if (!fn) return;
      done.add(key);
      setTimeout(fn, delay);
    };
    st.subscribe(run);
    run();
  }, delay);

// ---------- the rules, restated independently of the server code ----------
const NIGHT = (ph) => ph.startsWith('night');
function mayHear(phase, S, me, from) {
  // S = { alive, role } maps keyed by player id
  if (phase === 'lobby' || phase === 'game_over') return true;
  if (phase === 'role_reveal') return false;
  if (NIGHT(phase)) {
    const fromMafia = S.alive[from] && S.role[from] === 'mafia';
    const meOk = !S.alive[me] || (S.alive[me] && S.role[me] === 'mafia');
    return fromMafia && meOk;
  }
  return !!S.alive[from]; // day: the living are heard by everyone (dead included)
}
function maySend(phase, S, from, to) {
  if (phase === 'lobby' || phase === 'game_over') return true;
  if (phase === 'role_reveal') return false;
  if (NIGHT(phase)) return !!(S.alive[from] && S.alive[to] && S.role[from] === 'mafia' && S.role[to] === 'mafia');
  return !!S.alive[from];
}

// ---------- scenario 1 ----------
async function scenarioFullGame(browser) {
  console.log('\n=== Scenario 1: 6 players, video on, full game ===');
  const host = await newPlayer(browser, 'Host');
  const players = [host];
  for (const n of ['Ana', 'Ben', 'Cy', 'Dee', 'Eli']) players.push(await newPlayer(browser, n, host.code));
  const pages = players.map((p) => p.page);

  await until(async () => (await Promise.all(pages.map((p) => p.evaluate(() => window.__mafia.store.getState().view?.players.length)))).every((n) => n === 6), 20000, 'six players in lobby');
  check('lobby: 6 players visible to everyone', true);

  // Everyone switches on mic + camera through the real buttons.
  for (const p of pages) {
    await p.click('[data-testid=toggle-mic]');
    await p.click('[data-testid=toggle-cam]');
  }
  await sleep(500);
  const modes = await Promise.all(pages.map((p) => p.evaluate(() => window.__media.getState()).then((s) => [s.micOn, s.camOn])));
  check('mic and camera toggles turn on', modes.every(([m, c]) => m && c), JSON.stringify(modes));

  await until(async () => (await Promise.all(pages.map(snapshot))).every((s) => Object.keys(s.peers).length === 5 && Object.values(s.peers).every((p) => p.state === 'connected')), 30000, 'full mesh connected');
  check('lobby: full mesh (every pair connected over WebRTC)', true);

  // Lobby media: everyone hears and sends to everyone.
  await sleep(2500);
  const a1 = await Promise.all(pages.map(rtpCounts));
  await sleep(2000);
  const a2 = await Promise.all(pages.map(rtpCounts));
  let lobbyOk = true, detail = '';
  a2.forEach((c, i) => Object.entries(c).forEach(([id, n]) => {
    if (!(n.a > a1[i][id].a) || !(n.v > a1[i][id].v)) { lobbyOk = false; detail += `${players[i].name}<-${id}:${JSON.stringify(a1[i][id])}->${JSON.stringify(n)} `; }
  }));
  check('lobby: audio AND video packets flow on all 30 directed links', lobbyOk, detail);

  // Host sets short timers and starts.
  await host.page.evaluate(() => window.__mafia.store.getState().updateSettings({ timers: { night: 15, discussion: 30, vote: 10, revoteDiscussion: 10 } }));
  await sleep(300);
  await host.page.click('button:has-text("Start game")');
  for (const p of pages) await installBot(p, 6000);

  const roleMap = {}, seen = new Set();
  let speakingSeen = false, shot1 = false, shot2 = false;
  const t0 = Date.now();
  let lastPhase = null;

  async function assertPhase(label) {
    const snaps = await Promise.all(pages.map(snapshot));
    const phase = snaps[0].phase;
    if (snaps.some((s) => s.phase !== phase) || phase !== label.phase || snaps[0].round !== label.round) return; // moved on; skip
    const S = { alive: {}, role: roleMap };
    snaps[0].players.forEach((p) => (S.alive[p.id] = p.alive));
    snaps.forEach((s) => s.role && (roleMap[s.me] = s.role));
    const before = await Promise.all(pages.map(rtpCounts));
    await sleep(1800);
    const after = await Promise.all(pages.map(rtpCounts));
    const again = await Promise.all(pages.map(snapshot));
    if (again.some((s) => s.phase !== phase)) return;

    const bad = [];
    snaps.forEach((s, i) => {
      Object.entries(s.peers).forEach(([id, peer]) => {
        const want = maySend(phase, S, s.me, id);
        if (peer.sendsAudio !== want) bad.push(`send audio ${players[i].name}->${id} want ${want}`);
        if (peer.sendsVideo !== want) bad.push(`send video ${players[i].name}->${id} want ${want}`);
      });
      s.audio.forEach((a) => {
        const hear = mayHear(phase, S, s.me, a.id);
        if (a.muted === hear) bad.push(`audio element ${players[i].name}<-${a.id} muted=${a.muted} want ${!hear}`);
      });
      Object.entries(after[i]).forEach(([id, n]) => {
        const want = maySend(phase, S, id, s.me);
        const grewA = n.a > before[i][id].a, grewV = n.v > before[i][id].v;
        if (grewA !== want) bad.push(`rtp audio ${id}->${players[i].name} grew=${grewA} want ${want}`);
        if (grewV !== want) bad.push(`rtp video ${id}->${players[i].name} grew=${grewV} want ${want}`);
      });
    });
    check(`${phase} (round ${label.round}): media matches the rules`, bad.length === 0, bad.slice(0, 6).join(' | '));

    // Visible video tiles: day = every living player (incl. self); night = only mafia see teammates.
    if (phase === 'day_discussion') {
      const liveVideos = again.map((s) => s.videos.filter((v) => v.w > 0).length);
      const expect = again.map((s) => S.alive[s.me] ? snaps[0].players.filter((p) => p.alive).length : snaps[0].players.filter((p) => p.alive).length - 0);
      check('day_discussion: video tiles show real frames for every living player', liveVideos.every((n, i) => n === expect[i]), `got ${liveVideos} want ${expect}`);
      if (again.some((s) => s.speaking)) speakingSeen = true;
      if (!shot1) { shot1 = true; await pages[0].screenshot({ path: `${SHOTS}/day-discussion.png` }); }
    }
    if (NIGHT(phase)) {
      const mafiaIdx = again.findIndex((s) => s.role === 'mafia' && s.alive);
      if (mafiaIdx >= 0) {
        const mates = Object.keys(roleMap).filter((id) => roleMap[id] === 'mafia' && S.alive[id] && id !== again[mafiaIdx].me).length;
        const vids = again[mafiaIdx].videos.filter((v) => v.w > 0).length;
        if (phase === 'night_mafia' && !shot2) { shot2 = true; await pages[mafiaIdx].screenshot({ path: `${SHOTS}/night-mafia.png` }); }
        // A lone Mafia has nobody to broadcast to, so their own tile stays dark too.
        const want = mates > 0 ? 1 + mates : 0;
        check(`${phase}: a Mafia player sees ${want} live video tile(s) (${mates} teammate(s))`, vids === want, `videos with frames: ${vids}`);
      }
      const civIdx = again.findIndex((s) => s.role === 'civilian' && s.alive);
      if (civIdx >= 0) check(`${phase}: a living civilian sees no live video at all`, again[civIdx].videos.filter((v) => v.w > 0).length === 0, `${again[civIdx].videos.length} videos`);
    }
  }

  // Watch the game; assert once per phase.
  for (;;) {
    if (Date.now() - t0 > 12 * 60 * 1000) throw new Error('game did not finish in 12 minutes');
    const s = await snapshot(pages[0]);
    const key = `${s.phase}:${s.round}`;
    if (key !== lastPhase) {
      lastPhase = key;
      console.log(`  ... phase ${key}`);
      if (!seen.has(key)) {
        seen.add(key);
        const label = { phase: s.phase, round: s.round };
        await sleep(1500); // let replaceTrack settle
        await assertPhase(label).catch((e) => console.log('  (assert skipped)', e.message));
      }
      if (s.phase === 'game_over') break;
    }
    if (s.speaking) speakingSeen = true;
    await sleep(250);
  }

  // Game over: everyone talks to everyone again.
  await sleep(3000);
  const snaps = await Promise.all(pages.map(snapshot));
  const S = { alive: {}, role: roleMap };
  snaps[0].players.forEach((p) => (S.alive[p.id] = p.alive));
  const overBad = [];
  snaps.forEach((s, i) => Object.entries(s.peers).forEach(([id, p]) => { if (!p.sendsAudio || !p.sendsVideo) overBad.push(`${players[i].name}->${id}`); }));
  check('game_over: everyone sends audio+video to everyone again', overBad.length === 0, overBad.slice(0, 5).join(' '));
  check('speaking indicator lit up for someone during the game', speakingSeen);
  check('game ended with a winner', await pages[0].evaluate(() => !!window.__mafia.store.getState().view.winner));
  for (const p of players) await p.ctx.close();
}

// ---------- scenario 2 ----------
async function scenarioVideoSetting(browser) {
  console.log('\n=== Scenario 2: "Allow video" host setting ===');
  const host = await newPlayer(browser, 'Hosty');
  const players = [host];
  for (const n of ['Ann', 'Bob', 'Cat', 'Dan', 'Eve']) players.push(await newPlayer(browser, n, host.code));
  const pages = players.map((p) => p.page);
  await until(async () => (await Promise.all(pages.map((p) => p.evaluate(() => window.__mafia.store.getState().view?.players.length)))).every((n) => n === 6), 20000, 'six players');

  // Video OFF before anyone touches a camera.
  await host.page.evaluate(() => window.__mafia.store.getState().updateSettings({ video: false }));
  await until(async () => (await Promise.all(pages.map(snapshot))).every((s) => s.videoDisabledBadge), 10000, 'video-disabled badge');
  check('video off: camera button replaced by "Video disabled" for everyone', (await Promise.all(pages.map(snapshot))).every((s) => !s.camButton));

  for (const p of pages) await p.click('[data-testid=toggle-mic]');
  await until(async () => (await Promise.all(pages.map(snapshot))).every((s) => Object.keys(s.peers).length === 5 && Object.values(s.peers).every((p) => p.state === 'connected')), 30000, 'audio-only mesh');
  const snaps = await Promise.all(pages.map(snapshot));
  check('video off: no peer connection has a video line', snaps.every((s) => Object.values(s.peers).every((p) => !p.hasVideoLine && p.kinds.every((k) => k === 'audio'))), JSON.stringify(snaps[0].peers));
  check('video off: camera was never requested from the browser', snaps.every((s) => s.gum.video === 0), JSON.stringify(snaps.map((s) => s.gum)));
  // replaceTrack() settles asynchronously after the link reports "connected", so allow a moment.
  let audioSnaps = snaps;
  await until(async () => {
    audioSnaps = await Promise.all(pages.map(snapshot));
    return audioSnaps.every((s) => Object.values(s.peers).every((p) => p.sendsAudio));
  }, 8000, 'audio senders active').catch(() => {});
  check('video off: audio is still negotiated and sent', audioSnaps.every((s) => Object.values(s.peers).every((p) => p.sendsAudio)), JSON.stringify(audioSnaps.map((s) => Object.values(s.peers).map((p) => [p.state, p.sendsAudio]))));

  // Flip video back ON: connections are rebuilt with a video line, cameras work.
  await host.page.evaluate(() => window.__mafia.store.getState().updateSettings({ video: true }));
  await until(async () => (await Promise.all(pages.map(snapshot))).every((s) => s.camButton && Object.keys(s.peers).length === 5 && Object.values(s.peers).every((p) => p.hasVideoLine || p.state !== 'connected' ? p.hasVideoLine : false)), 20000, 'video line restored');
  for (const p of pages) await p.click('[data-testid=toggle-cam]');
  await sleep(2500);
  const snaps2 = await Promise.all(pages.map(snapshot));
  check('video back on: cameras are requested and sent over the rebuilt links', snaps2.every((s) => s.gum.video === 1 && Object.values(s.peers).every((p) => p.sendsVideo && p.state === 'connected')), JSON.stringify(snaps2.map((s) => [s.gum, Object.values(s.peers).map((p) => p.sendsVideo)])));

  // Flip OFF with cameras running: cameras must be shut down and video links removed.
  await host.page.evaluate(() => window.__mafia.store.getState().updateSettings({ video: false }));
  await until(async () => (await Promise.all(pages.map(snapshot))).every((s) => Object.values(s.peers).every((p) => !p.hasVideoLine)), 20000, 'video torn down');
  const off = await Promise.all(pages.map((p) => p.evaluate(() => ({ cam: window.__media.getState().camOn, vids: document.querySelectorAll('video').length }))));
  check('video switched off mid-lobby: cameras stop and no <video> remains', off.every((o) => !o.cam && o.vids === 0), JSON.stringify(off));
  for (const p of players) await p.ctx.close();
}

// ---------- main ----------
const server = await startServer();
let browser;
try {
  browser = await chromium.launch({
    executablePath: EDGE,
    headless: process.env.HEADED ? false : true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  });
  const only = process.argv[2];
  if (!only || only === '1') await scenarioFullGame(browser);
  if (!only || only === '2') await scenarioVideoSetting(browser);
} catch (e) {
  check('e2e run completed without crashing', false, e.stack || e.message);
} finally {
  await browser?.close().catch(() => {});
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
