# 문서 목록

AI 에이전트와 개발자가 코드를 파악하고 유지보수하기 위한 산출물입니다. 다이어그램은 Mermaid로 작성되어 GitHub에서 그림으로 보이고, AI는 텍스트로 바로 읽을 수 있습니다.

| 문서 | 내용 | 언제 읽나 |
|---|---|---|
| [../AGENTS.md](../AGENTS.md) | 작업 규칙, 금지 사항, 작업 흐름, 완료 조건 | **항상 먼저** |
| [HANDOFF.md](HANDOFF.md) | 현재 상태, 결정 사항, 미해결 이슈, 작업 기록 | **항상 먼저**, 작업 끝나면 갱신 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 전체 구조, 서버·클라이언트 역할, 전투 엔진, 공식 | 코드 수정 전 |
| [DIAGRAMS.md](DIAGRAMS.md) | 모듈 의존도, 서버·클라이언트 모듈 다이어그램, 게임 객체 클래스 다이어그램, 화면·던전 상태 전이, 메인 루프·타격 흐름 | 함수 위치·호출 관계 파악 |
| [API.md](API.md) | 서버 API 명세(인자·반환·오류·캐시·잠금), 시퀀스 다이어그램 | 서버 함수·클라이언트 호출 수정 |
| [ERD.md](ERD.md) | 스프레드시트 테이블 관계(ER 다이어그램), 무결성 규칙, 캐시·속성 키, 스키마 변경 절차 | 데이터 구조 수정 |
| [DATA_SCHEMA.md](DATA_SCHEMA.md) | 시트별 컬럼 설명 전체 (자동 생성: `npm run schema`) | 컬럼 의미 확인 |
| [USE_CASES.md](USE_CASES.md) | 액터, 유스케이스 다이어그램, 유스케이스별 흐름·예외·관련 함수, 비기능 요구사항 | 기능 추가·변경, 테스트 시나리오 작성 |
| [../CHANGELOG.md](../CHANGELOG.md) | 버전별 변경 이력 (git 태그 ↔ Apps Script 배포 번호) | 배포 시 |

## 문서 갱신 규칙

코드를 바꾸면 해당 문서도 같은 커밋에서 고칩니다.

| 바꾼 것 | 고칠 문서 |
|---|---|
| 서버 함수 추가·변경 | API.md, DIAGRAMS.md(2장) |
| 클라이언트 함수 추가·이동 | DIAGRAMS.md(3장), ARCHITECTURE.md |
| 시트 컬럼·테이블 | Data.gs → `npm run schema`, ERD.md |
| 화면 추가·흐름 변경 | USE_CASES.md, DIAGRAMS.md(5장) |
| 공식·밸런스 규칙 | ARCHITECTURE.md(4장) |
| 모든 작업 | HANDOFF.md |
