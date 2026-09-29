# 구조 설명 (ARCHITECTURE)

코드를 고치기 전에 전체 흐름을 파악하기 위한 문서입니다. 함수 이름은 실제 코드와 같습니다.

## 1. 전체 구성

```
[브라우저: Index.html]                         [Apps Script 서버: *.gs]          [스프레드시트]
 Style · Api · Render · Game  ── google.script.run ──▶  Code.gs  ──────────▶  Config ~ Items (게임 데이터)
   (전투·화면 전부 여기서 계산)   ◀── JSON 문자열/객체 ──   (CacheService)   ◀──  Players (캐릭터)
                                                        Setup.gs (메뉴)          Rankings (기록)
```

- 서버 호출 시점은 4가지뿐: **게임 시작**(`getGameData`), **로그인**(`login`), **저장**(`savePlayer`), **랭킹**(`submitRecord`, `getRankings`).
- `doGet`이 `Index.html`을 템플릿으로 평가하고, `include(name)`가 나머지 HTML 파일 내용을 끼워 넣는다.

## 2. 서버 (src/Code.gs, Setup.gs, Data.gs)

| 함수 | 역할 |
|---|---|
| `doGet()` | 웹 앱 진입점 |
| `getGameData()` | 데이터 시트 7개를 읽어 JSON 문자열로 반환. `CACHE_DATA_KEY`로 10분 캐시 |
| `login(name, pin)` | `{status:'ok', player}` / `'new'` / `'wrong_pin'` / `'locked'` (5회 실패 시 5분 잠금) |
| `savePlayer(name, pin, data, expectNew)` | 처음 저장 시 행 추가 + PIN 해시 기록, 이후엔 같은 PIN만 덮어쓰기 |
| `submitRecord(name, pin, rec)` | 저장된 캐릭터만 등록. 점수는 서버가 `calcClearResult`로 다시 계산 |
| `getRankings()` | 던전별 개인 최고 기록 + 종합(던전별 최고 점수 합). 60초 캐시 |
| `adminResetPin_(name, pin)` | 시트 메뉴의 PIN 초기화 (비공개 — 웹 앱에서 호출 불가) |
| `sanitizePlayer_` | 클라이언트가 보낸 저장 데이터를 범위·존재 여부로 정리 |
| `readTable_` | 1행 헤더를 키로 한 객체 배열. Date → 문자열 |
| `getSS_` | Script Properties `SS_ID` → 없으면 활성 스프레드시트 |
| `setup()` (Setup.gs) | 없는/빈 시트만 만들고 SEED로 채움. `SS_ID`, `PIN_SALT` 속성 생성 |
| `onEdit(e)` | 데이터 시트 수정 시 게임 데이터 캐시 삭제 (단순 트리거) |

Script Properties: `SS_ID`(스프레드시트 ID), `PIN_SALT`(PIN 해시 salt — **변경 금지**).

## 3. 클라이언트 (src/Game.html) — 파일 안 목차 순서

1. **기본 설정·유틸** — 상수 `W=960, H=540, FLOOR_TOP=305, FLOOR_BOTTOM=515, ROOM_W=1400, GRAVITY=1600`, 등급 색·경험치 배율, `calcClearResult`, `resize`
2. **캐릭터 데이터** — `buildIndex`, `calcStats`, `newCharacter`, 인벤토리(`invAdd`/`invRemoveAt`/`invUse`/`invCount`), `gainExp`, `isUnlocked`, `exportP`, `doSave`
3. **입력** — `Keys.down`(누르고 있는 키), `Keys.pressed`(이번 프레임에 눌린 키, 매 프레임 비움), 방향키 두 번 = 대시
4. **공통 UI** — `setScreen`, `toast`, `choice`/`confirmBox`(모달), `makeList`(↑↓/Enter 목록), `itemDetail`
5. **화면** — `showLogin` → `showClassSelect` → `showTown` → `showDungeonSelect` / `showShop` / `showInventory` / `showSkills` / `showRanking` / `showHelp`
6. **전투 엔진** — 아래 4장
7. **결과·사망·일시정지** — `showPause`, `showDead`/`revive`, `showResult`/`registerRank`
8. **그리기·메인 루프** — `renderRun`, `drawHud`, `frame`(requestAnimationFrame), `boot`

### 전역 상태
| 이름 | 내용 |
|---|---|
| `DATA`, `CFG`, `IDX` | 서버에서 받은 게임 데이터, Config 키-값, id별 색인 |
| `P` | 현재 캐릭터 = 저장되는 데이터 `{classId, level, exp, gold, equip, inventory, cleared, bestGrades, playSec}` |
| `S` | 세션 `{name, pin, saved, dirty, expectNew, lastSavedAt, saving, townSel}` |
| `screen` | 현재 화면 이름 (`'game'`일 때만 전투 갱신) |
| `RUN` | 진행 중인 던전 (아래) |

### 화면 전환 규칙
`setScreen(name, html, onKey)`로 DOM 오버레이(`#ui`)를 교체하고 키 처리 함수를 등록한다. 모달이 열려 있으면 `modalHandler`가 키를 먼저 가져간다. 전투 중(`screen==='game'`)에는 키가 `Keys`로 간다.

## 4. 전투 엔진

### RUN 객체
`{ d(던전), tier, rooms, roomIdx, mobIds, time, hits, combo, comboT, maxCombo, kills, expGained, goldGained, itemsGot, mobs, projs, fx, drops, shake, hitStop, state, stateT, roomCleared, isBoss, player, result, submitted, startLevel }`

`state`: `'play'` → (`'fade'` 방 이동) → `'clear'`(보스 처치, 슬로모션 후 결과) / `'dead'` / `'pause'`

### 좌표계
- `x`: 방 안 가로 위치 (0 ~ ROOM_W), 카메라가 플레이어를 따라감
- `y`: 바닥 깊이 (FLOOR_TOP ~ FLOOR_BOTTOM) — 벨트스크롤의 앞뒤
- `z`: 공중 높이 (점프·띄우기). 화면 y = `y - z`
- 그리기 순서는 `y` 오름차순 정렬

### 한 프레임 (`updateRun(dt)`)
`updatePlayer` → 각 몬스터 `updateMob` → `separateMobs` → `updateProjs` → `updateDrops` → `updateFx` → 방 클리어 판정 → 문 통과 판정.
`hitStop`(타격 경직) 동안은 갱신을 멈추고, 그 사이 눌린 키는 보존한다.

### 플레이어
- 행동(`p.action`): `atk`(3연격) · `jatk`(점프 공격) · `back`(백스텝) · `skill`
- 기본 공격이 맞은 뒤에는 스킬로 캔슬 가능 (`updatePlayer`)
- 피격 후 무적 0.6초, 기본 공격은 끊기고 스킬은 유지(슈퍼아머)
- MP 자연 회복 초당 최대치의 1.5%

### 스킬 종류 (`Skills.type`, `runSkill`)
| type | 동작 | power 의미 |
|---|---|---|
| upper | 전방 적을 띄움 | 띄우는 힘(vz) |
| dash | 돌진하며 경로의 적 1회씩 타격, 무적 | 이동 거리 |
| spin | 주변 다단 히트 (`hits`회, `duration` 동안) | - |
| wave | 관통 투사체 | 속도 |
| buff | 공격력 증가 | 증가 % (`duration` 초) |
| slam | 전방 광역 + 띄움 + 화면 흔들림 | 밀어내는 힘 |
| ultimate | 방 안 모든 적 `hits`회, 시전 중 무적 | - |

### 공식
- 플레이어 → 몬스터: `max(1, (공격력 × (1+광폭화%) × 스킬배율 − 몬스터방어 × 0.5) × 0.9~1.1)`, 치명타 ×1.5 (`damageMob`)
- 몬스터 → 플레이어: `max(1, (몬스터공격 × 패턴배율 − 플레이어방어 × 0.5) × 0.9~1.1)` (`hurtPlayer`)
- 능력치: Levels 행 × Classes 배율 + 장비 합 (`calcStats`)
- 클리어 등급: `calcClearResult` — 기준시간 = 방 수 × `PAR_SEC_PER_ROOM`. 100점에서 (시간비율−0.6)×50, 피격×1.5 감점, 콤보×0.25(최대 +15) 가산. SSS≥100, SS≥92, S≥84, A≥74, B≥64, C≥52, D≥40, F. 점수 = 단계×1000×(0.4+점수/100)
- 클리어 보너스 경험치 = `clearExp` × 등급 배율(SSS 1.5 ~ F 0.8) × `EXP_RATE`

### 몬스터 AI (`updateMob`, `runMobAction`)
| ai | 행동 |
|---|---|
| melee | 사거리까지 접근 → 0.45초 예고(!) → 근접 공격 |
| charger | 같은 줄에 서면 예고 후 돌진 |
| ranged | 거리 유지 → 예고 후 투사체(`projectile` 이모지) |
| boss | 슈퍼아머. 패턴 무작위: 근접 / 장판(빨간 원 0.95초 예고, ×1.5) / 돌진(×1.2) / 3연 투사체(×0.8). HP 40% 미만 분노: 쿨타임 ×0.7, 속도 ×1.25 |

### 방·던전 진행
`enterRoom(i)`: 일반 방은 `mobsPerRoom + floor(i/2)`마리, 마지막 방은 보스 + 졸개(최대 2). 모두 처치하면 오른쪽 문이 열리고, 방을 떠날 때 남은 드롭은 자동으로 줍는다. 보스는 장비를 최소 1개 떨어뜨린다.

## 5. 그리기 (src/Render.html)

- `SpriteSource.get(emoji, size, variant)` — 이모지를 캔버스에 그려 캐시. `variant='white'`는 피격 번쩍임용. **이미지로 바꿀 때 이 함수만 수정.**
- `Renderer.drawBackground / drawTown / drawActor / drawWeapon / drawProjectile / drawDrop / drawDoor / drawEffects / bar / skillSlot`
- 이펙트(`RUN.fx`) 종류: `text`(데미지 숫자) · `slash` · `ring` · `tele`(보스 장판 예고) · `spark` · `banner`(화면 중앙 큰 글씨)
- `emojiFacing`: 이모지가 원래 보는 방향. `facing`(1=오른쪽)과 다르면 좌우 반전

## 6. 로컬 개발 도구 (tools/)

- `GasMock.js`: SpreadsheetApp·CacheService·PropertiesService·LockService·Utilities 흉내. 브라우저에선 localStorage에 시트 저장
- `build.js`: `Index.html`의 include를 풀고, 모의 서버(.gs 3개 + GasMock)를 함께 넣어 `dist/preview.html` 생성 → `google`이 없으면 `Api`가 같은 이름의 전역 함수를 호출
- `server.test.js`: 실제 .gs 코드를 Node `vm`에서 GasMock 위에 실행 (setup·로그인·저장·PIN 잠금·랭킹·데이터 참조 무결성)
- `e2e.test.js`: Playwright로 미리보기를 열고 봇이 던전을 클리어 → 랭킹 등록 → 사망·부활 → 재로그인까지 확인. `tools/shots/`에 스크린샷
- `balance.test.js`: 각 던전 입장 레벨·기본 장비로 봇 플레이, 시간·피격·사망 수 출력

## 신규 직업과 보상 처리

검사·격투가·거너는 기존 스킬 타입 7개를 공유합니다. 격투가는 지상 기본 공격 사거리 75px, 공격 시간 0.22/0.22/0.32초를 사용합니다. 거너는 사거리 460px, 속도 900px/초의 단일 대상 기본 탄환을 발사하며 공격 시간은 0.32/0.32/0.42초입니다. 거너 기본 공격은 MP를 소모하지 않습니다. 장비 능력치는 기존 공용 장비 계산을 따릅니다.

이벤트 지급은 `EventRecipients` 명단과 `Players.eventReward` 수령 기록으로 관리합니다. 추가 서버 호출 없이 저장할 때 보상을 반영합니다. `doSave`는 저장 응답의 캐릭터를 적용하며, 저장 중에는 키·클릭 입력을 막아 응답 대기 중 진행이 덮어써지지 않도록 합니다. 상세 조건은 [신규 직업·이벤트 안내](NEW_CLASSES_EVENT.md)에 있습니다.
