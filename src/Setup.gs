/**
 * Setup.gs — 시트 생성·관리자 메뉴
 * ------------------------------------------------------------
 * 스프레드시트를 열면 상단에 [🎮 던전 RPG] 메뉴가 생깁니다.
 */

const GRADE_COLORS = { '일반': '#555555', '매직': '#1f7fbf', '레어': '#8a3ffc', '유니크': '#d4148a', '에픽': '#d98200' };

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎮 던전 RPG')
    .addItem('1) 초기 설정 (시트 생성)', 'setup')
    .addItem('게임 데이터를 초기값으로 되돌리기', 'resetGameData')
    .addSeparator()
    .addItem('캐시 비우기 (시트 수정 후 즉시 반영)', 'clearGameCache')
    .addItem('플레이어 PIN 초기화', 'menuResetPin')
    .addItem('웹 앱 주소 보기', 'showWebAppUrl')
    .addToUi();
}

/** 시트를 수정하면 게임 데이터 캐시를 비워 바로 반영되게 한다 (단순 트리거) */
function onEdit(e) {
  try {
    const name = e && e.range && e.range.getSheet().getName();
    if (DATA_SHEETS.indexOf(name) >= 0) CacheService.getScriptCache().remove(CACHE_DATA_KEY);
  } catch (err) { /* 무시 */ }
}

/** 최초 1회 실행: 없는 시트만 만들고 기본 데이터를 채운다. 기존 데이터는 건드리지 않는다. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || getSS_();
  PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());
  getSalt_(); // PIN 해시용 salt 생성

  ensureGuideSheet_(ss);
  Object.keys(SEED).forEach(function (name) { ensureSheet_(ss, name, SEED[name], false); });
  ensureSheet_(ss, 'Players', { headers: PLAYER_HEADERS, notes: PLAYER_NOTES, rows: [] }, false, [1, 2, 7, 8, 10]);
  ensureSheet_(ss, 'Rankings', { headers: RANK_HEADERS, notes: RANK_NOTES, rows: [] }, false, [2]);

  // 새 스프레드시트의 빈 기본 시트 정리
  ['Sheet1', '시트1'].forEach(function (n) {
    const sh = ss.getSheetByName(n);
    if (sh && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
  clearGameCache(true);
  notify_('초기 설정이 끝났습니다. 이제 [배포 > 새 배포 > 웹 앱]으로 게임을 배포하세요.');
}

/** 데이터 시트(Config~Items)를 SEED 값으로 덮어쓴다. Players/Rankings는 유지. */
function resetGameData() {
  let ok = true;
  try {
    const ui = SpreadsheetApp.getUi();
    ok = ui.alert('게임 데이터 초기화', 'Config·Levels·Classes·Skills·Dungeons·Monsters·Items 시트를 초기값으로 덮어씁니다.\n(Players, Rankings는 유지됩니다) 계속할까요?', ui.ButtonSet.YES_NO) === ui.Button.YES;
  } catch (e) { /* 편집기에서 실행하면 확인 없이 진행 */ }
  if (!ok) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet() || getSS_();
  Object.keys(SEED).forEach(function (name) { ensureSheet_(ss, name, SEED[name], true); });
  clearGameCache(true);
  notify_('게임 데이터를 초기값으로 되돌렸습니다.');
}

function clearGameCache(silent) {
  const c = CacheService.getScriptCache();
  c.remove(CACHE_DATA_KEY);
  c.remove(CACHE_RANK_KEY);
  if (silent !== true) notify_('캐시를 비웠습니다. 다음 접속부터 시트 값이 반영됩니다.');
}

function menuResetPin() {
  const ui = SpreadsheetApp.getUi();
  const r1 = ui.prompt('PIN 초기화', 'PIN을 초기화할 캐릭터 이름을 입력하세요.', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  const r2 = ui.prompt('PIN 초기화', '새 PIN 4자리를 입력하세요.', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  const res = adminResetPin(r1.getResponseText(), r2.getResponseText());
  ui.alert(res);
}

function showWebAppUrl() {
  let url = '';
  try { url = ScriptApp.getService().getUrl(); } catch (e) { /* 미배포 */ }
  notify_(url ? '웹 앱 주소:\n' + url : '아직 배포되지 않았습니다. [배포 > 새 배포 > 웹 앱]으로 배포하세요.');
}

/* ---------------- 내부 함수 ---------------- */

function notify_(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); }
}

/**
 * 시트가 없거나 비어 있으면(또는 overwrite=true) 헤더와 데이터를 쓴다.
 * textCols: 숫자로 자동 변환되면 안 되는 열 번호(1부터) — 이름, JSON 등
 */
function ensureSheet_(ss, name, def, overwrite, textCols) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (!overwrite && sh.getLastRow() > 0) return sh;

  sh.clear();
  const nCol = def.headers.length;
  (textCols || []).forEach(function (c) { sh.getRange(1, c, 1000, 1).setNumberFormat('@'); });
  const header = sh.getRange(1, 1, 1, nCol);
  header.setValues([def.headers]).setFontWeight('bold').setBackground('#2b2d42').setFontColor('#ffffff');
  if (def.notes) header.setNotes([def.notes]);
  sh.setFrozenRows(1);

  if (def.rows.length) {
    sh.getRange(2, 1, def.rows.length, nCol).setValues(def.rows);
    const gi = def.headers.indexOf('grade');
    if (gi >= 0) {
      def.rows.forEach(function (r, i) {
        sh.getRange(i + 2, gi + 1).setFontColor(GRADE_COLORS[r[gi]] || '#000000').setFontWeight('bold');
      });
    }
  }
  for (let c = 1; c <= nCol; c++) sh.autoResizeColumn(c);
  return sh;
}

function ensureGuideSheet_(ss) {
  if (ss.getSheetByName('안내')) return;
  const sh = ss.insertSheet('안내', 0);
  const rows = [
    ['던전 마스터 RPG — 시트 안내', ''],
    ['', ''],
    ['시트', '용도'],
    ['Config', '게임 전체 설정 (최대 레벨, 배율, 시작 골드 등)'],
    ['Levels', '레벨별 필요 경험치와 기본 능력치'],
    ['Classes', '직업. 행을 추가하면 캐릭터 생성 화면에 새 직업이 나타납니다'],
    ['Skills', '스킬. classId로 직업과 연결, key는 단축키'],
    ['Dungeons', '던전 5개. 입장 레벨·선행 던전·방 개수·등장 몬스터'],
    ['Monsters', '몬스터와 보스 능력치. emoji를 바꾸면 모습이 바뀝니다'],
    ['Items', '장비와 소모품. 등급·드롭 던전·드롭률·상점 판매 여부'],
    ['Players', '저장된 캐릭터 (게임이 자동 기록, PIN은 해시로 저장)'],
    ['Rankings', '던전 클리어 기록 (게임이 자동 기록)'],
    ['', ''],
    ['수정 팁', '헤더(1행) 셀에 마우스를 올리면 각 컬럼 설명이 보입니다. 1행의 영문 컬럼명은 바꾸지 마세요.'],
    ['반영 시점', '시트를 고치면 자동으로 캐시가 비워집니다. 반영이 안 되면 메뉴 > 캐시 비우기.'],
  ];
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.getRange(1, 1).setFontSize(16).setFontWeight('bold');
  sh.getRange(3, 1, 1, 2).setFontWeight('bold').setBackground('#2b2d42').setFontColor('#ffffff');
  sh.setColumnWidth(1, 140);
  sh.setColumnWidth(2, 560);
}
