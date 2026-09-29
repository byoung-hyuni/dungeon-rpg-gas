# 던전 마스터 RPG (Google Apps Script)

던전앤파이터 스타일의 횡스크롤 액션 RPG입니다. 게임 데이터·캐릭터·랭킹은 Google 스프레드시트에 저장되고, 웹 앱 주소 하나로 여러 명이 동시에 플레이할 수 있습니다.

| 항목 | 값 |
|---|---|
| 게임 주소 | 운영 URL은 로컬 설정에서 관리합니다. |
| 스프레드시트 | `.clasp.json`의 `parentId`를 로컬에서 관리합니다. |
| Apps Script 프로젝트 | `.clasp.json`의 `scriptId`를 로컬에서 관리합니다. |
| 배포 ID (고정) | `.deployment.local.json`의 `deploymentId`를 유지합니다. Git에 올리지 않습니다. |
| 기준 버전 | git 태그 `v1.0.0` = Apps Script 배포 버전 `@1` |

## 폴더 구성

```
dungeon-rpg-gas/
├─ .clasp.example.json  # 개인 설정을 만들 때 복사하는 예시입니다.
├─ .clasp.json          # 로컬 전용 clasp 설정입니다. Git에서 제외합니다.
├─ src/                 # Apps Script에 올라가는 파일 (clasp push 대상)
│  ├─ appsscript.json   # 매니페스트 (웹 앱: 실행=배포자, 접근=모든 사용자)
│  ├─ Code.gs           # 서버: 데이터 로드, 로그인, 저장, 랭킹
│  ├─ Setup.gs          # 시트 자동 생성, 관리자 메뉴
│  ├─ Data.gs           # 초기 게임 데이터 (레벨·스킬·던전·몬스터·아이템)
│  ├─ Index.html        # 웹 페이지 뼈대
│  ├─ Style.html        # 화면 스타일
│  ├─ Api.html          # 서버 호출 래퍼
│  ├─ Render.html       # 그리기 담당 (이모지 → 이미지 교체 지점)
│  └─ Game.html         # 게임 로직 전체
├─ tools/               # 로컬 개발 도구 (배포되지 않음)
│  ├─ build.js          # dist/preview.html 생성
│  ├─ GasMock.js        # Apps Script 서비스 모의 객체 (미리보기·테스트용)
│  ├─ server.test.js    # 서버 로직 테스트 (Node)
│  ├─ e2e.test.js       # 브라우저 자동 플레이 테스트 (Playwright)
│  ├─ balance.test.js   # 던전별 난이도 시뮬레이션 (Playwright)
│  └─ gen-schema.js     # docs/DATA_SCHEMA.md 생성
├─ docs/                # 구조·데이터·인수인계 문서
├─ AGENTS.md            # AI 에이전트 공통 지침 (CLAUDE.md·GEMINI.md가 여기로 안내)
├─ CHANGELOG.md         # 버전별 변경 이력 (git 태그 ↔ 배포 버전)
└─ package.json         # npm 명령 모음
```

## AI 에이전트로 유지보수할 때

`AGENTS.md`(공통 지침)와 `docs/HANDOFF.md`(현재 상태·작업 기록)를 먼저 읽게 하세요. Claude Code는 `CLAUDE.md`, Gemini는 `GEMINI.md`, Copilot은 `.github/copilot-instructions.md`를 자동으로 읽고 모두 `AGENTS.md`로 안내됩니다. 새 세션에 줄 첫 메시지 예시는 `docs/HANDOFF.md` 맨 위에 있습니다.

| 문서 | 내용 |
|---|---|
| `AGENTS.md` | 규칙, 작업 흐름, 완료 조건, 작업→수정 위치 표 |
| `docs/ARCHITECTURE.md` | 서버·클라이언트 구조, 전투 엔진, 공식 |
| `docs/DATA_SCHEMA.md` | 시트 컬럼 설명 (`npm run schema`로 Data.gs에서 재생성) |
| `docs/HANDOFF.md` | 현재 상태, 결정 사항, 미해결 이슈, 작업 기록 |
| `docs/DIAGRAMS.md` | 함수·클래스 다이어그램, 상태 전이, 호출 흐름 |
| `docs/API.md` | 서버 API 명세, 시퀀스 다이어그램 |
| `docs/ERD.md` | 스프레드시트 ER 다이어그램, 무결성 규칙 |
| `docs/USE_CASES.md` | 유스케이스 다이어그램·상세 흐름 |

## 로컬 운영 설정

공개 저장소에는 운영 URL, 프로젝트·스프레드시트·배포 ID, 인증 정보를 포함하지 않습니다.

처음 복제했다면 `.clasp.example.json`을 `.clasp.json`으로, `.deployment.example.json`을 `.deployment.local.json`으로 복사하고 본인 프로젝트의 값을 입력하세요. 기존 운영 환경에서는 원래 로컬 설정을 유지하세요. `npm run deploy`는 `DEPLOYMENT_ID` 환경 변수가 있으면 그 값을, 없으면 `.deployment.local.json` 값을 사용합니다. 설정이 없거나 예시 값이면 배포를 중단합니다.

커밋 전 `npm run check:public`을 실행하면 공개 이력에 운영 식별자나 인증 정보가 섞였는지 확인할 수 있습니다.

## 개발 흐름

필요한 것: Node.js, clasp (`npm i -g @google/clasp`, `clasp login`).

```bash
npm test            # 서버 로직 테스트
npm run build       # dist/preview.html 생성 → 더블클릭하면 배포 없이 미리보기
npm run push        # src/ 를 Apps Script에 업로드 (배포 주소에는 아직 반영 안 됨)
npm run deploy -- "v1.1.0 설명"   # 같은 게임 주소로 새 버전 배포
```

`npm run deploy`는 고정 배포 ID(`-i`)를 갱신하므로 게임 주소가 바뀌지 않습니다. `clasp create-deployment`를 `-i` 없이 쓰면 새 주소가 생기니 주의하세요.

### 버전 올리는 순서

1. 코드 수정 → `npm test`, `npm run build`로 미리보기 확인
2. `npm run push` → Apps Script 편집기에서 `배포 > 배포 테스트`로 확인 (선택)
3. `npm run deploy -- "v1.1.0 설명"` → 출력되는 `@번호` 확인
4. `CHANGELOG.md`에 `태그 | @번호 | 날짜 | 내용` 한 줄 추가
5. 커밋 후 태그: `git tag -a v1.1.0 -m "Apps Script @2"`

### 기준 버전으로 되돌리기

- 코드: `git checkout v1.0.0 -- src/` → `npm run push`
- 배포만 되돌리기: `clasp create-deployment -i <배포 ID> -V 1` (코드 변경 없이 게임 주소를 버전 @1로 돌림)

## 게임 방법

| 키 | 기능 |
|---|---|
| ← → ↑ ↓ | 이동 (같은 방향 두 번 = 대시) |
| X | 기본 공격 (연타 3연격, 공중에서 점프 공격) |
| C | 점프 |
| Z | 백스텝 (잠깐 무적) |
| A S D F G H Q | 스킬 (레벨에 따라 해금) |
| 1 / 2 | HP / MP 포션 |
| Esc | 일시정지·뒤로 |
| 마을에서 I / K / R / H | 인벤토리 / 스킬 / 랭킹 / 조작법 |

- **로그인**: 이름 + PIN 4자리. 처음이면 새 캐릭터가 만들어지고, **마을의 `💾 저장하기`를 눌러야 시트에 기록**됩니다. 이때 PIN이 함께 저장되며, 이후에는 같은 이름·PIN으로만 이어하기와 저장이 됩니다.
- **던전**: 방을 하나씩 정리하면 오른쪽 문이 열리고, 마지막 방에 보스가 있습니다. 입장 조건은 `레벨 + 이전 던전 클리어`입니다.

| 던전 | 입장 | 권장 | 보스 |
|---|---|---|---|
| 🌲 초록안개 숲 | Lv 1 | 1~5 | 👹 고블린 족장 |
| ⛏️ 버려진 광산 | Lv 5 | 5~10 | 🗿 광석 골렘 |
| 🌵 불타는 사막 | Lv 10 | 10~15 | 🧞 사막의 정령 |
| ❄️ 얼음 협곡 | Lv 15 | 15~20 | 🐻 설원 곰왕 |
| 🏰 마왕의 성 | Lv 20 | 20~25 | 🐉 흑룡 |

- **클리어 등급**(SSS~F): 클리어 시간, 피격 횟수, 최대 콤보로 계산합니다. 등급이 높을수록 클리어 보너스 경험치가 늘어납니다.
- **랭킹**: 결과 화면에서 `랭킹 등록`. 점수는 서버가 다시 계산합니다. 던전별 개인 최고 점수 순위와, 던전별 최고 점수를 합한 종합 순위가 있습니다.

## 시트로 게임 고치기 (재배포 불필요)

1행 헤더 셀에 마우스를 올리면 컬럼 설명(메모)이 보입니다. **1행의 영문 컬럼명은 바꾸지 마세요.**

- 몬스터 모습: `Monsters` 시트의 `emoji`
- 난이도: `Monsters`의 `hp/atk/def`, `Config`의 `EXP_RATE`·`DROP_RATE`
- 새 아이템: `Items`에 행 추가 (`shop=Y`면 상점 판매, `dropDungeon`·`dropRate`로 드롭)
- 새 직업: `Classes`에 행 추가 + `Skills`에 그 직업의 스킬 행 추가
- 이모지가 반대 방향을 보면: `emojiFacing`을 `L` ↔ `R`로 변경
- 초기값으로 되돌리기: 시트 메뉴 `🎮 던전 RPG > 게임 데이터를 초기값으로 되돌리기` (Players, Rankings는 유지)

시트 데이터는 git으로 관리되지 않습니다. 초기값은 `src/Data.gs`에 있으니, 시트에서 조정한 값을 기준으로 삼고 싶으면 `Data.gs`에도 옮겨 적어 커밋하세요.

## 관리

- **PIN 분실**: 시트 메뉴 `🎮 던전 RPG > 플레이어 PIN 초기화`
- **PIN 보안**: PIN 원문은 저장하지 않고 해시값만 `Players` 시트에 저장합니다. 5번 연속 틀리면 5분간 잠깁니다.
- **동시 접속**: 저장·랭킹 등록은 `LockService`로 순서대로 처리합니다.
- **부정 방지 한계**: 로그인이 없는 구조라 완벽하지 않습니다. 서버에서 레벨·골드·아이템 범위 검사와 비정상 클리어 시간 거부(`MIN_SEC_PER_ROOM`)만 합니다.

## 그래픽 교체 (이모지 → 이미지)

`src/Render.html`의 `SpriteSource.get(emoji, size, variant)`만 바꾸면 됩니다. 이 함수가 캔버스(또는 Image)를 돌려주면 나머지 그리기 코드는 그대로 동작합니다.

## 참고

- 전투는 모두 브라우저에서 계산하고, 서버는 시작·저장·랭킹 때만 호출합니다.
- 웹 앱은 iframe 안에서 열리므로 키가 안 먹으면 화면을 한 번 클릭하세요.
- 직업명·던전명·몬스터명은 원작 IP를 쓰지 않은 자체 이름입니다.
- 운영 식별자는 `.clasp.json`과 `.deployment.local.json`에서 관리합니다. 두 파일과 로그인 정보(`~/.clasprc.json`)는 Git에 올리지 않습니다.
