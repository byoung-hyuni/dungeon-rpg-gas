// 직업 선택부터 전투·보상 수령·재접속까지 브라우저에서 확인합니다.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path = require('path');
const assert = require('assert');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.join(__dirname, '../dist/preview.html'));
    await page.fill('#inName', '신직업테스트');
    await page.fill('#inPin', '1234');
    await page.click('#btnLogin');
    await page.waitForFunction(() => screen === 'classSelect');
    for (const [index, cid] of [[1, 'fighter'], [2, 'gunner']]) {
      await page.click('[data-i="' + index + '"]');
      await page.screenshot({ path: path.join(__dirname, 'shots', cid + '-select.png') });
      await page.click('#btnPick');
      assert.strictEqual(await page.evaluate(() => P.classId), cid);
      assert.strictEqual(await page.evaluate(() => P.equip.weapon), cid === 'fighter' ? 'w_gloves' : 'w_pistol');
      const result = await page.evaluate(() => {
        P.level = 25;
        startDungeon(DATA.dungeons[0]);
        screen = 'test';
        const p = RUN.player;
        const results = [];
        for (const sk of classSkills()) {
          p.action = null; p.cds = {}; p.mp = p.st.maxMp; p.facing = 1; p.x = 110;
          const m = makeMob(Object.assign({}, DATA.monsters[0], { hp: 100000 }), 160, p.y);
          RUN.mobs = [m]; RUN.projs = [];
          const started = trySkill(sk);
          for (let i = 0; i < 150; i++) { if(p.action) runAction(p, 1/60); updateProjs(1/60); }
          results.push({ id: sk.id, started, worked: sk.type === 'buff' ? p.buffAtk === 30 : m.hp < m.maxHp });
        }
        p.action = null; p.x = 110; p.facing = 1; p.z = 0;
        const m = makeMob(Object.assign({}, DATA.monsters[0], { hp:100000 }), P.classId === 'gunner' ? 410 : 170, p.y);
        RUN.mobs = [m]; RUN.projs = []; const mp = p.mp;
        startAttack();
        for(let i=0;i<50;i++) { if(p.action)runAction(p,1/60);updateProjs(1/60); }
        return { skills: results, basic: m.hp < m.maxHp, free: mp === p.mp };
      });
      assert(result.skills.every(s=>s.started && s.worked), JSON.stringify(result));
      assert(result.basic && result.free);
      await page.evaluate(() => { RUN.fx=[]; RUN.state='pause'; screen='game'; RUN.player.swing=0.3; renderRun(); });
      await page.screenshot({ path: path.join(__dirname, 'shots', cid + '-combat.png') });
      await page.evaluate(() => { showTown(); showClassSelect(); });
    }
    // 저장된 사용자에게 발송하고 저장 응답을 화면에 반영합니다.
    await page.click('[data-i="2"]'); await page.click('#btnPick');
    assert(await page.evaluate(() => doSave()));
    assert.strictEqual(await page.evaluate(() => sendEventReward_().count), 1);
    await page.evaluate(() => { P=login(S.name,S.pin).player; showTown(); });
    assert((await page.locator('#ui').innerText()).includes('이벤트 보상이 도착했습니다.'));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'event-pending.png') });
    assert(await page.evaluate(() => doSave()));
    const reward = await page.evaluate(() => ({gold:P.gold,hp:invCount('p_hp'),mp:invCount('p_mp'),version:P.rewardVersion}));
    assert.deepStrictEqual(reward, {gold:5300,hp:105,mp:103,version:1});
    assert(await page.evaluate(() => doSave()));
    await page.reload();
    await page.waitForSelector('#inPin');
    await page.fill('#inName', '신직업테스트');await page.fill('#inPin','1234');await page.click('#btnLogin');
    await page.waitForFunction(() => screen === 'town');
    assert.strictEqual(await page.evaluate(() => P.gold),5300);
    await page.screenshot({ path: path.join(__dirname, 'shots', 'event-relogin.png') });
    assert.deepStrictEqual(errors, []);
    console.log('CLASS COMBAT AND EVENT BROWSER TESTS PASSED');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
