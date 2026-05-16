# Startup Jury Backend

멀티 역할 에이전트가 스타트업 아이디어를 평가하는 MVP 백엔드입니다.

## 포함된 에이전트
- VC Agent
- Market Agent
- Tech Agent
- Growth Agent
- Risk Agent
- Moderator Agent

## 현재 백엔드 흐름
1. 역할별 1차 평가
2. 에이전트 간 debate(반박/보완)
3. Moderator 종합 정리
4. 최종 투자 판정 및 next actions 반환

## 실행
```bash
cp .env.example .env
npm install
npm run dev
```

기본 포트: `4000`

## API

### `GET /health`
서버 상태 확인

### `GET /agents`
에이전트 목록 반환

### `POST /evaluate`
스타트업 아이디어 평가

예시 요청:
```json
{
  "title": "Startup Jury",
  "summary": "예비 창업자가 아이디어를 입력하면 VC, 마케터, 기술리드, 리스크 분석가 역할의 AI가 평가한다.",
  "targetCustomer": "예비 창업자와 초기 스타트업 팀",
  "customerSegment": "해커톤 참가자, 대학생 창업팀, 1인 창업 준비생",
  "problem": "창업 아이디어 검증을 빠르게 하기 어렵다.",
  "solution": "다중 역할 AI 에이전트가 사업성, 시장성, 구현 가능성, 성장성, 리스크를 종합 평가한다.",
  "uniqueValue": "단순 요약이 아니라 역할별 토론과 moderator 종합판단까지 제공한다.",
  "revenueModel": "B2B SaaS 구독 + 프리미엄 리포트",
  "pricingHint": "월 29달러 팀 플랜",
  "acquisitionChannel": "창업 커뮤니티, 대학 창업센터, 해커톤 파트너십",
  "marketRegion": "Korea",
  "whyNow": "생성형 AI 사용이 대중화되면서 아이디어 검증 자동화 수요가 증가했다.",
  "teamStrength": "LLM 앱 개발 경험과 해커톤 제품 제작 경험이 있다.",
  "mvpScope": "아이디어 입력, 역할별 평가, debate, moderator 결과 리포트",
  "competitors": ["ChatGPT", "CB Insights", "PitchBook"],
  "stage": "idea"
}
```

## LLM 사용
`.env`에 `OPENAI_API_KEY`를 넣으면 실제 LLM 기반 평가를 시도합니다.
키가 없거나 호출이 실패하면 fallback 규칙 기반 평가기로 자동 전환됩니다.
