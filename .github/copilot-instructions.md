# Copilot 지침

이 저장소의 작업 지침은 루트의 `AGENTS.md`에 있습니다. 작업 전에 `AGENTS.md`와 `docs/HANDOFF.md`를 읽고 그 규칙을 따르세요.

핵심 규칙:
- Google Apps Script 웹 앱. `src/`가 clasp rootDir. UI·주석은 한국어.
- `calcClearResult`는 `src/Code.gs`와 `src/Game.html`에 동일하게 유지.
- 시트 1행 컬럼명 변경 금지, 저장 데이터 하위 호환 유지, PIN 해시 방식 변경 금지.
- `src/` 전체에서 최상위 `const`/`let` 이름이 겹치지 않게 (로컬 미리보기가 한 페이지에 합침).
- 전투 중 서버 호출 금지, 외부 라이브러리 추가 금지, 키 입력은 `e.code` 사용.
