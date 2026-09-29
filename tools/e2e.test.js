const { chromium } = require('/path/to/developer/.npm-global/lib/node_modules/playwright');
const path = require('path');
const SHOT = n => path.join(__dirname, 'shots', n + '.png');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.join(__dirname, '../dist/preview.html'));
  await page.waitForSelector('#inName');
  await page.screenshot({ path: SHOT('01-login') });
  await page.fill('#inName', '테스터');
  await page.press('#inName', 'Enter');
  await page.keyboard.type('1234');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => screen === 'classSelect');
  await page.screenshot({ path: SHOT('02-class') });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => screen === 'town');
  await page.screenshot({ path: SHOT('03-town') });
  // 저장하기 (6번째)
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => S.saved && !S.dirty, null, { timeout: 5000 });
  console.log('saved ok');
  // 상점: 포션 구매
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => screen === 'shop');
  await page.keyboard.press('Enter'); // HP 포션 1개
  const gold1 = await page.evaluate(() => P.gold);
  await page.screenshot({ path: SHOT('04-shop') });
  await page.keyboard.press('Escape');
  await page.keyboard.press('KeyI');
  await page.waitForFunction(() => screen === 'inventory');
  await page.screenshot({ path: SHOT('05-inventory') });
  await page.keyboard.press('Escape');
  console.log('gold after buy', gold1);

  // 봇: 가까운 적에게 다가가 공격
  await page.evaluate(() => {
    const send = (code, type) => document.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
    const hold = new Set();
    const setHold = (code, on) => { if (on) { hold.add(code); send(code, 'keydown'); } if (!on && hold.has(code)) { hold.delete(code); send(code, 'keyup'); } };
    const tap = code => { send(code, 'keydown'); send(code, 'keyup'); };
    window.__bot = setInterval(() => {
      if (screen !== 'game' || !RUN || RUN.state !== 'play') { ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].forEach(c => setHold(c, false)); return; }
      const p = RUN.player;
      if (p.hp < p.st.maxHp * 0.35) tap('Digit1');
      if (p.mp < p.st.maxMp * 0.2) tap('Digit2');
      const mobs = RUN.mobs.filter(m => !m.dead);
      let tx, ty;
      if (!mobs.length) { tx = 99999; ty = 410; }
      else { const m = mobs.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0]; tx = m.x - Math.sign(m.x - p.x || 1) * 60; ty = m.y;
        if (Math.abs(m.y - p.y) < 25 && Math.abs(m.x - p.x) < 120) { if (Math.sign(m.x - p.x) !== p.facing) { tap(m.x > p.x ? 'ArrowRight' : 'ArrowLeft'); }
          ['KeyQ', 'KeyH', 'KeyD', 'KeyA', 'KeyS', 'KeyF', 'KeyG'].forEach(k => { if (Math.random() < 0.08) tap(k); }); tap('KeyX'); } }
      setHold('ArrowRight', tx > p.x + 15); setHold('ArrowLeft', tx < p.x - 15);
      setHold('ArrowDown', ty > p.y + 8); setHold('ArrowUp', ty < p.y - 8);
    }, 50);
  });
  // 던전 입장
  await page.keyboard.press('Home');
  await page.evaluate(() => showDungeonSelect());
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => screen === 'game');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: SHOT('06-dungeon') });
  let shotBoss = false;
  for (let i = 0; i < 240; i++) {
    const st = await page.evaluate(() => ({ screen, room: RUN && RUN.roomIdx, state: RUN && RUN.state, hp: RUN && Math.round(RUN.player.hp), lv: P.level, mobs: RUN && RUN.mobs.length }));
    if (i % 10 === 0) console.log(JSON.stringify(st));
    if (st.screen === 'dead') { console.log('died -> revive'); await page.keyboard.press('Enter'); }
    if (st.screen === 'result') break;
    if (st.room === 3 && !shotBoss) { shotBoss = true; await page.waitForTimeout(1500); await page.screenshot({ path: SHOT('07-boss') }); }
    await page.waitForTimeout(500);
  }
  await page.waitForFunction(() => screen === 'result', null, { timeout: 5000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: SHOT('08-result') });
  const res = await page.evaluate(() => ({ r: RUN.result, hits: RUN.hits, combo: RUN.maxCombo, items: RUN.itemsGot, lv: P.level, cleared: P.cleared, best: P.bestGrades }));
  console.log('RESULT', JSON.stringify(res));
  await page.keyboard.press('Enter'); // 랭킹 등록
  await page.waitForFunction(() => RUN.submitted || /❌/.test(document.querySelector('#rankLine').textContent), null, { timeout: 5000 });
  console.log('rankLine:', await page.textContent('#rankLine'));
  await page.screenshot({ path: SHOT('09-ranked') });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => screen === 'town');
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOT('10-ranking') });
  await page.keyboard.press('Escape');

  // 고레벨 치트로 5번째 던전 보스 패턴 확인
  await page.evaluate(() => { P.level = 25; P.equip.weapon = 'w_epic'; P.equip.armor = 'a_dragon'; P.equip.accessory = 'r_epic'; P.cleared = 4; P.bestGrades.d4 = 'A'; startDungeon(DATA.dungeons[4]); });
  for (let i = 0; i < 200; i++) {
    const st = await page.evaluate(() => ({ screen, room: RUN.roomIdx, hp: Math.round(RUN.player.hp), boss: (RUN.mobs.find(m => m.boss) || {}).hp }));
    if (st.screen === 'dead') await page.keyboard.press('Enter');
    if (st.screen === 'result') break;
    if (st.room === 5 && i % 6 === 0) console.log('d5 boss', JSON.stringify(st));
    if (st.room === 5 && !shotBoss5) { var shotBoss5 = true; await page.waitForTimeout(2500); await page.screenshot({ path: SHOT('11-d5boss') }); }
    await page.waitForTimeout(500);
  }
  console.log('d5 screen:', await page.evaluate(() => screen), await page.evaluate(() => JSON.stringify(RUN.result)));
  await page.screenshot({ path: SHOT('12-d5result') });

  // 사망/부활 흐름
  await page.evaluate(() => { clearInterval(window.__bot); showTown(); P.level = 1; P.equip = { weapon: 'w_rusty', armor: '', accessory: '' }; startDungeon(DATA.dungeons[0]); RUN.player.hp = 1; RUN.mobs.forEach(m => { m.x = RUN.player.x + 50; m.y = RUN.player.y; m.aggro = 0; m.cd = 0; }); });
  await page.waitForFunction(() => screen === 'dead', null, { timeout: 8000 });
  await page.screenshot({ path: SHOT('13-dead') });
  await page.keyboard.press('Enter');
  console.log('after revive', await page.evaluate(() => ({ screen, hp: RUN.player.hp, hits: RUN.hits })));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => screen === 'pause');
  await page.screenshot({ path: SHOT('14-pause') });
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => screen === 'town');
  // 로그아웃(저장 안 된 진행) → 저장하고 로그아웃 → 재로그인
  await page.evaluate(() => logout());
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOT('15-logout') });
  await page.keyboard.press('KeyY');
  await page.waitForFunction(() => screen === 'login', null, { timeout: 5000 });
  await page.fill('#inName', '테스터'); await page.press('#inName', 'Enter'); await page.keyboard.type('9999'); await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  console.log('wrong pin msg:', await page.textContent('#loginErr'));
  await page.fill('#inPin', '1234'); await page.press('#inPin', 'Enter');
  await page.waitForFunction(() => screen === 'town');
  console.log('relogin', await page.evaluate(() => ({ lv: P.level, gold: P.gold, inv: P.inventory.length, best: P.bestGrades })));
  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });
