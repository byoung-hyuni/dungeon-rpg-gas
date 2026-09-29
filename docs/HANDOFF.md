# 인수인계 (HANDOFF)

다음에 작업할 사람·AI 에이전트가 **대화 기록 없이 이 파일만 보고** 이어서 작업할 수 있도록 유지합니다.
작업을 마칠 때마다 "현재 상태"를 고치고, "작업 기록" **맨 위에** 새 항목을 추가하세요. (규칙은 `AGENTS.md` 8장)

---

## 새 에이전트에게 줄 첫 메시지 (복사해서 사용)

```
이 저장소는 Google Apps Script로 만든 RPG 게임입니다.
먼저 AGENTS.md와 docs/HANDOFF.md를 끝까지 읽고, 현재 상태와 규칙을 요약해 주세요.
그다음 이번 작업: <여기에 요청 내용>
배포(clasp push / deploy)는 제가 승인한 뒤에만 하고, 작업이 끝나면 docs/HANDOFF.md를 갱신해 주세요.
```

---

## 현재 상태

| 항목 | 값 |
|---|---|
| 마지막 갱신 | 2026-09-29 |
| 배포 버전 | `v1.0.0` = Apps Script `@1` (게임 주소는 AGENTS.md 1장) |
| main 브랜치 | `v1.0.1` 보안 수정 커밋됨 — **아직 배포 안 됨** (배포 @1은 수정 전 코드) |
| 원격 저장소 | 아직 없음 (GitHub 비공개 저장소 권장 — `.clasp.json`에 scriptId 포함) |
| 테스트 | `npm test` 통과 |

### 결정 사항 (사용자 확인 완료 — 바꾸려면 먼저 사용자에게 물을 것)
- 그래픽: 이모지 기반. 나중에 이미지로 교체할 수 있게 `Render.html`에 분리
- 직업: 검사 1개로 시작 (시트에 행 추가로 확장)
- 실행 형태: 웹 앱, 접근 권한 **모든 사용자(로그인 없이)**
- 로그인: 이름 + PIN 4자리. **자동 저장 없음** — 마을의 `💾 저장하기`를 눌러야 저장되고, 이때 PIN(해시)이 함께 저장됨
- 사용 형태: 여러 명이 각자 플레이 (한 화면 동시 접속·멀티플레이 아님)
- 최대 레벨 25, 던전 5개 (레벨 + 이전 던전 클리어로 입장)
- 원작(던전앤파이터) 이름은 쓰지 않고 분위기만 참고
- 버전 관리: git 태그 ↔ Apps Script 배포 번호를 `CHANGELOG.md`에 짝지어 기록, 게임 주소 고정

### 미해결 · 확인 필요
- [ ] **v1.0.1 보안 수정 배포** — 사용자 승인 후 `npm run push` → `npm run deploy -- "v1.0.1 관리자 함수 웹 앱 호출 차단"` → CHANGELOG에 @번호 기록, `package.json` version 1.0.1, `git tag -a v1.0.1`
- [ ] 커밋 작성자가 Mac 전역 설정(AnByoungHyun / 개인 Gmail)으로 기록됨 — 회사 메일로 바꿀지 사용자 결정 대기
- [ ] 첫 배포 시도 때 남은 것 정리: 로컬 `_to_delete/` 폴더, Drive의 빈 스프레드시트 「던전마스터 RPG DB」, Apps Script 「제목 없는 프로젝트」(standalone, 미사용)
- [ ] GitHub 원격 저장소 연결

### 알려진 문제 · 개선 후보
- 밸런스(봇 시뮬레이션 기준): 각 던전 입장 레벨에서 버려진 광산(d2)·얼음 협곡(d4)이 가장 어렵고, 초록안개 숲(d1)은 SSS가 쉽게 나옴
- 이모지 방향이 OS마다 다를 수 있음 (시트 `emojiFacing`으로 보정)
- 부정 방지는 서버 범위 검사 수준
- `package.json`에 Playwright 의존성이 없음 — e2e·밸런스 테스트는 전역 설치된 Playwright를 찾음

---

## 작업 기록

<!-- 새 항목은 이 줄 바로 아래에 추가. 템플릿:
### YYYY-MM-DD — 작업 제목 (작업자: 이름 또는 에이전트명)
- 요청: 사용자가 요청한 내용
- 변경: 파일 · 함수 단위로
- 배포: 안 함 / vX.Y.Z = @N
- 결정: 사용자에게 확인받은 내용과 이유
- 남은 일: 끝내지 못한 일, 사용자가 시트에서 해야 할 일
-->

### 2026-09-29 — 개발·유지보수 산출물 추가 + 보안 수정 (작업자: Claude)
- 요청: DB 스키마, 함수·클래스 다이어그램, API 호출 정보, 유스케이스 등 산출물을 AI가 쉽게 파악할 수 있게 작성
- 변경: `docs/ERD.md`, `docs/DIAGRAMS.md`, `docs/API.md`, `docs/USE_CASES.md`, `docs/README.md`(문서 목록·갱신 규칙). Mermaid 다이어그램 13개는 mermaid 11로 렌더링 검증함
- 발견·수정(v1.0.1): API 문서를 쓰다가 `_`로 끝나지 않는 전역 함수는 웹 앱에서 누구나 호출할 수 있다는 점 확인 → `adminResetPin`을 `adminResetPin_`로 비공개 처리, `resetGameData`는 시트 메뉴 확인 창 없이는 실행 안 되게 수정, 테스트 추가
- 배포: 안 함 (사용자 승인 대기)

### 2026-09-29 — AI 에이전트용 지침 추가 (작업자: Claude)
- 요청: 다른 AI 에이전트로 유지보수할 때도 정보가 온전히 이어지도록 전용 지침 작성
- 변경: `AGENTS.md`(공통 지침), `CLAUDE.md`·`GEMINI.md`·`.github/copilot-instructions.md`(AGENTS.md로 안내), `docs/ARCHITECTURE.md`, `docs/DATA_SCHEMA.md`(+ 생성 스크립트 `tools/gen-schema.js`), `docs/HANDOFF.md`
- 배포: 안 함 (코드 변경 없음)

### 2026-09-29 — 기준 버전 v1.0.0, 로컬 git 저장소 생성 (작업자: Claude)
- 변경: 폴더를 `src/`(clasp rootDir) · `tools/` 구조로 정리, `package.json`·`.gitignore`·`CHANGELOG.md` 추가, 태그 `v1.0.0`
- 확인: Apps Script 배포 @1 코드를 `clasp pull --versionNumber 1`로 받아 `src/`와 9개 파일 모두 동일함을 확인

### 2026-09-29 — 첫 배포 (작업자: Claude)
- clasp로 스프레드시트 바인딩 프로젝트 생성 → push → 웹 앱 배포 @1 → `setup()` 실행해 시트 생성
- 첫 시도는 standalone 프로젝트로 만들어져 `setup()`이 `getActiveSpreadsheet()` null 오류 → 바인딩 프로젝트로 다시 만들고, `setup`/`resetGameData`가 `getSS_()`로 대체하도록 수정
- 주의: `clasp create-script --parentId`는 지정한 시트에 붙지 않고 새 스프레드시트를 만들었음

### 2026-09-29 — 게임 최초 구현 (작업자: Claude)
- 서버(Code/Setup/Data.gs), 클라이언트(Index/Style/Api/Render/Game.html), 로컬 미리보기·테스트 도구 작성
- 검증: 서버 테스트, Playwright 자동 플레이(던전 클리어·랭킹 등록·사망/부활·재로그인), 던전별 밸런스 시뮬레이션
