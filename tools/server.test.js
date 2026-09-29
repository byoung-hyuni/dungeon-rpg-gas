// Node 테스트: 실제 .gs 코드를 모의 GAS 서비스 위에서 실행
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = vm.createContext({ console, Date, Math, JSON });
const run = f => vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
run(path.join(__dirname, 'GasMock.js'));
['Data.gs', 'Code.gs', 'Setup.gs'].forEach(f => run(path.join(__dirname, '../src', f)));
const g = (code) => vm.runInContext(code, ctx);
const assert = require('assert');

g('setup()');
const data = JSON.parse(g('getGameData()'));
assert.strictEqual(data.levels.length, 25);
assert.strictEqual(data.dungeons.length, 5);
assert.strictEqual(data.config.MAX_LEVEL, 25);
console.log('data ok: skills', data.skills.length, 'monsters', data.monsters.length, 'items', data.items.length);

// 모든 참조 무결성
const ids = new Set(data.items.map(i => i.id)), mids = new Set(data.monsters.map(m => m.id));
data.dungeons.forEach(d => { d.monsters.split(',').forEach(m => assert(mids.has(m), m)); assert(mids.has(d.bossId)); });
data.items.forEach(i => { if (i.dropDungeon) assert(data.dungeons.some(d => d.id === i.dropDungeon), i.id); });
assert(ids.has(data.config.START_WEAPON) && ids.has(data.config.START_ARMOR));

ctx.P = { classId: 'swordsman', level: 3, exp: 20, gold: 500, equip: { weapon: 'w_rusty', armor: 'hack', accessory: '' }, inventory: [{ id: 'p_hp', qty: 5 }, { id: 'bogus', qty: 1 }], cleared: 1, bestGrades: { d1: 'S', d2: 'ZZ' }, playSec: 100 };
let r = g("login('용사1','1234')"); assert.strictEqual(r.status, 'new');
r = g("savePlayer('용사1','1234',P,true)"); assert(r.ok && r.isNew, JSON.stringify(r));
r = g("savePlayer('용사1','9999',P,true)"); assert(!r.ok && /이미/.test(r.message));
r = g("savePlayer('용사1','9999',P,false)"); assert(!r.ok && /PIN/.test(r.message));
r = g("login('용사1','0000')"); assert.strictEqual(r.status, 'wrong_pin');
r = g("login('용사1','1234')"); assert.strictEqual(r.status, 'ok');
assert.strictEqual(r.player.equip.armor, ''); assert.strictEqual(r.player.inventory.length, 1); assert.deepStrictEqual(r.player.bestGrades, { d1: 'S' });
ctx.P.level = 5; r = g("savePlayer('용사1','1234',P,false)"); assert(r.ok && r.saveCount === 2);
assert.strictEqual(g("login('용사1','1234')").player.level, 5);
// 잠금
for (let i = 0; i < 5; i++) g("login('용사1','0001')");
assert.strictEqual(g("login('용사1','1234')").status, 'locked');
g("CacheService.getScriptCache().remove('FAIL_용사1')");
// 이름/PIN 검증
assert.throws(() => g("login('a','1234')"));
assert.throws(() => g("login('용사1','12a4')"));

// 랭킹
r = g("submitRecord('없는사람','1234',{dungeonId:'d1',clearSec:80,hits:3,maxCombo:20,level:3})"); assert(!r.ok && r.needSave);
r = g("submitRecord('용사1','1234',{dungeonId:'d1',clearSec:5,hits:0,maxCombo:20,level:3})"); assert(!r.ok, 'too fast');
r = g("submitRecord('용사1','1234',{dungeonId:'d1',clearSec:70,hits:4,maxCombo:25,level:5})"); assert(r.ok, JSON.stringify(r)); console.log('record', r);
r = g("submitRecord('용사1','1234',{dungeonId:'d1',clearSec:120,hits:20,maxCombo:5,level:5})"); assert(r.ok && !r.isBest);
ctx.Q = Object.assign({}, ctx.P, { level: 8 });
g("savePlayer('검객','5555',Q,true)");
r = g("submitRecord('검객','5555',{dungeonId:'d1',clearSec:60,hits:0,maxCombo:40,level:8})"); assert(r.ok && r.rankDungeon === 1, JSON.stringify(r));
r = g("submitRecord('검객','5555',{dungeonId:'d2',clearSec:130,hits:5,maxCombo:30,level:8})"); assert(r.ok);
const rk = JSON.parse(g('getRankings()'));
assert.strictEqual(rk.byDungeon.d1.length, 2); assert.strictEqual(rk.overall[0].name, '검객'); assert.strictEqual(rk.overall[0].clears, 2);
console.log('overall', rk.overall);
assert(/초기화/.test(g("adminResetPin_('검객','7777')")));
assert.strictEqual(g("login('검객','7777')").status, 'ok');

// 등급표 확인
const d1 = data.dungeons[0];
[[60, 0, 30], [100, 10, 20], [200, 40, 5]].forEach(([t, h, c]) => console.log('d1', t, 's', h, 'hits', c, 'combo →', g(`calcClearResult(${JSON.stringify(d1)},${t},${h},${c},${JSON.stringify(data.config)})`)));
// 웹 앱에서 호출되면 안 되는 관리자 동작
assert.strictEqual(typeof ctx.adminResetPin, 'undefined', 'adminResetPin must be private');
ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Items').getRange(2, 2).setValue('변조');
g('resetGameData()');   // UI 없음 → 아무것도 하지 않아야 함
assert.strictEqual(ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Items').getRange(2, 2).getValue(), '변조');
console.log('ALL SERVER TESTS PASSED');

// 새 직업의 참조와 저장 호환성을 확인합니다.
assert.deepStrictEqual(data.classes.map(c => c.id), ['swordsman', 'fighter', 'gunner']);
for (const cid of ['fighter', 'gunner']) {
  const skills = data.skills.filter(s => s.classId === cid);
  assert.strictEqual(skills.length, 7);
  assert.strictEqual(new Set(skills.map(s => s.key)).size, 7);
  ctx.newP = { ...ctx.P, classId: cid };
  assert(g(`savePlayer('${cid}','1234',newP,true)`).ok);
  assert.strictEqual(g(`login('${cid}','1234')`).player.classId, cid);
}
assert.throws(() => g('menuAddNewClasses()'), /No UI/);
assert.throws(() => g('menuSendEventReward()'), /No UI/);
assert.strictEqual(g('addNewClasses_()'), 0);
// 이전 시트 형태에서 추가하고 반복 실행해도 기존 설정을 보존합니다.
g(`['Classes','Skills','Items'].forEach(function(name) {
  const def = SEED[name];
  const rows = def.rows.filter(function(r) { return !['fighter','gunner'].includes(r[name==='Classes'?0:1]) && !['w_gloves','w_pistol'].includes(r[0]); });
  const sh = sheet_(name); sh.clear(); sh.getRange(1,1,rows.length+1,def.headers.length).setValues([def.headers].concat(rows));
}); sheet_('Classes').getRange(2,10).setValue('운영 설명입니다.'); clearGameCache(true);`);
assert.strictEqual(g('addNewClasses_()'), 18);
assert.strictEqual(g('addNewClasses_()'), 0);
assert.strictEqual(g("sheet_('Classes').getRange(2,10).getValue()"), '운영 설명입니다.');

// 구버전 Players 헤더를 자동 확장하고 발송 명단을 고정합니다.
g(`const legacyRows = sheet_('Players').getDataRange().getValues().map(r => r.slice(0,14));
  sheet_('Players').clear(); sheet_('Players').getRange(1,1,legacyRows.length,14).setValues(legacyRows);`);
const before = g("login('용사1','1234')").player;
ctx.before = before;
const sent = g('sendEventReward_()');
assert.strictEqual(sent.count, 4);
assert(!sent.alreadySent);
assert.strictEqual(g("headers_(sheet_('Players')).indexOf('eventReward')"), 14);
assert(g("login('용사1','1234')").player.rewardPending);
assert(g("savePlayer('신규사용자','1234',P,true)").ok);
assert.strictEqual(g('sendEventReward_()').count, 4);
assert.strictEqual(g("login('신규사용자','1234')").player.rewardPending, false);
assert(!g("savePlayer('용사1','0000',before,false)").ok);
r = g("savePlayer('용사1','1234',before,false)");
assert(r.ok && r.reward.claimed);
assert.strictEqual(r.player.gold, before.gold + 5000);
for (const id of ['p_hp', 'p_mp']) {
  const count = p => p.inventory.filter(s => s.id === id).reduce((n,s) => n+s.qty,0);
  assert.strictEqual(count(r.player), count(before)+100);
}
assert.strictEqual(r.player.rewardVersion, 1);
assert(!('pinHash' in r.player));
assert(!g("savePlayer('용사1','1234',before,false)").ok, '오래된 저장으로 보상을 덮어쓰지 않습니다.');
ctx.rewarded = r.player;
r = g("savePlayer('용사1','1234',rewarded,false)");
assert(r.ok && !r.reward.claimed);
assert.strictEqual(r.player.gold, ctx.rewarded.gold);
// 꽉 찬 가방 / 골드 한도에서는 부분 지급 없이 보관합니다.
ctx.full = { ...g("login('fighter','1234')").player, inventory: Array.from({length:30},()=>({id:'w_rusty',qty:1})) };
r = g("savePlayer('fighter','1234',full,false)");
assert(r.ok && r.reward.pending && !r.reward.claimed);
assert.strictEqual(r.player.gold, ctx.full.gold);
assert.strictEqual(r.player.inventory.length, 30);
ctx.full.inventory = [{id:'p_hp',qty:99},{id:'p_mp',qty:98}];
ctx.full.gold = 999999999;
assert(g("savePlayer('fighter','1234',full,false)").reward.pending);
ctx.full.gold = 100;
r = g("savePlayer('fighter','1234',full,false)");
assert(r.reward.claimed);
assert.strictEqual(r.player.gold, 5100);
assert.strictEqual(r.player.inventory.filter(s=>s.id==='p_hp').reduce((n,s)=>n+s.qty,0),199);
assert.strictEqual(r.player.inventory.filter(s=>s.id==='p_mp').reduce((n,s)=>n+s.qty,0),198);
// 쓰기 실패 뒤 재시도해도 한 번만 지급합니다.
ctx.failP = g("login('gunner','1234')").player;
g(`const originalSheet = sheet_; let failWrite = true;
  sheet_ = function(name) {
    const sh = originalSheet(name);
    if (name !== 'Players' || !failWrite) return sh;
    return new Proxy(sh, { get(target,key) {
      if (key !== 'getRange') return target[key];
      return function(...args) { const range=target.getRange(...args);
        return new Proxy(range,{get(t,k) { if(k==='setValues') return function(){failWrite=false;throw new Error('쓰기 실패');}; return t[k]; }});
      };
    }});
  };`);
assert.throws(()=>g("savePlayer('gunner','1234',failP,false)"), /쓰기 실패/);
g('sheet_ = originalSheet');
r = g("savePlayer('gunner','1234',failP,false)");
assert(r.reward.claimed && r.player.gold === ctx.failP.gold+5000);
console.log('NEW CLASSES AND EVENT REWARD TESTS PASSED');
// 서버에는 기록됐지만 응답을 잃은 경우 재시도로 중복 지급하지 않습니다.
ctx.lostP = g("login('검객','7777')").player;
g(`let loseResponse = true;
  sheet_ = function(name) {
    const sh = originalSheet(name);
    if (name !== 'Players' || !loseResponse) return sh;
    return new Proxy(sh,{get(target,key){
      if(key!=='getRange') return target[key];
      return function(...args){ const range=target.getRange(...args);
        return new Proxy(range,{get(t,k){ if(k==='setValues') return function(values){ t.setValues(values);loseResponse=false;throw new Error('응답 유실');};return t[k]; }});
      };
    }});
  };`);
assert.throws(()=>g("savePlayer('검객','7777',lostP,false)"),/응답 유실/);
g('sheet_ = originalSheet');
assert(!g("savePlayer('검객','7777',lostP,false)").ok);
assert.strictEqual(g("login('검객','7777')").player.gold,ctx.lostP.gold+5000);
// 수령 버전 외의 운영용 추가 컬럼도 저장 시 유지합니다.
g("sheet_('Players').getRange(1,16).setValue('adminNote'); sheet_('Players').getRange(2,16).setValue('유지합니다.');");
assert(g("savePlayer('용사1','1234',rewarded,false)").ok);
assert.strictEqual(g("sheet_('Players').getRange(2,16).getValue()"),'유지합니다.');
// 대상 0명으로 발송한 이벤트도 종료한 명단으로 취급합니다.
g('GasMock.reset(); clearGameCache(true); setup();');
assert.strictEqual(g('sendEventReward_()').count,0);
assert(g("savePlayer('늦은가입','1234',P,true)").ok);
assert.strictEqual(g('sendEventReward_()').count,0);
assert(!g("login('늦은가입','1234')").player.rewardPending);
console.log('REWARD RESPONSE LOSS AND EMPTY CAMPAIGN TESTS PASSED');
