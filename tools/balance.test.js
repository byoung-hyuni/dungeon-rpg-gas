const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
const CASES = [
  { d: 1, lv: 1, eq: ['w_rusty', 'a_cloth', ''] },
  { d: 2, lv: 5, eq: ['w_steel', 'a_leather', 'r_wood'] },
  { d: 3, lv: 10, eq: ['w_knight', 'a_chain', 'r_silver'] },
  { d: 4, lv: 15, eq: ['w_iron', 'a_plate', 'r_silver'] },
  { d: 5, lv: 20, eq: ['w_frost', 'a_fur', 'r_sand'] },
];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '../dist/preview.html'));
  await page.waitForFunction(() => DATA);
  await page.evaluate(() => { S.name = 'bal'; newCharacter('swordsman'); P.inventory = []; invAdd('p_hp', 5); invAdd('p_mp', 5);
    const send = (code, type) => document.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
    const tap = c => { send(c, 'keydown'); send(c, 'keyup'); };
    const setHold = (c, on) => send(c, on ? 'keydown' : 'keyup');
    setInterval(() => {
      if (screen !== 'game' || !RUN || RUN.state !== 'play') return;
      const p = RUN.player;
      if (p.hp < p.st.maxHp * 0.35) tap('Digit1');
      const mobs = RUN.mobs.filter(m => !m.dead);
      let tx = 99999, ty = 410;
      if (mobs.length) { const m = mobs.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0]; tx = m.x - Math.sign(m.x - p.x || 1) * 60; ty = m.y;
        if (Math.abs(m.y - p.y) < 25 && Math.abs(m.x - p.x) < 120) { if (Math.sign(m.x - p.x) !== p.facing) tap(m.x > p.x ? 'ArrowRight' : 'ArrowLeft');
          ['KeyQ', 'KeyH', 'KeyD', 'KeyA', 'KeyS', 'KeyF', 'KeyG'].forEach(k => { if (Math.random() < 0.05) tap(k); }); tap('KeyX'); } }
      setHold('ArrowRight', tx > p.x + 15); setHold('ArrowLeft', tx < p.x - 15); setHold('ArrowDown', ty > p.y + 8); setHold('ArrowUp', ty < p.y - 8);
    }, 60);
  });
  for (const c of CASES) {
    await page.evaluate(c => { P.level = c.lv; P.exp = 0; P.equip = { weapon: c.eq[0], armor: c.eq[1], accessory: c.eq[2] }; P.inventory = []; invAdd('p_hp', 5); invAdd('p_mp', 5); startDungeon(DATA.dungeons[c.d - 1]); window.__deaths = 0; }, c);
    let deaths = 0, t0 = Date.now();
    while (Date.now() - t0 < 180000) {
      const s = await page.evaluate(() => screen);
      if (s === 'result') break;
      if (s === 'dead') { deaths++; await page.evaluate(() => { P.gold += 99999; }); await page.keyboard.press('Enter'); }
      await page.waitForTimeout(400);
    }
    const r = await page.evaluate(() => ({ screen, t: Math.round(RUN.time), hits: RUN.hits, grade: RUN.result && RUN.result.grade, lvAfter: P.level, pots: invCount('p_hp') }));
    console.log('D' + c.d, 'Lv' + c.lv, JSON.stringify(r), 'deaths', deaths);
  }
  console.log('errors', errs);
  await browser.close();
})();
