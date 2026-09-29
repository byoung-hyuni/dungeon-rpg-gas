// docs/DATA_SCHEMA.md 를 src/Data.gs 의 헤더·메모로부터 다시 만든다: node tools/gen-schema.js
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = vm.createContext({ Math });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/Data.gs'), 'utf8') +
  '\n;this.__out = { SEED, PLAYER_HEADERS, PLAYER_NOTES, RANK_HEADERS, RANK_NOTES };', ctx);
const { SEED, PLAYER_HEADERS, PLAYER_NOTES, RANK_HEADERS, RANK_NOTES } = ctx.__out;
const esc = s => String(s).replace(/\|/g, '\\|');
const table = (h, n) => '| 컬럼 | 설명 |\n|---|---|\n' + h.map((k, i) => '| `' + k + '` | ' + esc(n[i] || '') + ' |').join('\n');
const role = {
  Config: '게임 전체 설정 (key-value). 코드에서 `CFG.키`로 읽음',
  Levels: '레벨별 필요 경험치·기본 능력치. 행 수 = 최대 레벨',
  Classes: '직업. 행 추가 시 직업 선택 화면에 자동 표시',
  Skills: '스킬. `classId`로 직업과 연결',
  Dungeons: '던전. `tier` 순으로 정렬해 표시',
  Monsters: '일반 몬스터와 보스',
  Items: '장비·소모품',
};
let md = '# 시트 데이터 구조 (DATA_SCHEMA)\n\n> 이 파일은 `node tools/gen-schema.js`로 `src/Data.gs`에서 자동 생성합니다. 직접 고치지 말고 Data.gs의 headers/notes를 고친 뒤 다시 생성하세요.\n\n' +
  '- 1행 = 코드가 쓰는 영문 컬럼명 (변경·삭제 금지, 추가만 가능)\n- 헤더 셀 메모 = 아래 설명과 같은 내용\n- 게임 데이터 시트는 시트 값이 실서비스 기준이고, Data.gs는 초기값입니다.\n\n';
Object.keys(SEED).forEach(n => {
  const s = SEED[n];
  md += '## ' + n + '\n\n' + (role[n] || '') + ' · 초기 행 ' + s.rows.length + '개\n\n' + table(s.headers, s.notes) + '\n\n';
  if (n === 'Config') md += '| key | 초기값 | 설명 |\n|---|---|---|\n' + s.rows.map(r => '| `' + r[0] + '` | ' + esc(r[1]) + ' | ' + esc(r[2]) + ' |').join('\n') + '\n\n';
});
md += '## Players (게임이 기록)\n\n캐릭터 저장 데이터. `savePlayer`가 이름으로 행을 찾아 덮어씀. 이름·해시·JSON 열은 텍스트 서식(@).\n\n' + table(PLAYER_HEADERS, PLAYER_NOTES) +
  '\n\nJSON 예시\n\n```json\n{ "equip": {"weapon":"w_rusty","armor":"a_cloth","accessory":""},\n  "inventory": [{"id":"p_hp","qty":5},{"id":"w_goblin","qty":1}],\n  "bestGrades": {"d1":"S","d2":"A"} }\n```\n\n';
md += '## Rankings (게임이 기록)\n\n클리어 기록을 한 줄씩 추가(삭제·수정 없음). 순위는 `buildRankings_`가 이름·던전별 최고 점수로 계산.\n\n' + table(RANK_HEADERS, RANK_NOTES) + '\n\n';
md += '## EventRecipients (이벤트 발송 명단)\n\n최초 발송 때 생성합니다. name은 소문자 사용자 이름, eventId는 이벤트 ID, sentAt은 발송 시각입니다. 재실행해도 명단을 확장하지 않습니다.\n\n';
md += '## 안내\n\n`setup()`이 만드는 설명용 시트. 코드가 읽지 않음.\n';
fs.mkdirSync(path.join(__dirname, '../docs'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../docs/DATA_SCHEMA.md'), md);
console.log('docs/DATA_SCHEMA.md written', md.length, 'chars');
