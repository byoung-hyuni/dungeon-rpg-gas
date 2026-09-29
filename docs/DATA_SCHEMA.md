# 시트 데이터 구조 (DATA_SCHEMA)

> 이 파일은 `node tools/gen-schema.js`로 `src/Data.gs`에서 자동 생성합니다. 직접 고치지 말고 Data.gs의 headers/notes를 고친 뒤 다시 생성하세요.

- 1행 = 코드가 쓰는 영문 컬럼명 (변경·삭제 금지, 추가만 가능)
- 헤더 셀 메모 = 아래 설명과 같은 내용
- 게임 데이터 시트는 시트 값이 실서비스 기준이고, Data.gs는 초기값입니다.

## Config

게임 전체 설정 (key-value). 코드에서 `CFG.키`로 읽음 · 초기 행 16개

| 컬럼 | 설명 |
|---|---|
| `key` | 설정 키 (코드에서 사용하므로 이름을 바꾸지 마세요) |
| `value` | 값 |
| `desc` | 설명 |

| key | 초기값 | 설명 |
|---|---|---|
| `GAME_TITLE` | 던전 마스터 | 게임 제목 |
| `MAX_LEVEL` | 25 | 최대 레벨 (Levels 시트 행 수와 맞추세요) |
| `START_GOLD` | 300 | 신규 캐릭터 시작 골드 |
| `START_WEAPON` | w_rusty | 신규 캐릭터 기본 무기 (Items id) |
| `START_ARMOR` | a_cloth | 신규 캐릭터 기본 갑옷 (Items id) |
| `START_ITEMS` | p_hp:5,p_mp:3 | 신규 캐릭터 기본 소지품 (id:개수, 쉼표 구분) |
| `EXP_RATE` | 1 | 경험치 배율 |
| `GOLD_RATE` | 1 | 골드 배율 |
| `DROP_RATE` | 1 | 아이템 드롭률 배율 |
| `BOSS_DROP_MUL` | 6 | 보스 처치 시 드롭률 배수 |
| `PAR_SEC_PER_ROOM` | 25 | 방 하나당 기준 클리어 시간(초) — 클리어 등급 계산 |
| `MIN_SEC_PER_ROOM` | 4 | 방 하나당 최소 시간(초) — 이보다 빠른 기록은 랭킹 등록 거부 |
| `REVIVE_COST_PER_TIER` | 50 | 부활 비용 = 값 × 던전 단계 |
| `INVENTORY_SIZE` | 30 | 인벤토리 칸 수 |
| `RANK_TOP` | 20 | 랭킹 표시 인원 |
| `CRIT_BASE` | 5 | 기본 치명타 확률(%) |

## Levels

레벨별 필요 경험치·기본 능력치. 행 수 = 최대 레벨 · 초기 행 25개

| 컬럼 | 설명 |
|---|---|
| `level` | 레벨 |
| `needExp` | 다음 레벨까지 필요한 경험치 (최대 레벨은 0) |
| `hp` | 최대 HP |
| `mp` | 최대 MP |
| `atk` | 공격력 |
| `def` | 방어력 |

## Classes

직업. 행 추가 시 직업 선택 화면에 자동 표시 · 초기 행 3개

| 컬럼 | 설명 |
|---|---|
| `id` | 직업 id |
| `name` | 직업명 |
| `emoji` | 표시 이모지 |
| `emojiFacing` | 이모지가 원래 바라보는 방향 (L/R) |
| `hpMul` | HP 배율 |
| `mpMul` | MP 배율 |
| `atkMul` | 공격력 배율 |
| `defMul` | 방어력 배율 |
| `speed` | 이동 속도(px/초) |
| `desc` | 설명 |

## Skills

스킬. `classId`로 직업과 연결 · 초기 행 21개

| 컬럼 | 설명 |
|---|---|
| `id` | 스킬 id |
| `classId` | 직업 id |
| `name` | 스킬명 |
| `emoji` | 아이콘 |
| `key` | 단축키 (A~Z 한 글자) |
| `reqLevel` | 습득 레벨 |
| `mp` | MP 소모 |
| `cooldown` | 쿨타임(초) |
| `dmgPct` | 1회 타격 데미지(공격력 대비 %) |
| `hits` | 타격 횟수 |
| `rangeX` | 전방 사거리(px) |
| `rangeY` | 위아래 판정 폭(px) |
| `type` | 종류: upper(띄우기) dash(돌진) spin(회전 다단히트) wave(투사체) buff(강화) slam(내려찍기) ultimate(각성기) |
| `power` | 종류별 수치: upper=띄우는 힘, dash=이동거리, wave=속도, buff=공격력 증가%, slam=밀어내는 힘 |
| `duration` | 지속 시간(초) |
| `desc` | 설명 |

## Dungeons

던전. `tier` 순으로 정렬해 표시 · 초기 행 5개

| 컬럼 | 설명 |
|---|---|
| `id` | 던전 id |
| `tier` | 난이도 단계(1~5) — 점수 계산 |
| `name` | 던전명 |
| `emoji` | 배경 이모지 |
| `reqLevel` | 입장 최소 레벨 |
| `prevDungeon` | 먼저 클리어해야 하는 던전 id (없으면 빈칸) |
| `recLevel` | 권장 레벨 (표시용) |
| `rooms` | 방 개수 (마지막 방이 보스방) |
| `mobsPerRoom` | 일반 방 기본 몬스터 수 |
| `monsters` | 등장 몬스터 id (쉼표 구분) |
| `bossId` | 보스 몬스터 id |
| `bgTop` | 배경 위쪽 색 |
| `bgBottom` | 바닥 색 |
| `clearExp` | 클리어 보너스 경험치 |
| `clearGold` | 클리어 보너스 골드 |
| `desc` | 설명 |

## Monsters

일반 몬스터와 보스 · 초기 행 15개

| 컬럼 | 설명 |
|---|---|
| `id` | 몬스터 id |
| `name` | 이름 |
| `emoji` | 이모지 |
| `emojiFacing` | 이모지가 원래 바라보는 방향 (L/R) |
| `hp` | HP |
| `atk` | 공격력 |
| `def` | 방어력 |
| `speed` | 이동 속도(px/초) |
| `exp` | 처치 경험치 |
| `gold` | 처치 골드 |
| `ai` | AI: melee(근접) charger(돌진) ranged(원거리) boss(보스) |
| `range` | 공격 사거리(px) |
| `attackCd` | 공격 간격(초) |
| `size` | 크기(px) |
| `projectile` | 원거리 공격 이모지 |
| `isBoss` | 보스 여부 (Y/N) |
| `desc` | 설명 |

## Items

장비·소모품 · 초기 행 32개

| 컬럼 | 설명 |
|---|---|
| `id` | 아이템 id |
| `name` | 이름 |
| `emoji` | 이모지 |
| `type` | 종류: weapon/armor/accessory/potion |
| `grade` | 등급: 일반/매직/레어/유니크/에픽 |
| `reqLevel` | 착용 레벨 |
| `atk` | 공격력+ |
| `def` | 방어력+ |
| `hp` | 최대HP+ |
| `mp` | 최대MP+ |
| `crit` | 치명타%+ |
| `healHp` | HP 회복(최대치 대비 %) |
| `healMp` | MP 회복(최대치 대비 %) |
| `price` | 상점 구매가 (판매가는 30%) |
| `shop` | 상점 판매 여부 (Y/N) |
| `dropDungeon` | 드롭 던전 id |
| `dropRate` | 몬스터 1마리당 드롭 확률(%) |
| `desc` | 설명 |

## Players (게임이 기록)

캐릭터 저장 데이터. `savePlayer`가 이름으로 행을 찾아 덮어씀. 이름·해시·JSON 열은 텍스트 서식(@).

| 컬럼 | 설명 |
|---|---|
| `name` | 캐릭터 이름 (고유) |
| `pinHash` | PIN 해시값 — PIN 원문은 저장하지 않습니다 |
| `classId` | 직업 id |
| `level` | 레벨 |
| `exp` | 현재 경험치 |
| `gold` | 골드 |
| `equip` | 착용 장비(JSON) |
| `inventory` | 인벤토리(JSON) |
| `cleared` | 클리어한 던전 수 |
| `bestGrades` | 던전별 최고 등급(JSON) |
| `playSec` | 누적 플레이 시간(초) |
| `createdAt` | 최초 저장 |
| `updatedAt` | 마지막 저장 |
| `saveCount` | 저장 횟수 |
| `eventReward` | 수령한 이벤트 ID (서버에서 관리합니다) |

JSON 예시

```json
{ "equip": {"weapon":"w_rusty","armor":"a_cloth","accessory":""},
  "inventory": [{"id":"p_hp","qty":5},{"id":"w_goblin","qty":1}],
  "bestGrades": {"d1":"S","d2":"A"} }
```

## Rankings (게임이 기록)

클리어 기록을 한 줄씩 추가(삭제·수정 없음). 순위는 `buildRankings_`가 이름·던전별 최고 점수로 계산.

| 컬럼 | 설명 |
|---|---|
| `time` | 등록 시각 |
| `name` | 캐릭터 이름 |
| `classId` | 직업 |
| `level` | 클리어 당시 레벨 |
| `dungeonId` | 던전 id |
| `dungeonName` | 던전명 |
| `clearSec` | 클리어 시간(초) |
| `hits` | 피격 횟수 |
| `maxCombo` | 최대 콤보 |
| `grade` | 클리어 등급 |
| `score` | 점수 (서버 계산) |

## EventRecipients (이벤트 발송 명단)

최초 발송 때 생성합니다. name은 소문자 사용자 이름, eventId는 이벤트 ID, sentAt은 발송 시각입니다. 재실행해도 명단을 확장하지 않습니다.

## 안내

`setup()`이 만드는 설명용 시트. 코드가 읽지 않음.
