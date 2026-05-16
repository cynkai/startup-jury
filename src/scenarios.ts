import { StartupIdeaInput } from './types.js';

export interface ScenarioPreset {
  id: string;
  emoji: string;
  title: string;
  description: string;
  idea: StartupIdeaInput;
}

export const scenarioPresets: ScenarioPreset[] = [
  {
    id: 'one-seat-salon',
    emoji: '💇‍♀️',
    title: '미용실 + 네일샵 결합 브랜드',
    description: '같은 공간에서 헤어와 네일을 한 번에 받는 도심형 살롱 체인',
    idea: {
      title: 'OneSeat Salon',
      pitch:
        '도시 직장인을 위한 미용실과 네일샵을 한 공간에서 동시에 운영하는 살롱. 한 자리에서 헤어 디자이너와 네일 아티스트가 동시에 작업해 평균 2시간 걸리던 서비스를 1시간 안에 끝낸다. 멤버십 기반 정기 방문과 시간대별 다이나믹 가격으로 비는 시간을 줄인다.',
      notes:
        '주 타깃은 25-40세 도심 직장인. 첫 매장은 강남/판교. 멤버십 월 9만 원과 시술별 결제 병행.',
    },
  },
  {
    id: 'one-bite-box',
    emoji: '🥗',
    title: '1인 가구용 반찬 구독 서비스',
    description: '주 3회 신선 반찬을 정기 배송하고 메뉴를 매주 추천',
    idea: {
      title: 'OneBite Box',
      pitch:
        '1인 가구를 위한 주 3회 신선 반찬 구독 서비스. 사용자의 식단 취향, 알러지, 운동 목표를 입력하면 AI가 매주 메뉴를 추천하고 소량 포장된 반찬을 새벽 배송한다. 잔반을 줄이고, 외식 비용을 낮추고, 영양 균형을 맞추는 게 목표다.',
      notes:
        '주 5만 원대 가격 가설. 첫 채널은 인스타그램과 1인 가구 커뮤니티. 자체 주방으로 시작하고, 추후 동네 식당과 협업.',
    },
  },
  {
    id: 'paw-walk',
    emoji: '🐶',
    title: '반려동물 산책 매칭 앱',
    description: '바쁜 보호자와 검증된 동네 산책 도우미를 매칭',
    idea: {
      title: 'PawWalk',
      pitch:
        '바쁜 반려동물 보호자와 동네 산책 도우미를 연결해주는 모바일 매칭 서비스. 산책 도우미는 신원/경력 인증을 거치고, 산책 중 실시간 경로와 사진이 보호자 앱으로 공유된다. 정기 산책 일정을 등록하면 같은 도우미가 우선 매칭된다.',
      notes:
        '도우미 수수료 20%. 첫 도시는 서울 강서/마포. 반려견 카페, 동물병원과 제휴해 도우미 풀 확보.',
    },
  },
];
