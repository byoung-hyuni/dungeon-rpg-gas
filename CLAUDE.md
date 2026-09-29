# CLAUDE.md

이 저장소의 작업 지침은 **[AGENTS.md](AGENTS.md)** 에 있습니다. 작업 전에 반드시 읽으세요.

@AGENTS.md
@docs/HANDOFF.md

요약 (상세는 AGENTS.md):
- 먼저 `docs/HANDOFF.md`로 현재 상태 확인, 작업이 끝나면 같은 파일 갱신
- 배포는 사용자 승인 후 `npm run push` → `npm run deploy -- "설명"` (고정 배포 ID 유지, `-i` 없는 deploy 금지)
- `calcClearResult`는 Code.gs와 Game.html 두 곳을 함께 수정
- 시트 1행 컬럼명 변경 금지, Players/Rankings 데이터 삭제 금지, PIN 해시 방식 변경 금지
- 완료 전 `npm test`, `npm run build`
