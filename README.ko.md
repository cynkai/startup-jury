# Startup Jury

> AI 멀티 에이전트를 활용한 스타트업 투자 심사위원회 시뮬레이션 플랫폼

🇺🇸 For the English version, see [README.md](README.md).

---

# 프로젝트 소개

Startup Jury는 하나의 AI가 스타트업을 평가하는 것이 아니라, **서로 다른 관점을 가진 여러 AI 에이전트가 토론을 거쳐 최종 투자 의견을 도출하는 웹 기반 데모 플랫폼**입니다.

벤처캐피털(VC), 시장(Market), 기술(Tech), 성장(Growth), 리스크(Risk) 등 다양한 역할을 가진 AI 심사위원들이 각각 독립적으로 평가를 수행한 뒤, Moderator가 토론 내용을 종합하여 최종 투자 판단을 제시합니다.

본 프로젝트는 **멀티 에이전트 협업(Multi-Agent Collaboration)**, **대화형 사용자 경험(Conversational UI)** 그리고 **스타트업 투자 심사 프로세스**를 웹 애플리케이션 형태로 구현하는 것을 목표로 개발되었습니다.

---

# 주요 기능

## AI 투자 심사위원회

5명의 AI 심사위원이 각각 다른 관점에서 스타트업 아이디어를 평가합니다.

- VC Agent
- Market Agent
- Tech Agent
- Growth Agent
- Risk Agent

각 에이전트는 독립적으로 점수를 산정하고 의견을 제시합니다.

---

## Multi-Agent Debate

단순히 평가 결과만 보여주는 것이 아니라,

각 AI가 서로의 의견에 반응하며 실제 투자 심사위원회처럼 토론을 진행합니다.

Moderator는 토론 내용을 정리하고 최종 의견을 제시합니다.

---

## 실시간 투자 심사 진행

투자 심사는 다음 단계로 진행됩니다.

1. Startup Brief 분석
2. 에이전트 초기 평가
3. AI 토론
4. Moderator 종합
5. 최종 투자 판정

Stepper UI를 통해 현재 진행 단계를 확인할 수 있습니다.

---

## 투자 결과 대시보드

최종 결과에서는 다음 정보를 제공합니다.

- Overall Score
- Investment Verdict
- Moderator Confidence
- Agent Scorecards
- Debate Timeline
- Strengths
- Risks
- Next Actions

---

## 데모 시나리오

빠른 시연을 위해 여러 예시 시나리오가 내장되어 있습니다.

- OneSeat Salon
- OneBite Box
- PawWalk

버튼 하나만 클릭하면 자동으로 투자 심사가 시작됩니다.

---

## 결과 내보내기

평가 결과는 다음 형식으로 저장할 수 있습니다.

- JSON
- Markdown

---

# 프로젝트 화면

## 로그인

프로젝트 진입 화면

```
docs/images/login.png
```

---

## 메인 대시보드

스타트업 정보를 입력하고 평가를 시작하는 화면

```
docs/images/dashboard.png
```

---

## AI 토론

여러 에이전트가 서로 의견을 주고받으며 토론을 진행합니다.

```
docs/images/debate.png
```

---

## Agent Scorecards

각 AI 심사위원의 점수와 평가 결과를 확인할 수 있습니다.

```
docs/images/scorecards.png
```

---

## 최종 투자 결과

최종 투자 의견과 종합 점수를 제공합니다.

```
docs/images/verdict.png
```

---

# 기술 스택

## Frontend

- HTML
- CSS
- Vanilla JavaScript

## Backend

- TypeScript
- Node.js
- Express

## Validation

- Zod

## Runtime

- tsx

---

# 프로젝트 구조

```
src/
 ├── server.ts
 ├── agents.ts
 ├── llmEvaluator.ts
 ├── fallbackEvaluator.ts
 ├── normalize.ts
 ├── schema.ts
 ├── scenarios.ts
 ├── config.ts
 ├── types.ts
 └── utils.ts

public/
 └── index.html
```

---

# 실행 방법

## 저장소 복제

```bash
git clone https://github.com/YOUR_USERNAME/startup-jury.git
cd startup-jury
```

## 의존성 설치

```bash
npm install
```

## 개발 서버 실행

```bash
npm run dev
```

브라우저에서 아래 주소로 접속합니다.

```
http://localhost:4000
```

---

# API

## 상태 확인

```
GET /health
```

---

## 데모 시나리오 조회

```
GET /scenarios
```

---

## 스타트업 평가

```
POST /evaluate
```

---

# 향후 개선 계획

- LLM API 연동
- 사용자 인증 기능
- 평가 결과 저장
- PDF 리포트 생성
- 실시간 Streaming 응답
- 투자자 프로필 커스터마이징
- Docker 기반 배포
- Cloud 환경 배포

---

# 프로젝트를 통해 구현한 내용

- Multi-Agent 기반 평가 프로세스 설계
- AI 토론(Conversation) 시뮬레이션
- Express 기반 REST API 개발
- TypeScript 기반 백엔드 설계
- 단계별 투자 심사 UI 구현
- 결과 리포트(JSON / Markdown) 생성

---

# 라이선스

MIT License
