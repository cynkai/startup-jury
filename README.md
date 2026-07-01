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

# Startup Jury

> AI-powered multi-agent startup investment committee simulator.

🇰🇷 Korean documentation is available in [README.ko.md](README.ko.md).

---

* TypeScript
* Node.js
* Express
* Zod
* Multi-Agent
* Hackathon Project

## Preview

![Dashboard](docs/images/dashboard.png)

## Overview

Startup Jury is a web-based demonstration platform that simulates how an investment committee evaluates startup ideas.

Instead of producing a single AI response, the application models multiple AI reviewers with different perspectives (VC, Market, Tech, Growth, and Risk). Each agent provides an independent evaluation, participates in a structured debate, and contributes to a moderator's final investment recommendation.

The project was built as a demonstration of multi-agent interaction, conversational UI, and startup evaluation workflow.

---

## Demo

![Demo](docs/images/demo.mov)

### Workflow

1. Login
2. Submit a startup idea
3. Multi-agent evaluation begins
4. Live investment committee debate
5. Moderator summarizes the discussion
6. Final investment verdict
7. Export evaluation report

---

> **Project Type**: Hackathon Project  
> **Development Period**: May 2026  
> **Architecture**: Multi-Agent AI Simulation  
> **Backend**: TypeScript + Express  
> **Frontend**: HTML / CSS / JavaScript

## 📖 Project Background

Startup investment decisions are rarely made by a single person.

In real investment committees, venture capitalists, market analysts, technical reviewers, and risk specialists examine the same startup from different perspectives. They discuss their opinions, challenge each other's assumptions, and eventually reach a collective decision.

This project started from a simple question:

> **"What if we could simulate an investment committee using multiple AI agents instead of a single AI response?"**

Rather than generating only one evaluation, Startup Jury models several specialized AI reviewers that independently analyze a startup idea, participate in a structured discussion, and produce a moderator's final investment recommendation.

The goal of this project is not to replace professional investors, but to demonstrate how **multi-agent collaboration**, **structured reasoning**, and **conversational interfaces** can create a more transparent and explainable decision-making process.

## 💡 Why Multi-Agent?

Traditional AI evaluators generate a single response, making it difficult to understand how different perspectives influence the final decision.

Startup Jury adopts a multi-agent approach where each AI reviewer focuses on a different aspect of a startup.

This makes the evaluation process more transparent, encourages structured debate, and produces a moderator summary that reflects multiple viewpoints instead of a single opinion.

## Architecture

![Architecture](docs/images/architecture.png)

The backend coordinates multiple AI agents, aggregates their evaluations through the Moderator, and generates the final investment report.

## Features

User Idea
      │
      ▼

 VC
 Market
 Tech
 Growth
 Risk

      │

 Debate

      │

 Moderator

      │

 Final Verdict

---

### Live Debate Simulation

Instead of displaying independent reviews only, the agents participate in a conversational discussion.

The debate progresses through multiple stages before reaching a moderator decision.

---

### Moderator Consensus

A moderator summarizes

- agreements
- disagreements
- overall confidence
- final recommendation

---

### Investment Dashboard

The interface includes

- Overall Score
- Investment Verdict
- Moderator Confidence
- Step Progress
- Agent Scorecards
- Debate Timeline

---

### Demo Scenarios

Built-in demo scenarios allow quick demonstrations without manual input.

Examples include

- OneSeat Salon
- OneBite Box
- PawWalk

---

### Report Export

Evaluation results can be exported as

- JSON
- Markdown

---

## Screenshots

### Login

![Login](docs/images/login.png)

---

### Dashboard

![Dashboard](docs/images/dashboard.png)

---

### Live Debate

![Live Debate](docs/images/debate.png)

---

### Agent Scorecards

![Agent Scorecards](docs/images/scorecards.png)

---

### Final Verdict

![Final Verdict](docs/images/verdict.png)

---

## Tech Stack

![TypeScript]
![Node.js]
![Express]
![Zod]

---

## Project Structure

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

## Getting Started

### Clone

```bash
git clone https://github.com/cynkai/startup-jury.git
cd startup-jury
```

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Open

```
http://localhost:4000
```

---

## API

### Health Check

```
GET /health
```

---

### Demo Scenarios

```
GET /scenarios
```

---

### Startup Evaluation

```
POST /evaluate
```

---

## Future Improvements

- LLM integration
- Persistent evaluation history
- User authentication
- PDF export
- Investor profile customization
- Real-time streaming responses
- Docker deployment
- Cloud deployment

---

## What this project demonstrates

This project demonstrates

- Multi-agent workflow design
- Backend API development
- Conversational interface design
- TypeScript backend architecture

---

## License

MIT License
