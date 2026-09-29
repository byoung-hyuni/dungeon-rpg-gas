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
