/**
 * Code.gs — 웹 앱 서버
 * ------------------------------------------------------------
 * 브라우저(Game.html)가 google.script.run 으로 부르는 함수들입니다.
 *  - getGameData()                : 게임 데이터 로드 (캐시 10분)
 *  - login(name, pin)             : 이어하기 / 신규 판별
 *  - savePlayer(name, pin, data, expectNew) : 저장하기 (PIN 함께 저장)
 *  - submitRecord(name, pin, rec) : 랭킹 등록 (점수는 서버가 계산)
 *  - getRankings()                : 랭킹 조회 (캐시 60초)
 *
 * 여러 명이 동시에 저장/등록해도 행이 꼬이지 않도록 LockService로 순서를 보장합니다.
 */

const DATA_SHEETS = ['Config', 'Levels', 'Classes', 'Skills', 'Dungeons', 'Monsters', 'Items'];
const CACHE_DATA_KEY = 'GAME_DATA_V1';
const CACHE_RANK_KEY = 'RANKINGS_V1';
const EVENT_REWARD_ID = 'new_classes_20260929';
const EVENT_REWARD_SHEET = 'EventRecipients';
const GRADES = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'F'];

/* ================= 웹 앱 진입점 ================= */

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('던전 마스터 RPG')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Index.html 에서 <?!= include('Style'); ?> 형태로 다른 파일을 끼워 넣는다 */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/* ================= 게임 데이터 ================= */

/** 브라우저로 보낼 게임 데이터(JSON 문자열) */
function getGameData() {
  return JSON.stringify(loadGameData_());
}

function loadGameData_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(CACHE_DATA_KEY);
  if (hit) return JSON.parse(hit);

  const ss = getSS_();
  const raw = {};
  DATA_SHEETS.forEach(function (n) {
    const sh = ss.getSheetByName(n);
    if (!sh) throw new Error("'" + n + "' 시트가 없습니다. 스프레드시트 메뉴 [🎮 던전 RPG > 1) 초기 설정]을 먼저 실행하세요.");
    raw[n] = readTable_(sh);
  });
  const config = {};
  raw.Config.forEach(function (r) { config[r.key] = r.value; });

  const data = {
    config: config,
    levels: raw.Levels,
    classes: raw.Classes,
    skills: raw.Skills,
    dungeons: raw.Dungeons,
    monsters: raw.Monsters,
    items: raw.Items,
  };
  try { cache.put(CACHE_DATA_KEY, JSON.stringify(data), 600); } catch (e) { /* 100KB 초과 시 캐시 생략 */ }
  return data;
}

/* ================= 로그인 / 저장 ================= */

function login(name, pin) {
  name = cleanName_(name);
  checkPin_(pin);
  if (isLocked_(name)) return { status: 'locked', message: 'PIN을 여러 번 틀렸습니다. 5분 뒤에 다시 시도하세요.' };

  const sh = sheet_('Players');
  const found = findPlayer_(sh, name);
  if (!found) return { status: 'new', name: name };

  if (found.rec.pinHash !== hashPin_(name, pin)) {
    addFail_(name);
    return { status: 'wrong_pin', message: 'PIN이 일치하지 않습니다.' };
  }
  clearFail_(name);
  return { status: 'ok', player: publicPlayer_(found.rec) };
}

/**
 * 저장하기. 처음 저장할 때 PIN 해시가 함께 기록되고, 이후에는 같은 PIN으로만 덮어쓸 수 있다.
 * expectNew=true 인데 이미 다른 사람이 같은 이름으로 저장했다면 거부한다.
 */
function savePlayer(name, pin, data, expectNew) {
  name = cleanName_(name);
  checkPin_(pin);
  const gd = loadGameData_();
  const p = sanitizePlayer_(data || {}, gd);
  const hash = hashPin_(name, pin);

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = sheet_('Players');
    const headers = headers_(sh);
    const found = findPlayer_(sh, name);
    const now = new Date();
    let createdAt = now, saveCount = 1, row;

    if (found) {
      if (found.rec.pinHash !== hash) {
        return { ok: false, message: expectNew ? '이미 다른 사람이 사용 중인 이름입니다. 다른 이름으로 시작하세요.' : 'PIN이 일치하지 않아 저장할 수 없습니다.' };
      }
      if (Number((data && data.rewardVersion) || 0) !== (found.rec.eventReward === EVENT_REWARD_ID ? 1 : 0)) {
        return { ok: false, message: '서버에 이벤트 보상 수령 기록이 있습니다. 보상을 보호하기 위해 저장을 중단했습니다. 다시 로그인하세요.' };
      }
      createdAt = found.rec.createdAt || now;
      saveCount = (Number(found.rec.saveCount) || 0) + 1;
      row = found.row;
    } else {
      row = sh.getLastRow() + 1;
    }

    const reward = applyEventReward_(name, p, found && found.rec.eventReward, gd);
    const rec = Object.assign({}, found ? found.rec : {}, {
      eventReward: reward.claimed ? EVENT_REWARD_ID : (found ? found.rec.eventReward || '' : ''),
      name: name, pinHash: hash, classId: p.classId, level: p.level, exp: p.exp, gold: p.gold,
      equip: JSON.stringify(p.equip), inventory: JSON.stringify(p.inventory), cleared: p.cleared,
      bestGrades: JSON.stringify(p.bestGrades), playSec: p.playSec,
      createdAt: createdAt, updatedAt: now, saveCount: saveCount,
    });
    sh.getRange(row, 1, 1, headers.length).setValues([headers.map(function (h) { return rec[h] !== undefined ? rec[h] : ''; })]);
    return { ok: true, isNew: !found, savedAt: fmtTime_(now), saveCount: saveCount, player: publicPlayer_(rec), reward: reward };
  } finally {
    lock.releaseLock();
  }
}

/* ================= 랭킹 ================= */

/**
 * 던전 클리어 기록 등록. 저장된 캐릭터만 등록할 수 있다.
 * rec = { dungeonId, clearSec, hits, maxCombo, level }
 */
function submitRecord(name, pin, rec) {
  name = cleanName_(name);
  checkPin_(pin);
  rec = rec || {};
  const gd = loadGameData_();
  const cfg = gd.config;
  const dungeon = gd.dungeons.filter(function (d) { return d.id === rec.dungeonId; })[0];
  if (!dungeon) return { ok: false, message: '알 수 없는 던전입니다.' };

  const clearSec = Math.round(Number(rec.clearSec) * 10) / 10;
  const hits = Math.max(0, Math.floor(Number(rec.hits) || 0));
  const maxCombo = Math.max(0, Math.min(9999, Math.floor(Number(rec.maxCombo) || 0)));
  const level = Math.max(1, Math.min(Number(cfg.MAX_LEVEL) || 25, Math.floor(Number(rec.level) || 1)));

  if (!(clearSec > 0)) return { ok: false, message: '클리어 시간이 올바르지 않습니다.' };
  if (clearSec < dungeon.rooms * (Number(cfg.MIN_SEC_PER_ROOM) || 4)) return { ok: false, message: '비정상적으로 빠른 기록이라 등록할 수 없습니다.' };
  if (level < Number(dungeon.reqLevel)) return { ok: false, message: '입장 레벨보다 낮은 기록은 등록할 수 없습니다.' };

  const result = calcClearResult(dungeon, clearSec, hits, maxCombo, cfg);

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const found = findPlayer_(sheet_('Players'), name);
    if (!found) return { ok: false, needSave: true, message: '먼저 캐릭터를 저장해야 랭킹에 등록할 수 있습니다.' };
    if (found.rec.pinHash !== hashPin_(name, pin)) return { ok: false, message: 'PIN이 일치하지 않습니다.' };

    const sh = sheet_('Rankings');
    const headers = headers_(sh);
    const row = {
      time: new Date(), name: found.rec.name, classId: found.rec.classId, level: level,
      dungeonId: dungeon.id, dungeonName: dungeon.name, clearSec: clearSec, hits: hits,
      maxCombo: maxCombo, grade: result.grade, score: result.score,
    };
    sh.getRange(sh.getLastRow() + 1, 1, 1, headers.length).setValues([headers.map(function (h) { return row[h] !== undefined ? row[h] : ''; })]);
  } finally {
    lock.releaseLock();
  }

  CacheService.getScriptCache().remove(CACHE_RANK_KEY);
  const ranks = buildRankings_(gd);
  const key = name.toLowerCase();
  const dList = ranks.byDungeon[dungeon.id] || [];
  const myBest = dList.filter(function (r) { return r.name.toLowerCase() === key; })[0];
  return {
    ok: true,
    grade: result.grade,
    score: result.score,
    isBest: !!myBest && myBest.score === result.score,
    rankDungeon: indexOfName_(dList, key),
    rankOverall: indexOfName_(ranks.overall, key),
  };
}

function getRankings() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(CACHE_RANK_KEY);
  if (hit) return hit;
  const json = JSON.stringify(buildRankings_(loadGameData_()));
  try { cache.put(CACHE_RANK_KEY, json, 60); } catch (e) { /* 무시 */ }
  return json;
}

/** 클리어 등급·점수 계산 (Game.html 의 calcClearResult 와 같은 식) */
function calcClearResult(dungeon, clearSec, hits, maxCombo, cfg) {
  const par = Number(dungeon.rooms) * (Number(cfg.PAR_SEC_PER_ROOM) || 25);
  const ratio = clearSec / par;
  let pts = 100;
  if (ratio > 0.6) pts -= (ratio - 0.6) * 50;       // 느릴수록 감점
  pts -= hits * 1.5;                               // 맞을수록 감점
  pts += Math.min(maxCombo, 60) * 0.25;            // 콤보 가산 (최대 +15)
  pts = Math.max(0, Math.min(110, pts));
  const grade = pts >= 100 ? 'SSS' : pts >= 92 ? 'SS' : pts >= 84 ? 'S' : pts >= 74 ? 'A' : pts >= 64 ? 'B' : pts >= 52 ? 'C' : pts >= 40 ? 'D' : 'F';
  const score = Math.round((Number(dungeon.tier) || 1) * 1000 * (0.4 + pts / 100));
  return { grade: grade, score: score, pts: Math.round(pts) };
}

function buildRankings_(gd) {
  const top = Number(gd.config.RANK_TOP) || 20;
  const rows = readTable_(sheet_('Rankings'));
  const best = {};
  rows.forEach(function (r) {
    if (!r.name) return;
    const k = String(r.name).toLowerCase() + '|' + r.dungeonId;
    const s = Number(r.score) || 0;
    if (!best[k] || s > best[k].score || (s === best[k].score && Number(r.clearSec) < best[k].clearSec)) {
      best[k] = { name: String(r.name), classId: r.classId, level: Number(r.level), dungeonId: r.dungeonId, clearSec: Number(r.clearSec), hits: Number(r.hits), maxCombo: Number(r.maxCombo), grade: r.grade, score: s, time: r.time };
    }
  });
  const byDungeon = {};
  const total = {};
  Object.keys(best).forEach(function (k) {
    const r = best[k];
    (byDungeon[r.dungeonId] = byDungeon[r.dungeonId] || []).push(r);
    const nk = r.name.toLowerCase();
    const t = total[nk] || (total[nk] = { name: r.name, classId: r.classId, level: 0, score: 0, clears: 0 });
    t.score += r.score; t.clears += 1; t.level = Math.max(t.level, r.level);
  });
  Object.keys(byDungeon).forEach(function (d) {
    byDungeon[d].sort(function (a, b) { return b.score - a.score || a.clearSec - b.clearSec; });
    byDungeon[d] = byDungeon[d].slice(0, top);
  });
  const overall = Object.keys(total).map(function (k) { return total[k]; })
    .sort(function (a, b) { return b.score - a.score || b.level - a.level; }).slice(0, top);
  return { overall: overall, byDungeon: byDungeon, updatedAt: fmtTime_(new Date()) };
}

function indexOfName_(list, lowerName) {
  for (let i = 0; i < list.length; i++) if (list[i].name.toLowerCase() === lowerName) return i + 1;
  return 0; // 0 = 표시 범위 밖
}

/* ================= 관리자 ================= */

/**
 * PIN 초기화. 이름이 _ 로 끝나는 비공개 함수라 웹 앱(google.script.run)에서는 호출할 수 없고,
 * 시트 메뉴의 menuResetPin 에서만 부른다.
 */
function adminResetPin_(name, newPin) {
  name = cleanName_(name);
  checkPin_(newPin);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = sheet_('Players');
    const found = findPlayer_(sh, name);
    if (!found) return "'" + name + "' 캐릭터를 찾을 수 없습니다.";
    const col = headers_(sh).indexOf('pinHash') + 1;
    sh.getRange(found.row, col).setValue(hashPin_(found.rec.name, newPin));
    clearFail_(name);
    return "'" + found.rec.name + "'의 PIN을 초기화했습니다.";
  } finally {
    lock.releaseLock();
  }
}

/* ================= 내부 도우미 ================= */

function getSS_() {
  const id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { /* 아래로 */ } }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('스프레드시트를 찾을 수 없습니다. 시트 메뉴에서 초기 설정을 먼저 실행하세요.');
  return ss;
}

function sheet_(name) {
  const sh = getSS_().getSheetByName(name);
  if (!sh) throw new Error("'" + name + "' 시트가 없습니다. 초기 설정을 실행하세요.");
  return sh;
}

function headers_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

/** 1행 헤더를 키로 하는 객체 배열. 날짜는 문자열로 바꾼다 (google.script.run은 Date를 못 보냄) */
function readTable_(sh) {
  const v = sh.getDataRange().getValues();
  if (v.length < 2) return [];
  const h = v[0].map(String);
  const out = [];
  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (r[0] === '' || r[0] === null) continue;
    const o = {};
    for (let j = 0; j < h.length; j++) {
      if (!h[j]) continue;
      const val = r[j];
      o[h[j]] = (val instanceof Date) ? fmtTime_(val) : val;
    }
    out.push(o);
  }
  return out;
}

function findPlayer_(sh, name) {
  const last = sh.getLastRow();
  if (last < 2) return null;
  const headers = headers_(sh);
  const values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  const key = name.toLowerCase();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === key) {
      const rec = {};
      headers.forEach(function (h, j) { rec[h] = values[i][j]; });
      rec.name = String(rec.name);
      rec.pinHash = String(rec.pinHash);
      return { row: i + 2, rec: rec };
    }
  }
  return null;
}

function publicPlayer_(rec) {
  return {
    name: rec.name, classId: rec.classId, level: Number(rec.level) || 1, exp: Number(rec.exp) || 0,
    gold: Number(rec.gold) || 0, equip: parseJson_(rec.equip, {}), inventory: parseJson_(rec.inventory, []),
    cleared: Number(rec.cleared) || 0, bestGrades: parseJson_(rec.bestGrades, {}), playSec: Number(rec.playSec) || 0,
    updatedAt: rec.updatedAt instanceof Date ? fmtTime_(rec.updatedAt) : String(rec.updatedAt || ''),
    saveCount: Number(rec.saveCount) || 0,
    rewardVersion: rec.eventReward === EVENT_REWARD_ID ? 1 : 0,
    rewardPending: rec.eventReward !== EVENT_REWARD_ID && isEventRecipient_(rec.name),
  };
}

/** 브라우저가 보낸 저장 데이터를 믿을 수 있는 범위로 정리 */
function sanitizePlayer_(d, gd) {
  const maxLv = Number(gd.config.MAX_LEVEL) || 25;
  const invSize = Number(gd.config.INVENTORY_SIZE) || 30;
  const items = {};
  gd.items.forEach(function (it) { items[it.id] = it; });
  const cls = gd.classes.filter(function (c) { return c.id === d.classId; })[0] || gd.classes[0];
  const int = function (v, lo, hi) { v = Math.floor(Number(v) || 0); return Math.max(lo, Math.min(hi, v)); };

  const equip = {};
  ['weapon', 'armor', 'accessory'].forEach(function (slot) {
    const id = d.equip && d.equip[slot];
    equip[slot] = (id && items[id] && items[id].type === slot) ? id : '';
  });
  const inventory = [];
  (Array.isArray(d.inventory) ? d.inventory : []).forEach(function (s) {
    if (s && items[s.id] && inventory.length < invSize) inventory.push({ id: s.id, qty: int(s.qty, 1, 999) });
  });
  const bestGrades = {};
  gd.dungeons.forEach(function (dg) {
    const g = d.bestGrades && d.bestGrades[dg.id];
    if (GRADES.indexOf(g) >= 0) bestGrades[dg.id] = g;
  });
  return {
    classId: cls.id,
    level: int(d.level, 1, maxLv),
    exp: int(d.exp, 0, 1e9),
    gold: int(d.gold, 0, 999999999),
    equip: equip,
    inventory: inventory,
    cleared: int(d.cleared, 0, gd.dungeons.length),
    bestGrades: bestGrades,
    playSec: int(d.playSec, 0, 1e9),
  };
}

function cleanName_(name) {
  name = String(name || '').trim();
  if (!/^[가-힣A-Za-z0-9_]{2,12}$/.test(name)) throw new Error('이름은 한글·영문·숫자·_ 로 2~12자여야 합니다.');
  return name;
}

function checkPin_(pin) {
  if (!/^\d{4}$/.test(String(pin || ''))) throw new Error('PIN은 숫자 4자리여야 합니다.');
}

function getSalt_() {
  const props = PropertiesService.getScriptProperties();
  let salt = props.getProperty('PIN_SALT');
  if (!salt) { salt = Utilities.getUuid(); props.setProperty('PIN_SALT', salt); }
  return salt;
}

/** PIN 원문 대신 SHA-256 해시를 저장한다 (앞의 'h_'는 시트가 숫자로 바꾸지 않게 하려는 접두어) */
function hashPin_(name, pin) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    getSalt_() + '|' + String(name).toLowerCase() + '|' + pin, Utilities.Charset.UTF_8);
  return 'h_' + bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function isLocked_(name) {
  return Number(CacheService.getScriptCache().get('FAIL_' + name.toLowerCase()) || 0) >= 5;
}
function addFail_(name) {
  const c = CacheService.getScriptCache(), k = 'FAIL_' + name.toLowerCase();
  c.put(k, String(Number(c.get(k) || 0) + 1), 300);
}
function clearFail_(name) {
  CacheService.getScriptCache().remove('FAIL_' + name.toLowerCase());
}

function parseJson_(s, fallback) {
  if (s && typeof s === 'object') return s;
  try { return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; }
}

function fmtTime_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
}

/** 보상 대상은 발송 당시 확정한 명단으로만 확인합니다. */
function isEventRecipient_(name) {
  const sh = getSS_().getSheetByName(EVENT_REWARD_SHEET);
  return !!sh && readTable_(sh).some(function (r) {
    return String(r.name).toLowerCase() === String(name).toLowerCase() && r.eventId === EVENT_REWARD_ID;
  });
}

/** savePlayer의 잠금 안에서만 호출합니다. 잔액과 수령 표시는 같은 행 쓰기로 저장합니다. */
function applyEventReward_(name, p, claimedId, gd) {
  if (claimedId === EVENT_REWARD_ID || !isEventRecipient_(name)) return { claimed: false, pending: false };
  const inventory = p.inventory.map(function (s) { return { id: s.id, qty: s.qty }; });
  if (!['p_hp', 'p_mp'].every(function (id) { return gd.items.some(function (it) { return it.id === id && it.type === 'potion'; }); })) {
    return { claimed: false, pending: true, message: '보상 물약 설정을 확인해야 합니다. 관리자에게 문의하세요.' };
  }
  ['p_hp', 'p_mp'].forEach(function (id) {
    let qty = 100;
    inventory.forEach(function (slot) {
      if (slot.id !== id || qty <= 0 || slot.qty >= 99) return;
      const add = Math.min(qty, 99 - slot.qty); slot.qty += add; qty -= add;
    });
    while (qty > 0) { const add = Math.min(qty, 99); inventory.push({ id: id, qty: add }); qty -= add; }
  });
  if (inventory.length > (Number(gd.config.INVENTORY_SIZE) || 30) || p.gold > 999999999 - 5000) {
    return { claimed: false, pending: true, message: '이벤트 보상을 보관하고 있습니다. 인벤토리를 최대 4칸 비우고 골드 보유 한도를 확인한 뒤 다시 저장하세요.' };
  }
  p.gold += 5000;
  p.inventory = inventory;
  return { claimed: true, pending: false, message: '이벤트 보상으로 5,000골드와 HP·MP 포션 각 100개를 받았습니다.' };
}
