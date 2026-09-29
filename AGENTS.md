# AGENTS.md — AI 에이전트 작업 지침

이 저장소에서 작업하는 모든 AI 에이전트(Claude, Codex, Gemini, Copilot, Cursor 등)를 위한 지침입니다.
**작업을 시작하기 전에 이 파일 전체와 `docs/HANDOFF.md`를 먼저 읽으세요.**

---

## 0. 작업 시작 체크리스트

1. `docs/HANDOFF.md` — 직전 작업 상태, 미해결 이슈, 다음 할 일
2. `CHANGELOG.md` — 현재 배포 버전과 태그
3. `git status`, `git log --oneline -5` — 커밋 안 된 변경이 있는지
4. 작업 범위에 맞는 문서 — 목록은 `docs/README.md`
   - 구조·공식: `docs/ARCHITECTURE.md` / 함수·클래스·상태 다이어그램: `docs/DIAGRAMS.md`
   - 서버 API 명세: `docs/API.md` / DB(시트) 관계: `docs/ERD.md` / 컬럼 설명: `docs/DATA_SCHEMA.md`
   - 기능 흐름: `docs/USE_CASES.md`
5. 무엇을 바꿀지 사용자에게 확인이 필요한 결정이면 **코드를 고치기 전에** 묻기

## 1. 프로젝트 한 줄 요약

Google Apps Script 웹 앱으로 동작하는 던전앤파이터 스타일 횡스크롤 액션 RPG.
게임 데이터·캐릭터·랭킹은 Google 스프레드시트에, 전투 로직은 전부 브라우저(Canvas)에 있다.

| 항목 | 값 |
|---|---|
| 게임 주소 | https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec |
| 배포 ID (고정, 절대 바꾸지 말 것) | `YOUR_DEPLOYMENT_ID` |
| Script ID | `YOUR_SCRIPT_ID` (스프레드시트에 바인딩됨) |
| 스프레드시트 ID | `YOUR_SPREADSHEET_ID` |
| 소유자 | 운영 담당자 (로컬에서 별도 관리합니다) |
| 웹 앱 설정 | 실행 = 배포자(`USER_DEPLOYING`), 접근 = 모든 사용자(`ANYONE_ANONYMOUS`) — `src/appsscript.json` |
| 사용 언어 | UI 문구·주석·문서 모두 **한국어** |

## 2. 저장소 구조

```
.clasp.json      clasp 설정 (rootDir=src) — scriptId 변경 금지
src/             Apps Script에 올라가는 파일 전부 (clasp push 대상)
  appsscript.json  매니페스트
  Code.gs        서버 API (getGameData, login, savePlayer, submitRecord, getRankings) + 비공개 도우미(*_)
  Setup.gs       시트 메뉴·초기 설정 (onOpen, onEdit, setup, resetGameData ...)
  Data.gs        시트 초기값(SEED)과 Players/Rankings 헤더
  Index.html     페이지 뼈대 — <?!= include('X'); ?> 로 아래 파일을 끼워 넣음
  Style.html     CSS
  Api.html       google.script.run → Promise 래퍼 (로컬에선 모의 서버 호출)
  Render.html    그리기 전담 (SpriteSource, Renderer)
  Game.html      게임 로직 전체
tools/           로컬 개발 도구 (배포 안 됨)
docs/            에이전트·개발자용 문서 (docs/README.md가 목록)
```

## 3. 반드시 지킬 규칙 (위반 시 실서비스가 깨짐)

### 배포
- **`clasp create-deployment`는 항상 `-i <배포 ID>`와 함께** 쓴다 (`npm run deploy -- "설명"`). `-i` 없이 쓰면 게임 주소가 새로 생겨 공유된 링크가 옛 버전에 머문다.
- `clasp push`만으로는 게임 주소에 반영되지 않는다. 반영하려면 deploy까지 해야 한다.
- 배포는 **사용자가 요청했을 때만** 한다. push·deploy 전에 무엇을 올리는지 사용자에게 알린다.
- `~/.clasprc.json`(clasp 로그인 토큰)은 절대 읽어서 출력하거나 저장소에 넣지 않는다.
- 새 Apps Script 프로젝트를 만들 때 `clasp create-script --parentId`는 기존 시트에 붙지 않고 **새 스프레드시트를 만든다**. 프로젝트를 새로 만들지 말고 기존 scriptId를 쓴다.

### 데이터·저장 호환성
- 시트 **1행 영문 컬럼명은 코드가 키로 쓴다.** 이름을 바꾸거나 지우지 않는다. 새 컬럼은 추가만 한다.
- `Data.gs`(SEED)는 **빈 시트를 채우는 초기값일 뿐**이다. 실서비스 값은 시트에 있다. SEED를 바꿔도 이미 채워진 시트에는 반영되지 않는다(→ 5장 참고).
- `Players` 시트의 JSON 컬럼(`equip`, `inventory`, `bestGrades`)과 저장 필드는 **옛 저장 데이터도 읽을 수 있게** 바꾼다. `sanitizePlayer_`(Code.gs)와 `showLogin`의 로드 부분(Game.html)을 함께 확인한다.
- PIN 해시 방식(`hashPin_`: `'h_' + SHA-256(salt|소문자 이름|PIN)`)과 Script Properties의 `PIN_SALT`를 바꾸면 **모든 사용자의 PIN이 무효**가 된다. 바꾸지 않는다.
- `google.script.run`은 `Date` 객체를 돌려줄 수 없다. 서버에서 날짜는 `fmtTime_`로 문자열로 바꿔 보낸다.
- 시트에 쓰는 동작(저장·랭킹 등록·PIN 초기화)은 `LockService.getScriptLock()` 안에서 한다.

### 코드
- **클리어 등급 공식 `calcClearResult`는 `Code.gs`와 `Game.html` 두 곳에 똑같이 있다.** 하나를 바꾸면 반드시 다른 쪽도 같이 바꾼다. 랭킹 점수는 서버 값이 기준이다.
- **최상위 이름 충돌 금지**: 로컬 미리보기(`dist/preview.html`)는 서버 코드(.gs)와 클라이언트 코드(.html)를 한 페이지에 함께 넣는다. `src/` 전체에서 최상위 `const`/`let` 이름이 겹치면 SyntaxError로 미리보기가 멈춘다. (예: 서버 `GRADE_COLORS` vs 클라이언트 `GRADE_COLOR`는 일부러 다르게 지은 것)
- `src/*.html`에는 `<?`로 시작하는 문자열을 쓰지 않는다 (HtmlService 템플릿 구문과 충돌). `Index.html`의 include 구문만 예외.
- **전역 함수 공개 규칙**: Apps Script는 `_`로 끝나지 않는 모든 서버 전역 함수를 웹 앱에서 `google.script.run`으로 호출할 수 있게 한다(접근 = 모든 사용자). 내부 함수는 반드시 이름 끝에 `_`를 붙인다. 데이터를 바꾸는 관리자 기능은 `_` 비공개 함수로 두고, 시트 메뉴용 래퍼에서 `SpreadsheetApp.getUi()` 확인 뒤 호출한다 (`docs/API.md` 2.7).
- 외부 라이브러리·CDN을 추가하지 않는다. 순수 JS/CSS만 쓴다.
- 서버 호출은 1회에 0.5~2초가 걸린다. **전투 중에는 서버를 부르지 않는다.** 호출은 시작·저장·랭킹 때만.
- 키 입력은 `e.code`(물리 키)로 처리한다. 한글 입력기 상태에서도 동작해야 하므로 `e.key`로 바꾸지 않는다.
- 그래픽은 `Render.html`만 책임진다. 게임 로직(Game.html)에 그리기 세부 코드를 늘리지 않는다. 이미지 교체는 `SpriteSource.get()`에서.
- 사용자에게 보이는 문구는 한국어. 스킬·몬스터·던전 이름은 원작(던전앤파이터) IP를 쓰지 않는다.

## 4. 작업 흐름

```bash
npm test                 # 서버 로직 테스트 (Node만 있으면 됨) — 항상 통과해야 함
npm run build            # dist/preview.html 생성 → 브라우저로 열어 직접 확인
npm run test:e2e         # 자동 플레이 테스트 (Playwright 필요, 선택)
node tools/balance.test.js   # 난이도 시뮬레이션 (Playwright 필요, 밸런스 수정 시)
npm run push             # (사용자 승인 후) Apps Script 업로드
npm run deploy -- "v1.x.y 설명"   # (사용자 승인 후) 같은 주소로 배포 → 출력의 @번호 기록
```

### 완료 조건 (Definition of Done)
- [ ] `npm test` 통과, `npm run build` 성공
- [ ] 화면·조작을 바꿨으면 `dist/preview.html`에서 직접 확인 (가능하면 e2e도)
- [ ] 서버 함수를 추가·변경했으면 `tools/server.test.js`에 테스트 추가
- [ ] 데이터 컬럼을 바꿨으면 `Data.gs` + `docs/DATA_SCHEMA.md` + 실서비스 시트 반영 방법 안내
- [ ] 배포했으면 `CHANGELOG.md`에 `태그 | @번호 | 날짜 | 내용` 추가, `package.json` version 갱신, `git tag -a vX.Y.Z`
- [ ] 관련 문서 갱신 (`docs/README.md`의 문서 갱신 규칙 표)
- [ ] **`docs/HANDOFF.md` 갱신** (8장)
- [ ] 커밋 메시지는 한국어, 첫 줄에 무엇을 왜 바꿨는지

### 버전 규칙
- `MAJOR`: 저장 데이터 호환이 깨지는 변경 (가급적 피함)
- `MINOR`: 기능 추가 (새 직업, 새 던전, 새 화면)
- `PATCH`: 버그 수정, 밸런스·문구 조정

## 5. 시트(실서비스 데이터)를 바꿔야 할 때

에이전트는 보통 시트에 직접 접근할 수 없다. 다음 중 하나로 처리하고 사용자에게 명확히 안내한다.

| 상황 | 방법 |
|---|---|
| 기존 행 값 조정 (밸런스) | 사용자에게 시트에서 고칠 셀을 표로 안내 + `Data.gs`에도 같은 값 반영 |
| 새 행 추가 (아이템·몬스터 등) | 위와 같음. 시트 수정 시 `onEdit`가 캐시를 자동으로 비움 |
| 새 컬럼 추가 | 코드는 컬럼이 **없어도** 기본값으로 동작하게 작성 → 사용자가 시트 끝에 컬럼 추가 |
| 데이터 시트 전체 교체 | 시트 메뉴 `게임 데이터를 초기값으로 되돌리기` (Players·Rankings는 유지, 시트에서 직접 고친 값은 사라짐 — 사용자 확인 필수) |

`Players`, `Rankings` 시트는 사용자 데이터다. 어떤 경우에도 지우거나 덮어쓰는 코드를 만들지 않는다.

## 6. 자주 하는 작업 → 수정 위치

| 작업 | 파일 · 함수 |
|---|---|
| 몬스터·아이템·던전 수치 | 시트 + `Data.gs` SEED |
| 새 스킬 종류(type) | `Game.html` `trySkill`(지속시간 표) + `runSkill`(switch) + Skills 시트 |
| 새 직업 | Classes·Skills 행 추가만으로 동작. 전용 무기 그림이 필요하면 `Render.html` `drawWeapon` |
| 몬스터 AI·보스 패턴 | `Game.html` `updateMob`(패턴 선택) + `runMobAction`(패턴 실행) |
| 데미지·방어 공식 | `damageMob`(플레이어→몬스터), `hurtPlayer`(몬스터→플레이어) |
| 경험치·레벨업 | `gainExp`, `onLevelUp`, Levels 시트 |
| 드롭 | `rollDrops`, `spawnDrop`, Items 시트 `dropDungeon`/`dropRate` |
| 클리어 등급·점수 | `calcClearResult` (**Code.gs와 Game.html 둘 다**) |
| 마을 메뉴 항목 | `showTown`의 `items` 배열 |
| 새 화면 | `setScreen(name, html, onKey)` + `makeList` 패턴 따라 `showXxx` 함수 추가 |
| HUD | `drawHud` |
| 배경·이펙트·그림 | `Render.html` |
| 저장 필드 추가 | `exportP`(Game) → `sanitizePlayer_`·`publicPlayer_`(Code) → `PLAYER_HEADERS`(Data) → Players 시트 컬럼 |
| 랭킹 규칙 | `submitRecord`, `buildRankings_` (Code.gs) |
| 시트 메뉴 | `onOpen` (Setup.gs) |

## 7. 알려진 제약

- 로그인이 없는 구조라 부정 방지가 완벽하지 않다 (서버는 범위 검사와 최소 클리어 시간만 확인).
- 이모지가 바라보는 방향은 OS·폰트마다 다르다 → 시트 `emojiFacing` 컬럼으로 보정.
- 웹 앱은 iframe 안에서 열린다. 키가 먹지 않으면 화면을 클릭해야 한다(안내 문구 있음).
- CacheService 값 한도는 100KB. 게임 데이터가 커지면 캐시가 조용히 생략된다(동작은 함).
- `tools/GasMock.js`는 Sheets의 숫자 자동 변환을 흉내 내지 않는다. 숫자처럼 보이는 문자열(이름 "1234" 등)은 실서비스에서 따로 확인.

## 8. 인수인계 (작업 종료 시 필수)

작업을 마치거나 중단할 때 **`docs/HANDOFF.md`의 "현재 상태"를 최신으로 고치고, "작업 기록" 맨 위에 항목을 추가**한다. 형식은 파일 안의 템플릿을 따른다. 다음 에이전트는 대화 기록 없이 이 파일만 보고 이어서 작업한다고 가정하고 쓴다.

- 무엇을 바꿨는지 (파일·함수 단위)
- 배포했는지, 했다면 `@번호`와 태그
- 사용자에게 받은 결정 사항 (왜 그렇게 했는지)
- 끝내지 못한 일, 알려진 문제, 다음에 할 일
- 사용자가 시트에서 직접 해야 하는 작업이 남아 있는지
