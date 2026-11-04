# 최영민 · SK AIGEN 포트폴리오

퀀트 연구 경험과 AI Agent 기반 연구·운영 시스템을 소개하는 정적 포트폴리오입니다.

사이트: https://dudals3844.github.io/cosmos-portfolio/

## 로컬 미리보기

```bash
python3 -m http.server 4173
```

## 배포

GitHub Pages Source는 GitHub Actions로 설정합니다. main 브랜치에 commit 후 push하면 .github/workflows/pages.yml이 자동 배포합니다.

HTML·CSS·JavaScript·Canvas·WebGL로 구성하며 별도 서버가 필요하지 않습니다. 그래프와 구조도는 설명용이며, 전략 결합 곡선은 실제 운용 성과가 아닌 개념도입니다.

이미지·로고 출처: [assets/CREDITS.md](assets/CREDITS.md).

## 공개 파일과 보안 정책

`scripts/prepare-site.py`가 허용 목록에 있는 파일만 `_site/`에 복사하며, Pages는 이 결과만 배포합니다. 문서·백업·인증 파일을 배포 경로에 추가하지 마세요. 배포 액션은 전체 커밋 SHA로 고정하고 checkout 인증정보를 유지하지 않습니다.

페이지의 meta CSP는 자체 JavaScript만 허용하고 API 연결·폼 제출·임베드를 차단합니다. 애니메이션을 위해 인라인 스타일은 허용하며, 글꼴은 Google Fonts를 사용합니다.

연구 개선 사례와 연구 시스템 소개는 하나의 스크롤 그래프로 통합했습니다. `research-case.js`는 기대 경로 → 경로 이탈 → RAGFlow 검색 → Workflow 연구·구현·검토 → Backtest MCP 측정 → 기록·운영의 여섯 장면을 스크롤 위치에 맞춰 표시합니다. 되돌아 스크롤하면 앞 장면을 다시 볼 수 있고, 작은 화면에서는 진행하는 점을 따라 그래프 화면이 이동합니다. 모션 끄기·동작 줄이기에서는 정적 설명으로 표시합니다. 그래프는 cosmos-agent의 thinker-new-strategy Workflow와 독립 평가 파이프라인의 분기·복귀 경계를 요약한 개념도이며 실시간 상태가 아닙니다.

연구 그래프는 자료 탐색 → 가설·구현 → 측정·평가 → 기록·운영의 네 핵심 단계로 간소화했습니다. RAGFlow 질의·응답과 Backtest MCP 측정은 해당 스크롤 장면에서만 표시하고, 세부 테스트·산출물·리뷰는 가설·구현 단계로 묶었습니다. 수정 경로는 하나로 요약합니다.

지원 포트폴리오의 구성은 인사·경력·창업 배경·연구 과정·전략 결합·Agent 운영·마무리입니다. 데이터 수집·처리와 주문 실행·관리의 독립 장면은 제거했습니다.
