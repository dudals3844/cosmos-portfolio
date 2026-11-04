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

연구 개선 사례는 `research-case.js`로 흩어진 작업 → 공통 연구 구조 → 비교·추적 가능한 연구의 세 장면을 자동 재생합니다. 단계 직접 선택·일시정지·화면 밖 재생 중단·동작 줄이기를 지원합니다.
