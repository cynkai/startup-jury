import { NormalizedIdea, StartupIdeaInput } from './types.js';

// A keyword is a Latin word (matched as a whole word, plural allowed), a
// Korean word (matched as a substring, since particles attach to it), or a
// RegExp for patterns such as prices.
type Keyword = string | RegExp;

const LATIN = /^[a-z0-9 $]+$/;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matches(text: string, keyword: Keyword): boolean {
  if (keyword instanceof RegExp) return keyword.test(text);
  if (keyword === '$') return text.includes('$');
  if (LATIN.test(keyword)) {
    return new RegExp(`(?<![a-z0-9])${escapeRegExp(keyword)}s?(?![a-z0-9])`).test(text);
  }
  return text.includes(keyword);
}

function includesAny(text: string, keywords: Keyword[]): boolean {
  return keywords.some((keyword) => matches(text, keyword));
}

// "월 9만 원", "연 120만원", "월 29달러": a period followed by an amount.
const PERIOD_PRICE = /(월|연)\s?\d/;
// "9만 원", "5,000원", "29달러".
const AMOUNT = /\d[\d,.]*\s?(만\s?|천\s?)?(원|달러)/;

export function normalizeIdea(input: StartupIdeaInput): NormalizedIdea {
  const combined = [input.title, input.pitch, input.notes].filter(Boolean).join(' ');
  const text = combined.toLowerCase();

  const signals = {
    hasProblem: includesAny(text, [
      '문제', '어려움', '불편', 'pain', 'problem', '낭비', '비효율',
    ]),
    hasSolution: includesAny(text, [
      '해결', '솔루션', '제공', '자동', '추천', '분석', '도와', 'solution',
    ]),
    hasTarget: includesAny(text, [
      '대상', '타깃', '타겟', '사용자', '고객', '학생', '창업자', '직장인', '소상공인', '예비', 'b2b', 'sme', 'founder',
    ]),
    hasRevenue: includesAny(text, [
      PERIOD_PRICE, '구독', '결제', '판매', '수익', '광고', '수수료', 'commission', 'subscription', 'saas', 'fee', 'paid',
    ]),
    hasCompetition: includesAny(text, [
      '경쟁', '대체', '비교', '기존', 'competitor', 'alternative', 'gpt', 'chatgpt', 'notion', 'figma',
    ]),
    hasPricing: includesAny(text, [
      '가격', AMOUNT, PERIOD_PRICE, '$', '연간', 'pricing', 'price',
    ]),
    hasAcquisition: includesAny(text, [
      '유입', '채널', '커뮤니티', 'seo', 'instagram', 'youtube', 'reddit', '학교', '대학', '광고', 'marketing', 'campaign',
    ]),
    hasWhyNow: includesAny(text, [
      '지금', '최근', '요즘', '확산', '트렌드', 'why now', '대중화',
    ]),
    hasTeam: includesAny(text, [
      '팀', '개발자', '경험', '창업 경험', 'background', '엔지니어', '디자이너', '전문가',
    ]),
    hasMvp: includesAny(text, [
      'mvp', '최소', '범위', '핵심 기능', '먼저', '버전 1', '1주', '2주', '프로토타입',
    ]),
    isHardware: includesAny(text, ['하드웨어', '디바이스', 'iot', 'robot', '드론', 'sensor']),
    isRegulated: includesAny(text, [
      '의료', '진단', '의약', '약국', '처방', '금융', '증권', '보험', '투자 자문', '법률', '법무', 'fintech',
    ]),
    isAiNative: includesAny(text, ['ai', '에이전트', 'agent', 'llm', '자동화', '추천 시스템', '챗봇']),
    isB2b: includesAny(text, ['b2b', '기업', '회사', '팀', '조직', '엔터프라이즈']),
    isMarketplace: includesAny(text, ['마켓플레이스', '플랫폼', 'marketplace', '중개', '매칭']),
    mentionsCommunity: includesAny(text, ['커뮤니티', '학교', '동아리', '클럽', '디스코드', 'discord']),
  };

  return {
    title: input.title,
    pitch: input.pitch,
    notes: input.notes,
    combinedText: combined,
    signals,
  };
}
