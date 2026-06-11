import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react'
import {
  Archive,
  BadgeCheck,
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Compass,
  Copy,
  ExternalLink,
  FileText,
  Home,
  LayoutDashboard,
  MapPin,
  Mic,
  Plane,
  Plus,
  Search,
  Settings,
  Sparkles,
  Tags,
  Tent,
  Trash2,
  Video,
} from 'lucide-react'
import './App.css'
import { foresttripFacilities } from './foresttripFacilities'

type AppView = 'home' | 'blog' | 'reservation' | 'photo'
type Status = 'idea' | 'research' | 'field' | 'draft' | 'published'
type PhotoProjectStatus = 'brief' | 'reference' | 'shoot' | 'edit' | 'delivered'
type ReservationStatus = 'watching' | 'available' | 'closed'

type BlogItem = {
  id: number
  title: string
  category: string
  status: Status
  destination: string
  due: string
  intent: string
  keywords: string[]
  research: string[]
  fieldAnswers: Record<string, string>
  draftAngle: string
  memo: string
}

type FieldQuestion = {
  id: string
  label: string
  options: string[]
  placeholder: string
}

type AppTile = {
  id: AppView | 'youtube' | 'drone' | 'location' | 'archive' | 'settings'
  title: string
  group: string
  description: string
  state: string
  icon: typeof FileText
  enabled: boolean
}

type PhotoReference = {
  id: number
  title: string
  url: string
  mood: string
  tags: string[]
}

type PhotoProject = {
  id: number
  title: string
  category: string
  status: PhotoProjectStatus
  purpose: string
  deliverable: string
  concept: string
  avoid: string
  location: string
  drivePath: string
  references: PhotoReference[]
  shotList: string[]
  checklist: string[]
  outputSteps: string[]
}

type ReservationMonitor = {
  id: string | number
  service: string
  campground: string
  period: string
  condition: string
  status: ReservationStatus
  lastChecked: string
  nextCheck: string
  notify: string
  link: string
  history: string[]
}

type ReservationService = '국립공원공단' | '숲나들e'
type StayNights = '1' | '2'

type ReservationFacilityOption = {
  id: string
  service: ReservationService
  label: string
  park: string
  link: string
}

type ReservationMonitorDraft = {
  service: ReservationService
  areaId: string
  facilityId: string
  startDate: string
  nights: StayNights
  notify: string
}

type ReservationCheckResult = {
  status: ReservationStatus
  message: string
  checkedAt: string
  source: string
}

type ReservationAreaOption = {
  id: string
  label: string
}

type StoredReservationMonitor = {
  id: string
  service: string
  campground: string
  period: string
  condition: string
  status: ReservationStatus
  url: string
  alertStatuses: string[]
  createdAt?: string
  updatedAt?: string
}

type ReservationMonitorsResponse = {
  monitors: StoredReservationMonitor[]
}

const statusMeta: Record<Status, { label: string; tone: string }> = {
  idea: { label: '아이디어', tone: 'neutral' },
  research: { label: '조사중', tone: 'blue' },
  field: { label: '현장메모', tone: 'green' },
  draft: { label: '초안작성', tone: 'orange' },
  published: { label: '발행완료', tone: 'dark' },
}

const BLOG_ITEMS_STORAGE_KEY = 'giluxy.blogItems.v1'
const RESERVATION_MONITORS_STORAGE_KEY = 'giluxy.reservationMonitors.v1'
const PHOTO_PROJECTS_STORAGE_KEY = 'giluxy.photoProjects.v1'
const AUTO_RESERVATION_CHECK_TEXT = '2시간마다 자동 조회'
const NOT_CHECKED_TEXT = '아직 조회 전'

const reservationStatusMeta: Record<ReservationStatus, { label: string; tone: string }> = {
  watching: { label: '감시중', tone: 'blue' },
  available: { label: '빈자리 감지', tone: 'green' },
  closed: { label: '빈자리 없음', tone: 'neutral' },
}

const reservationServiceLinks: Record<ReservationService, string> = {
  국립공원공단: 'https://reservation.knps.or.kr/',
  숲나들e: 'https://www.foresttrip.go.kr/',
}

const reservationServiceLabels: Record<ReservationService, string> = {
  국립공원공단: '국립공원공단',
  숲나들e: '숲나들이',
}

const photoStatusMeta: Record<PhotoProjectStatus, { label: string; tone: string }> = {
  brief: { label: '기획', tone: 'neutral' },
  reference: { label: '레퍼런스', tone: 'blue' },
  shoot: { label: '촬영준비', tone: 'orange' },
  edit: { label: '보정중', tone: 'green' },
  delivered: { label: '납품완료', tone: 'dark' },
}

const photoShotGuides: Record<string, string[]> = {
  인물: [
    '정면 안정 컷: 눈높이, 상반신, 배경 정리',
    '측면 프로필 컷: 얼굴선과 손 위치가 보이는 컷',
    '환경 인물 컷: 장소 맥락이 보이도록 넓게',
    '행동 컷: 걷기, 손동작, 시선 처리처럼 자연스러운 움직임',
    '클로즈업 컷: 표정, 손, 옷감, 소품 디테일',
  ],
  상업촬영: [
    '대표 컷: 제품이나 공간의 첫인상을 설명하는 와이드 컷',
    '사용 장면 컷: 사람이 쓰거나 만지는 맥락 컷',
    '디테일 컷: 재질, 로고, 마감, 기능이 드러나는 컷',
    '비교 컷: 크기감, 전후, 구성품을 보여주는 컷',
    '썸네일 컷: 좌우 여백을 남긴 광고/블로그용 컷',
  ],
  공간: [
    '입구 컷: 외부에서 내부로 이어지는 첫인상',
    '전체 와이드 컷: 동선과 규모가 보이는 컷',
    '좌석/구역 컷: 사용자가 머무를 공간을 설명하는 컷',
    '빛 컷: 창가, 조명, 그림자가 분위기를 만드는 컷',
    '운영 디테일 컷: 메뉴, 안내, 소품, 사인물',
  ],
  여행: [
    '도착 컷: 표지판, 입구, 주차장처럼 정보가 되는 컷',
    '대표 풍경 컷: 장소를 한 장으로 설명하는 와이드 컷',
    '동선 컷: 길, 계단, 전망대, 접근 난이도',
    '체감 컷: 사람 크기나 물건으로 규모가 느껴지는 컷',
    '마무리 컷: 해질녘, 야경, 돌아가는 길의 분위기',
  ],
  제품: [
    '깨끗한 단독 컷: 제품 형태가 왜곡 없이 보이는 컷',
    '사용 전 컷: 패키지, 구성품, 설치 전 상태',
    '사용 중 컷: 손, 현장, 실제 사용 맥락',
    '문제/장점 컷: 불편한 지점이나 강점이 보이는 컷',
    '결론 컷: 추천/비추천 판단에 쓰일 대표 컷',
  ],
  드론: [
    '수직 탑샷: 지형과 패턴을 보여주는 컷',
    '45도 진입 컷: 장소 규모와 입체감을 동시에 보여주는 컷',
    '전진/후퇴 동선 컷: 영상 썸네일로 쓰기 좋은 컷',
    '고도 비교 컷: 낮은 고도와 높은 고도 각각 확보',
    '안전 확인 컷: 비행 가능 구역과 장애물 기록',
  ],
}

const defaultPhotoProjects: PhotoProject[] = [
  {
    id: 1,
    title: '캠핑 브랜드 제품 촬영',
    category: '상업촬영',
    status: 'reference',
    purpose: '블로그 리뷰와 업체 제안서에 모두 쓸 수 있는 제품 사용 장면 확보',
    deliverable: '블로그 본문 12장, 썸네일 2장, 인스타용 세로 컷 4장',
    concept: '해질녘 자연광, 따뜻하지만 과장되지 않은 캠핑 사용감',
    avoid: '스톡 사진처럼 과하게 깨끗한 배경, 실제 사용감이 없는 연출',
    location: '야영장 데크 또는 차박 세팅',
    drivePath: 'GILUXY/사진촬영/2026/캠핑브랜드제품촬영/01_RAW',
    references: [
      {
        id: 1,
        title: '따뜻한 캠핑 제품 사용컷',
        url: 'https://unsplash.com/s/photos/camping-product',
        mood: '따뜻한 톤, 손이 들어간 사용 장면, 해질녘',
        tags: ['캠핑', '제품', '자연광', '상업촬영'],
      },
    ],
    shotList: photoShotGuides.상업촬영,
    checklist: ['촬영 허가와 브랜드 노출 범위 확인', '배터리 2개 이상', 'SD카드 포맷', '제품 먼지 제거', '썸네일용 여백 컷 확보'],
    outputSteps: ['RAW 원본 저장', '1차 셀렉', '보정본 JPG export', '블로그용 1600px 리사이즈', '납품/게시 위치 기록'],
  },
  {
    id: 2,
    title: '카페 공간 촬영',
    category: '공간',
    status: 'brief',
    purpose: '공간의 분위기와 이용 동선을 동시에 보여주는 소개용 사진 구성',
    deliverable: '외관/내부/좌석/메뉴/디테일 컷 20장',
    concept: '창가 자연광, 조용한 오전, 과장 없는 공간감',
    avoid: '사람 얼굴이 식별되는 컷, 너무 넓어서 비어 보이는 구도',
    location: '카페 현장',
    drivePath: 'GILUXY/사진촬영/2026/카페공간촬영/01_RAW',
    references: [],
    shotList: photoShotGuides.공간,
    checklist: ['영업 전 촬영 가능 시간 확인', '손님 얼굴 노출 방지', '외관 간판 컷', '메뉴판/대표 메뉴 컷', '화이트밸런스 고정'],
    outputSteps: ['RAW 백업', '공간별 폴더 분류', '대표컷 별도 표시', '클라이언트 확인본 export', '최종본 Drive 링크 정리'],
  },
]

const knpsReservationFacilityOptions: ReservationFacilityOption[] = [
  { park: '가야산', label: '백운동 야영장', deptId: 'B131002' },
  { park: '가야산', label: '삼정 야영장', deptId: 'B131001' },
  { park: '가야산', label: '치인 야영장', deptId: 'B131003' },
  { park: '계룡산', label: '갑사 야영장', deptId: 'B161004' },
  { park: '계룡산', label: '동학사 야영장', deptId: 'B161001' },
  { park: '내장산', label: '가인 야영장', deptId: 'B041001' },
  { park: '내장산', label: '내장 야영장', deptId: 'B042001' },
  { park: '내장산', label: '내장호 야영장', deptId: 'B042004' },
  { park: '다도해해상', label: '구계등 야영장', deptId: 'B091004' },
  { park: '다도해해상', label: '시목 야영장', deptId: 'B092003' },
  { park: '다도해해상', label: '염포 야영장', deptId: 'B091003' },
  { park: '다도해해상', label: '팔영산 야영장', deptId: 'B091001' },
  { park: '덕유산', label: '덕유대1 야영장', deptId: 'B051002' },
  { park: '덕유산', label: '덕유대2 야영장', deptId: 'B051007' },
  { park: '덕유산', label: '덕유대3 야영장', deptId: 'B051006' },
  { park: '무등산', label: '도원 야영장', deptId: 'B172002' },
  { park: '변산반도', label: '고사포1 야영장', deptId: 'B181002' },
  { park: '변산반도', label: '고사포2 야영장', deptId: 'B181004' },
  { park: '변산반도', label: '직소천 야영장', deptId: 'B181005' },
  { park: '북한산', label: '사기막 야영장', deptId: 'B141003' },
  { park: '설악산', label: '설악동 야영장', deptId: 'B031005' },
  { park: '소백산', label: '남천 야영장', deptId: 'B122001' },
  { park: '소백산', label: '삼가 야영장', deptId: 'B121001' },
  { park: '오대산', label: '소금강산 야영장', deptId: 'B061001' },
  { park: '월악산', label: '닷돈재1 야영장', deptId: 'B111003' },
  { park: '월악산', label: '닷돈재2 야영장', deptId: 'B111001' },
  { park: '월악산', label: '덕주 야영장', deptId: 'B111007' },
  { park: '월악산', label: '송계 야영장', deptId: 'B111002' },
  { park: '월악산', label: '용하 야영장', deptId: 'B111004' },
  { park: '월악산', label: '하선암 야영장', deptId: 'B111008' },
  { park: '월출산', label: '천황 야영장', deptId: 'B201001' },
  { park: '주왕산', label: '상의 야영장', deptId: 'B071001' },
  { park: '지리산', label: '내원 야영장', deptId: 'B011005' },
  { park: '지리산', label: '달궁1 야영장', deptId: 'B012005' },
  { park: '지리산', label: '달궁2 야영장', deptId: 'B012002' },
  { park: '지리산', label: '덕동 야영장', deptId: 'B012003' },
  { park: '지리산', label: '백무동 야영장', deptId: 'B011007' },
  { park: '지리산', label: '소막골 야영장', deptId: 'B011006' },
  { park: '지리산', label: '학천 야영장', deptId: 'B012010' },
  { park: '치악산', label: '구룡 야영장', deptId: 'B101001' },
  { park: '치악산', label: '금대 야영장', deptId: 'B101002' },
  { park: '태백산', label: '소도 야영장', deptId: 'B221004' },
  { park: '태안해안', label: '몽산포 야영장', deptId: 'B081002' },
  { park: '태안해안', label: '학암포 야영장', deptId: 'B081001' },
  { park: '팔공산', label: '갓바위 야영장', deptId: 'B252001' },
  { park: '팔공산', label: '도학 야영장', deptId: 'B251001' },
  { park: '한려해상', label: '덕신 야영장', deptId: 'B022003' },
  { park: '한려해상', label: '학동 야영장', deptId: 'B021001' },
].map(({ park, label, deptId }) => ({
  id: `knps-${deptId.toLowerCase()}`,
  service: '국립공원공단' as const,
  park,
  label,
  link: `https://reservation.knps.or.kr/contents/C/serviceGuide.do?deptId=${deptId}&parkId=${deptId.slice(0, 3)}&prdDvcd=C`,
}))

const reservationFacilityOptions: ReservationFacilityOption[] = [
  ...knpsReservationFacilityOptions,
  ...foresttripFacilities.map(({ hmpgId, label, regionName }) => ({
    id: `forest-${hmpgId.toLowerCase()}`,
    service: '숲나들e' as const,
    park: regionName,
    label,
    link: `https://www.foresttrip.go.kr/pot/rm/fa/selectCmpgrArmpListView.do?hmpgId=${hmpgId}&menuId=002002002`,
  })),
]

const fieldQuestions: FieldQuestion[] = [
  {
    id: 'parking',
    label: '주차',
    options: ['여유', '보통', '만차', '확인필요'],
    placeholder: '예: 10시 기준 만차, 갓길 가능',
  },
  {
    id: 'toilet',
    label: '화장실',
    options: ['깨끗', '보통', '별로', '없음'],
    placeholder: '예: 입구 화장실 깨끗함',
  },
  {
    id: 'crowd',
    label: '혼잡도',
    options: ['한산', '보통', '많음', '매우많음'],
    placeholder: '예: 오전은 한산, 점심부터 많음',
  },
  {
    id: 'condition',
    label: '현장상태',
    options: ['좋음', '애매', '비추천', '재방문'],
    placeholder: '예: 꽃 80%, 바람 심함',
  },
  {
    id: 'photo',
    label: '사진포인트',
    options: ['오전', '오후', '일몰', '망원필요'],
    placeholder: '예: 1코스 초입이 제일 좋음',
  },
  {
    id: 'recommend',
    label: '결론',
    options: ['추천', '조건부', '비추천', '다시확인'],
    placeholder: '예: 잠만 자는 차박은 추천, 취사는 비추',
  },
  {
    id: 'other',
    label: '기타',
    options: ['특이사항 없음'],
    placeholder: '놓치면 안 되는 말, 사진 순서, 현장 느낌',
  },
]

const defaultBlogItems: BlogItem[] = [
  {
    id: 1,
    title: '양양 스텔스 차박지 비교',
    category: '레이 차박',
    status: 'draft',
    destination: '낙산해수욕장, 설악해수욕장',
    due: '2026.06.09',
    intent: '조용히 잠만 자기 좋은 해수욕장 차박지 정리',
    keywords: ['양양 차박', '낙산해수욕장 차박', '설악해수욕장 주차'],
    research: ['해변 앞 주차장은 소음 가능성 높음', '화장실 접근성 확인 필요', '취사 가능 여부 표현 주의'],
    fieldAnswers: {
      parking: '한 블럭 뒤 주차가 조용함',
      toilet: '확인필요',
      crowd: '한산',
      condition: '폭죽 소리 가능성 있음',
      photo: '해변과 주차장 진입로',
      recommend: '잠만 자는 차박은 추천, 취사는 비추천',
      other: '바닷가 바로 앞보다 한 블럭 뒤가 조용함.',
    },
    draftAngle: '취사 차박이 아니라 잠만 자는 스텔스 차박 기준으로 판단',
    memo: '바닷가 바로 앞보다 한 블럭 뒤가 조용함. 폭죽 소리 가능성 있음. 취사는 추천하지 않음.',
  },
  {
    id: 2,
    title: '변산 마실길 샤스타데이지 실시간',
    category: '여행정보',
    status: 'field',
    destination: '변산 마실길 1코스, 2코스',
    due: '2026.06.12',
    intent: '개화상황, 주차, 사진포인트를 빠르게 알려주는 실시간 글',
    keywords: ['변산 샤스타데이지', '마실길 샤스타데이지', '부안 꽃구경'],
    research: ['1코스와 2코스 개화 차이 확인', '새만금간척박물관 주차 가능성 확인', '오전/오후 빛 방향 체크'],
    fieldAnswers: {
      parking: '확인필요',
      toilet: '확인필요',
      crowd: '보통',
      condition: '1코스 만개에 가까움, 2코스는 다음주 절정',
      photo: '오전',
      recommend: '추천',
      other: '보고 즐기기에는 충분함.',
    },
    draftAngle: '길게 설명하지 말고 방문 전 판단에 필요한 정보만 앞에 배치',
    memo: '1코스는 만개에 가까움. 2코스 앞부분은 다음주가 절정. 보고 즐기기에는 충분함.',
  },
  {
    id: 3,
    title: '구봉산 등산코스 재정리',
    category: '등산정보',
    status: 'research',
    destination: '구봉산 만남의광장',
    due: '2026.06.18',
    intent: '주차, 화장실, 난이도, 1~8봉 하산 판단 정리',
    keywords: ['구봉산 등산코스', '구봉산 주차', '구봉산 화장실'],
    research: ['만남의광장 네비 정확도 확인', '진달래 시즌 키워드 연결 가능', '난이도 과소평가 방지'],
    fieldAnswers: {
      parking: '여유',
      toilet: '확인필요',
      crowd: '보통',
      condition: '난이도 어려움',
      photo: '망원필요',
      recommend: '조건부',
      other: '1~8봉만 돌고 하산해도 볼 거 다 보고 덜 힘듦.',
    },
    draftAngle: '100대명산보다 빡센 체감과 8봉 하산 추천을 명확히',
    memo: '1~8봉만 돌고 하산해도 볼 거 다 보고 덜 힘듦. 8봉에서 9봉 가는 길은 체력 소모 큼.',
  },
  {
    id: 4,
    title: '레이 차박 에어펌프 고장 후기',
    category: '레이 차박',
    status: 'idea',
    destination: '장비 후기',
    due: '미정',
    intent: '실패한 장비 후기를 검색되는 구매후기로 전환',
    keywords: ['레이 차박 에어펌프', '시거잭 에어펌프 후기', '차박 에어매트 펌프'],
    research: ['제품명 정확히 확인', '사용 횟수와 고장 시점 정리', '대체 펌프 비교'],
    fieldAnswers: {
      parking: '해당없음',
      toilet: '해당없음',
      crowd: '해당없음',
      condition: '5회 사용 후 고장',
      photo: '제품, 시거잭, 에어매트',
      recommend: '비추천',
      other: '결국 발펌프 150회. 노즐은 무선 펌프와 호환됨.',
    },
    draftAngle: '추천글이 아니라 실제 차박에서 죽어버린 장비 후기',
    memo: '5회 사용 후 전원이 안 들어옴. 결국 발펌프 150회. 노즐은 무선 펌프와 호환됨.',
  },
]

const appTiles: AppTile[] = [
  {
    id: 'blog',
    title: '블로그',
    group: '저스트레킹',
    description: '여행, 등산, 차박 글감을 조사하고 현장메모에서 초안까지 관리',
    state: '사용 가능',
    icon: FileText,
    enabled: true,
  },
  {
    id: 'reservation',
    title: '야영장 예약',
    group: '모니터',
    description: '숲나들e와 국립공원공단 야영장 빈자리 조건을 기록하고 알림 흐름을 테스트',
    state: '사용 가능',
    icon: Tent,
    enabled: true,
  },
  {
    id: 'youtube',
    title: '유튜브',
    group: '저스트레킹',
    description: '영상 아이디어, 촬영본, 편집 상태, 업로드 문구 관리',
    state: '준비중',
    icon: Video,
    enabled: false,
  },
  {
    id: 'photo',
    title: '사진촬영',
    group: '촬영',
    description: '촬영지, 렌즈, 시간대, 샷리스트, 결과물 셀렉 관리',
    state: '사용 가능',
    icon: Camera,
    enabled: true,
  },
  {
    id: 'drone',
    title: '드론촬영',
    group: '촬영',
    description: '비행 가능 여부, 풍속, 허가 체크, 드론 샷리스트 관리',
    state: '준비중',
    icon: Plane,
    enabled: false,
  },
  {
    id: 'location',
    title: '촬영지',
    group: '공통',
    description: '여행지와 촬영 포인트를 카드로 모아두는 장소 보관함',
    state: '준비중',
    icon: MapPin,
    enabled: false,
  },
  {
    id: 'archive',
    title: '자료보관함',
    group: '공통',
    description: '사진, 링크, 조사자료, 발행물 원본을 한 곳에 보관',
    state: '준비중',
    icon: Archive,
    enabled: false,
  },
  {
    id: 'settings',
    title: '설정',
    group: '관리',
    description: '말투 가이드, 카테고리, 기본 체크리스트, 계정 설정',
    state: '준비중',
    icon: Settings,
    enabled: false,
  },
]

const defaultReservationMonitors: ReservationMonitor[] = [
  {
    id: 1,
    service: '국립공원공단',
    campground: '월악산 송계야영장',
    period: '2026.06.13 토요일',
    condition: '송계야영장 빈자리 알림, 1박 우선',
    status: 'watching',
    lastChecked: NOT_CHECKED_TEXT,
    nextCheck: AUTO_RESERVATION_CHECK_TEXT,
    notify: '텔레그램 알림 예정',
    link: 'https://reservation.knps.or.kr/contents/C/serviceGuide.do?deptId=B111002&parkId=B11&prdDvcd=C',
    history: ['조건 카드 생성', '예약 확정은 수동으로 진행'],
  },
  {
    id: 2,
    service: '숲나들e',
    campground: '관심 자연휴양림 야영장',
    period: '주말 취소분',
    condition: '공식 빈자리 알림 또는 대기 기능 우선 확인',
    status: 'closed',
    lastChecked: NOT_CHECKED_TEXT,
    nextCheck: AUTO_RESERVATION_CHECK_TEXT,
    notify: '알림 미설정',
    link: 'https://www.foresttrip.go.kr/pot/rm/fa/selectCmpgrArmpListView.do?hmpgId=ID02030087&menuId=002002002',
    history: ['대상 휴양림을 정하면 모니터 조건으로 전환'],
  },
]

const statusOrder: Status[] = ['idea', 'research', 'field', 'draft', 'published']

function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && statusOrder.includes(value as Status)
}

function isReservationStatus(value: unknown): value is ReservationStatus {
  return value === 'watching' || value === 'available' || value === 'closed'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isPhotoProjectStatus(value: unknown): value is PhotoProjectStatus {
  return value === 'brief' || value === 'reference' || value === 'shoot' || value === 'edit' || value === 'delivered'
}

function isBlogItem(value: unknown): value is BlogItem {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>

  return (
    typeof item.id === 'number' &&
    typeof item.title === 'string' &&
    typeof item.category === 'string' &&
    isStatus(item.status) &&
    typeof item.destination === 'string' &&
    typeof item.due === 'string' &&
    typeof item.intent === 'string' &&
    isStringArray(item.keywords) &&
    isStringArray(item.research) &&
    typeof item.draftAngle === 'string' &&
    typeof item.memo === 'string'
  )
}

function isReservationMonitor(value: unknown): value is ReservationMonitor {
  if (typeof value !== 'object' || value === null) return false
  const monitor = value as Record<string, unknown>

  return (
    (typeof monitor.id === 'number' || typeof monitor.id === 'string') &&
    typeof monitor.service === 'string' &&
    typeof monitor.campground === 'string' &&
    typeof monitor.period === 'string' &&
    typeof monitor.condition === 'string' &&
    isReservationStatus(monitor.status) &&
    typeof monitor.lastChecked === 'string' &&
    typeof monitor.nextCheck === 'string' &&
    typeof monitor.notify === 'string' &&
    typeof monitor.link === 'string' &&
    isStringArray(monitor.history)
  )
}

function isPhotoReference(value: unknown): value is PhotoReference {
  if (typeof value !== 'object' || value === null) return false
  const reference = value as Record<string, unknown>

  return (
    typeof reference.id === 'number' &&
    typeof reference.title === 'string' &&
    typeof reference.url === 'string' &&
    typeof reference.mood === 'string' &&
    isStringArray(reference.tags)
  )
}

function isPhotoProject(value: unknown): value is PhotoProject {
  if (typeof value !== 'object' || value === null) return false
  const project = value as Record<string, unknown>

  return (
    typeof project.id === 'number' &&
    typeof project.title === 'string' &&
    typeof project.category === 'string' &&
    isPhotoProjectStatus(project.status) &&
    typeof project.purpose === 'string' &&
    typeof project.deliverable === 'string' &&
    typeof project.concept === 'string' &&
    typeof project.avoid === 'string' &&
    typeof project.location === 'string' &&
    typeof project.drivePath === 'string' &&
    Array.isArray(project.references) &&
    project.references.every(isPhotoReference) &&
    isStringArray(project.shotList) &&
    isStringArray(project.checklist) &&
    isStringArray(project.outputSteps)
  )
}

function isStoredReservationMonitor(value: unknown): value is StoredReservationMonitor {
  if (typeof value !== 'object' || value === null) return false
  const monitor = value as Record<string, unknown>

  return (
    typeof monitor.id === 'string' &&
    typeof monitor.service === 'string' &&
    typeof monitor.campground === 'string' &&
    typeof monitor.period === 'string' &&
    typeof monitor.condition === 'string' &&
    isReservationStatus(monitor.status) &&
    typeof monitor.url === 'string' &&
    isStringArray(monitor.alertStatuses)
  )
}

function isReservationMonitorsResponse(value: unknown): value is ReservationMonitorsResponse {
  if (typeof value !== 'object' || value === null) return false
  const response = value as Record<string, unknown>

  return Array.isArray(response.monitors) && response.monitors.every(isStoredReservationMonitor)
}

function createMonitorFromStored(storedMonitor: StoredReservationMonitor): ReservationMonitor {
  const hasChecked = Boolean(
    storedMonitor.updatedAt &&
      storedMonitor.createdAt &&
      new Date(storedMonitor.updatedAt).getTime() !== new Date(storedMonitor.createdAt).getTime(),
  )
  const lastChecked = hasChecked && storedMonitor.updatedAt ? formatCheckedAt(storedMonitor.updatedAt) : NOT_CHECKED_TEXT

  return {
    id: storedMonitor.id,
    service: storedMonitor.service,
    campground: storedMonitor.campground,
    period: storedMonitor.period,
    condition: storedMonitor.condition,
    status: storedMonitor.status,
    lastChecked,
    nextCheck: storedMonitor.status === 'available' ? '지금 공식 페이지 확인' : AUTO_RESERVATION_CHECK_TEXT,
    notify: storedMonitor.alertStatuses.includes('available') ? '텔레그램 알림 예정' : '알림 미설정',
    link: storedMonitor.url,
    history: [
      hasChecked ? `${lastChecked} 서버 자동 조회 결과 반영` : '모니터링 조건 추가',
      AUTO_RESERVATION_CHECK_TEXT,
    ],
  }
}

function normalizeBlogItem(item: BlogItem): BlogItem {
  const legacyChecklist = (item as BlogItem & { checklist?: string[] }).checklist
  const fieldAnswers =
    typeof item.fieldAnswers === 'object' && item.fieldAnswers !== null
      ? item.fieldAnswers
      : {
          other: [item.memo, ...(legacyChecklist ?? [])].filter(Boolean).join('\n'),
        }

  return {
    ...item,
    fieldAnswers,
  }
}

function loadBlogItems(): BlogItem[] {
  try {
    const storedValue = window.localStorage.getItem(BLOG_ITEMS_STORAGE_KEY)
    if (!storedValue) return defaultBlogItems

    const parsedValue: unknown = JSON.parse(storedValue)
    if (!Array.isArray(parsedValue) || !parsedValue.every(isBlogItem)) {
      throw new Error('Saved blog items have an invalid shape.')
    }

    return parsedValue.map(normalizeBlogItem)
  } catch (error) {
    console.error(error)
    window.localStorage.removeItem(BLOG_ITEMS_STORAGE_KEY)
    return defaultBlogItems
  }
}

function loadReservationMonitors(): ReservationMonitor[] {
  try {
    const storedValue = window.localStorage.getItem(RESERVATION_MONITORS_STORAGE_KEY)
    if (!storedValue) return defaultReservationMonitors

    const parsedValue: unknown = JSON.parse(storedValue)
    if (!Array.isArray(parsedValue) || !parsedValue.every(isReservationMonitor)) {
      throw new Error('Saved reservation monitors have an invalid shape.')
    }

    return parsedValue
  } catch (error) {
    console.error(error)
    window.localStorage.removeItem(RESERVATION_MONITORS_STORAGE_KEY)
    return defaultReservationMonitors
  }
}

function loadPhotoProjects(): PhotoProject[] {
  try {
    const storedValue = window.localStorage.getItem(PHOTO_PROJECTS_STORAGE_KEY)
    if (!storedValue) return defaultPhotoProjects

    const parsedValue: unknown = JSON.parse(storedValue)
    if (!Array.isArray(parsedValue) || !parsedValue.every(isPhotoProject)) {
      throw new Error('Saved photo projects have an invalid shape.')
    }

    return parsedValue
  } catch (error) {
    console.error(error)
    window.localStorage.removeItem(PHOTO_PROJECTS_STORAGE_KEY)
    return defaultPhotoProjects
  }
}

function getReservationAreaId(_service: ReservationService, areaName: string): string {
  return areaName
}

function getReservationServiceLabel(service: string): string {
  return service === '숲나들e' ? reservationServiceLabels.숲나들e : service
}

function getReservationAreaName(areaId: string): string {
  return areaId.includes(':') ? areaId.split(':').slice(1).join(':') : areaId
}

function getReservationAreaOptions(service: ReservationService): ReservationAreaOption[] {
  const areas = new Map<string, ReservationAreaOption>()

  reservationFacilityOptions
    .filter((facility) => facility.service === service)
    .forEach((facility) => {
      const id = getReservationAreaId(service, facility.park)
      if (!areas.has(id)) {
        areas.set(id, { id, label: facility.park })
      }
    })

  return [...areas.values()]
}

function getDefaultAreaId(service: ReservationService): string {
  return getReservationAreaOptions(service)[0]?.id ?? getReservationAreaId(service, '')
}

function getReservationFacilityOptions(service: ReservationService, areaId: string): ReservationFacilityOption[] {
  const areaName = getReservationAreaName(areaId)

  return reservationFacilityOptions.filter((facility) => facility.service === service && facility.park === areaName)
}

function getDefaultFacilityId(service: ReservationService, areaId = getDefaultAreaId(service)): string {
  return getReservationFacilityOptions(service, areaId)[0]?.id ?? reservationFacilityOptions.find((facility) => facility.service === service)?.id ?? ''
}

function formatReservationDate(dateValue: string): string {
  if (!dateValue) return '날짜 미정'

  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateValue

  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}.${month}.${day} ${weekdays[date.getDay()]}`
}

function formatCheckedAt(isoValue: string): string {
  const date = new Date(isoValue)
  if (Number.isNaN(date.getTime())) return '방금 확인'

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function isReservationCheckResult(value: unknown): value is ReservationCheckResult {
  if (typeof value !== 'object' || value === null) return false
  const result = value as Record<string, unknown>

  return (
    isReservationStatus(result.status) &&
    typeof result.message === 'string' &&
    typeof result.checkedAt === 'string' &&
    typeof result.source === 'string'
  )
}

function createBlogItemFromMemo(memo: string, existingItems: BlogItem[]): BlogItem {
  const trimmedMemo = memo.trim()
  const firstLine = trimmedMemo.split('\n').find((line) => line.trim().length > 0)?.trim()
  const title = firstLine ? firstLine.slice(0, 36) : '새 블로그 글감'
  const nextId = Math.max(0, ...existingItems.map((item) => item.id)) + 1

  return {
    id: nextId,
    title,
    category: '미분류',
    status: 'idea',
    destination: '미정',
    due: '미정',
    intent: '현장 메모를 바탕으로 블로그 글감 정리',
    keywords: [],
    research: ['목적지 기본 정보 확인', '주차와 화장실 확인', '사진 포인트 확인'],
    fieldAnswers: {
      other: trimmedMemo,
    },
    draftAngle: '대충 남긴 메모를 네 블로그 말투의 현장형 정보 글로 정리',
    memo: trimmedMemo,
  }
}

function createPhotoProject(existingProjects: PhotoProject[]): PhotoProject {
  const nextId = Math.max(0, ...existingProjects.map((project) => project.id)) + 1

  return {
    id: nextId,
    title: '새 촬영 프로젝트',
    category: '상업촬영',
    status: 'brief',
    purpose: '촬영 목적을 한 문장으로 정리',
    deliverable: '블로그용 컷, SNS용 컷, 납품본 등 결과물 정의',
    concept: '원하는 톤, 시간대, 빛, 감정, 브랜드 느낌',
    avoid: '피해야 할 연출, 색감, 구도, 과장된 표현',
    location: '촬영 장소 미정',
    drivePath: 'GILUXY/사진촬영/2026/새촬영프로젝트/01_RAW',
    references: [],
    shotList: photoShotGuides.상업촬영,
    checklist: ['촬영 허가 확인', '배터리 충전', 'SD카드 포맷', '렌즈 클리닝', '백업 폴더 생성'],
    outputSteps: ['RAW 저장', '1차 셀렉', '보정본 export', 'Drive 업로드', '최종 링크 기록'],
  }
}

function createMoodSearchText(project: PhotoProject, reference?: PhotoReference): string {
  const baseText = [project.category, project.concept, project.location, reference?.mood, ...(reference?.tags ?? [])]
    .filter(Boolean)
    .join(' ')

  return `${baseText} photography mood reference natural light composition`.trim()
}

function getRecommendedShots(project: PhotoProject): string[] {
  return photoShotGuides[project.category] ?? photoShotGuides.상업촬영
}

function formatFieldAnswers(fieldAnswers: Record<string, string>): string {
  return fieldQuestions
    .map((question) => {
      const answer = fieldAnswers[question.id]?.trim()
      return answer ? `- ${question.label}: ${answer}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

function createDraftPrompt(item: BlogItem): string {
  const keywords = item.keywords.length > 0 ? item.keywords.join(', ') : '메모에서 적절히 추출'

  return `내 블로그 말투로 네이버 노출에 유리한 블로그 초안을 만들어줘.

조건:
- 과장하지 말고 직접 다녀온 사람처럼 담백하게 쓸 것
- 정보는 앞쪽에 배치할 것
- 주차, 화장실, 소요시간, 현장감, 추천/비추천 판단을 넣을 것
- AI가 쓴 것처럼 매끈한 문장은 피하고 짧은 판단 문장을 섞을 것
- 제목 후보 5개, 요약 박스, 본문, 사진 사이 문장, 태그를 만들어줄 것

글감:
- 제목: ${item.title}
- 카테고리: ${item.category}
- 장소/대상: ${item.destination}
- 목적: ${item.intent}
- 핵심 키워드: ${keywords}
- 글 방향: ${item.draftAngle}

조사 포인트:
${item.research.map((note) => `- ${note}`).join('\n')}

현장 질문지 답변:
${formatFieldAnswers(item.fieldAnswers) || '- 아직 없음'}`
}

function App() {
  const [view, setView] = useState<AppView>('home')
  const [items, setItems] = useState<BlogItem[]>(() => loadBlogItems())
  const [photoProjects, setPhotoProjects] = useState<PhotoProject[]>(() => loadPhotoProjects())
  const [selectedPhotoProjectId, setSelectedPhotoProjectId] = useState(defaultPhotoProjects[0].id)
  const [selectedId, setSelectedId] = useState(defaultBlogItems[0].id)
  const [activeStatus, setActiveStatus] = useState<Status | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [quickMemo, setQuickMemo] = useState(
    '변산 마실길 샤스타데이지 이번 주말 확인. 주차, 화장실, 개화율, 사진 포인트 중심.',
  )
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    window.localStorage.setItem(BLOG_ITEMS_STORAGE_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    window.localStorage.setItem(PHOTO_PROJECTS_STORAGE_KEY, JSON.stringify(photoProjects))
  }, [photoProjects])

  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0] ?? defaultBlogItems[0]

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const statusFilteredItems = activeStatus === 'all' ? items : items.filter((item) => item.status === activeStatus)
    if (!normalizedQuery) return statusFilteredItems

    return statusFilteredItems.filter((item) => {
      const searchableText = [
        item.title,
        item.category,
        item.destination,
        item.intent,
        item.draftAngle,
        item.memo,
        ...item.keywords,
        ...item.research,
        ...Object.values(item.fieldAnswers),
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(normalizedQuery)
    })
  }, [activeStatus, items, searchQuery])

  const addQuickMemo = () => {
    const newItem = createBlogItemFromMemo(quickMemo, items)
    setItems([newItem, ...items])
    setSelectedId(newItem.id)
    setQuickMemo('')
  }

  const updateSelectedStatus = (status: Status) => {
    setItems((currentItems) => currentItems.map((item) => (item.id === selectedItem.id ? { ...item, status } : item)))
  }

  const updateSelectedFieldAnswer = (questionId: string, answer: string) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === selectedItem.id
          ? {
              ...item,
              fieldAnswers: {
                ...item.fieldAnswers,
                [questionId]: answer,
              },
              memo: questionId === 'other' ? answer : item.memo,
            }
          : item,
      ),
    )
  }

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(createDraftPrompt(selectedItem))
      setCopyState('success')
    } catch (error) {
      console.error(error)
      setCopyState('error')
    }
  }

  return (
    <div className="app-shell">
      <Sidebar view={view} onNavigate={setView} />
      <main className={view === 'home' ? 'workspace home-workspace' : 'workspace'}>
        {view === 'home' ? (
          <HomeScreen
            onOpenBlog={() => setView('blog')}
            onOpenPhoto={() => setView('photo')}
            onOpenReservation={() => setView('reservation')}
          />
        ) : null}
        {view === 'reservation' ? <ReservationWorkspace /> : null}
        {view === 'photo' ? (
          <PhotoWorkspace
            projects={photoProjects}
            selectedProjectId={selectedPhotoProjectId}
            setProjects={setPhotoProjects}
            setSelectedProjectId={setSelectedPhotoProjectId}
          />
        ) : null}
        {view === 'blog' ? (
          <BlogWorkspace
            activeStatus={activeStatus}
            filteredItems={filteredItems}
            items={items}
            quickMemo={quickMemo}
            searchQuery={searchQuery}
            copyState={copyState}
            onAddQuickMemo={addQuickMemo}
            onCopyPrompt={copyPrompt}
            selectedId={selectedId}
            selectedItem={selectedItem}
            setActiveStatus={setActiveStatus}
            setQuickMemo={setQuickMemo}
            setSearchQuery={setSearchQuery}
            setSelectedId={setSelectedId}
            updateSelectedFieldAnswer={updateSelectedFieldAnswer}
            updateSelectedStatus={updateSelectedStatus}
          />
        ) : null}
      </main>
    </div>
  )
}

function Sidebar({ view, onNavigate }: { view: AppView; onNavigate: (view: AppView) => void }) {
  return (
    <aside className="sidebar" aria-label="GILUXY navigation">
      <div className="brand-block">
        <div className="brand-mark">G</div>
        <div>
          <p className="eyebrow">Personal Groupware</p>
          <h1>GILUXY</h1>
        </div>
      </div>

      <nav className="nav-groups">
        <section className="nav-group">
          <p>GILUXY</p>
          <button className={view === 'home' ? 'nav-item active' : 'nav-item'} type="button" onClick={() => onNavigate('home')}>
            <Home size={18} strokeWidth={1.8} />
            <span>홈</span>
          </button>
          <button className="nav-item" type="button">
            <LayoutDashboard size={18} strokeWidth={1.8} />
            <span>전체 업무</span>
          </button>
        </section>

        <section className="nav-group">
          <p>저스트레킹</p>
          <button className={view === 'blog' ? 'nav-item active' : 'nav-item'} type="button" onClick={() => onNavigate('blog')}>
            <FileText size={18} strokeWidth={1.8} />
            <span>블로그</span>
          </button>
          <button className="nav-item" type="button">
            <Video size={18} strokeWidth={1.8} />
            <span>유튜브</span>
          </button>
        </section>

        <section className="nav-group">
          <p>모니터</p>
          <button
            className={view === 'reservation' ? 'nav-item active' : 'nav-item'}
            type="button"
            onClick={() => onNavigate('reservation')}
          >
            <Tent size={18} strokeWidth={1.8} />
            <span>야영장 예약</span>
          </button>
        </section>

        <section className="nav-group">
          <p>제작</p>
          <button className={view === 'photo' ? 'nav-item active' : 'nav-item'} type="button" onClick={() => onNavigate('photo')}>
            <Camera size={18} strokeWidth={1.8} />
            <span>사진촬영</span>
          </button>
          <button className="nav-item" type="button">
            <Plane size={18} strokeWidth={1.8} />
            <span>드론촬영</span>
          </button>
          <button className="nav-item" type="button">
            <MapPin size={18} strokeWidth={1.8} />
            <span>촬영지</span>
          </button>
        </section>

        <section className="nav-group">
          <p>관리</p>
          <button className="nav-item" type="button">
            <Archive size={18} strokeWidth={1.8} />
            <span>자료보관함</span>
          </button>
          <button className="nav-item" type="button">
            <Settings size={18} strokeWidth={1.8} />
            <span>설정</span>
          </button>
        </section>
      </nav>
    </aside>
  )
}

function HomeScreen({
  onOpenBlog,
  onOpenPhoto,
  onOpenReservation,
}: {
  onOpenBlog: () => void
  onOpenPhoto: () => void
  onOpenReservation: () => void
}) {
  return (
    <>
      <header className="home-hero">
        <div>
          <p className="eyebrow">GILUXY APPS</p>
          <h2>필요한 작업을 앱처럼 꺼내 쓰는 개인 그룹웨어</h2>
          <p>저스트레킹, 촬영, 자료관리 기능을 각각의 앱으로 나누고 필요한 화면부터 하나씩 완성합니다.</p>
        </div>
        <button className="primary-button" type="button" onClick={onOpenBlog}>
          블로그로 이동
          <ChevronRight size={17} />
        </button>
      </header>

      <section className="app-grid" aria-label="GILUXY apps">
        {appTiles.map((tile) => {
          const Icon = tile.icon
          const clickable = tile.enabled
          const openTile = () => {
            if (tile.id === 'blog') onOpenBlog()
            if (tile.id === 'reservation') onOpenReservation()
            if (tile.id === 'photo') onOpenPhoto()
          }
          return (
            <button
              className={clickable ? 'app-tile available' : 'app-tile'}
              disabled={!clickable}
              key={tile.id}
              type="button"
              onClick={clickable ? openTile : undefined}
            >
              <span className="app-icon">
                <Icon size={28} strokeWidth={1.8} />
              </span>
              <span className="app-group">{tile.group}</span>
              <strong>{tile.title}</strong>
              <span className="app-description">{tile.description}</span>
              <span className={tile.enabled ? 'app-state ready' : 'app-state'}>{tile.state}</span>
            </button>
          )
        })}
      </section>

      <section className="home-bottom-grid">
        <article className="home-panel">
          <p className="eyebrow">최근 작업</p>
          <h3>블로그와 야영장 예약 모니터가 준비됨</h3>
          <p>글감 기록은 블로그 앱에서, 예약 빈자리 조건 관리는 야영장 예약 앱에서 시작합니다.</p>
        </article>
        <article className="home-panel">
          <p className="eyebrow">다음 구현</p>
          <h3>앱별 독립 화면</h3>
          <p>각 앱은 별도 데이터와 체크리스트를 가지되, 장소와 자료보관함은 공통 모듈로 연결합니다.</p>
        </article>
      </section>
    </>
  )
}

function PhotoWorkspace({
  projects,
  selectedProjectId,
  setProjects,
  setSelectedProjectId,
}: {
  projects: PhotoProject[]
  selectedProjectId: number
  setProjects: Dispatch<SetStateAction<PhotoProject[]>>
  setSelectedProjectId: Dispatch<SetStateAction<number>>
}) {
  const [referenceUrl, setReferenceUrl] = useState('')
  const [referenceMood, setReferenceMood] = useState('')
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0]
  const recommendedShots = selectedProject ? getRecommendedShots(selectedProject) : []
  const moodSearchText = selectedProject ? createMoodSearchText(selectedProject, selectedProject.references[0]) : ''
  const moodSearchUrl = `https://unsplash.com/s/photos/${encodeURIComponent(moodSearchText)}`
  const pexelsSearchUrl = `https://www.pexels.com/search/${encodeURIComponent(moodSearchText)}/`

  const addProject = () => {
    const nextProject = createPhotoProject(projects)
    setProjects((currentProjects) => [nextProject, ...currentProjects])
    setSelectedProjectId(nextProject.id)
  }

  const updateSelectedProject = (patch: Partial<PhotoProject>) => {
    if (!selectedProject) return
    setProjects((currentProjects) =>
      currentProjects.map((project) => (project.id === selectedProject.id ? { ...project, ...patch } : project)),
    )
  }

  const addReference = () => {
    if (!selectedProject || !referenceUrl.trim()) return

    const nextReference: PhotoReference = {
      id: Math.max(0, ...selectedProject.references.map((reference) => reference.id)) + 1,
      title: referenceUrl.replace(/^https?:\/\//, '').split('/')[0] || '외부 레퍼런스',
      url: referenceUrl.trim(),
      mood: referenceMood.trim() || selectedProject.concept,
      tags: [selectedProject.category, ...selectedProject.concept.split(/[,\s]+/).filter(Boolean).slice(0, 4)],
    }

    updateSelectedProject({
      references: [nextReference, ...selectedProject.references],
      status: 'reference',
    })
    setReferenceUrl('')
    setReferenceMood('')
  }

  const applyShotGuide = () => {
    if (!selectedProject) return
    updateSelectedProject({ shotList: recommendedShots })
  }

  if (!selectedProject) {
    return (
      <div className="empty-state">
        <strong>사진 촬영 프로젝트가 없습니다.</strong>
        <p>새 프로젝트를 만들어 촬영 목적과 레퍼런스를 정리하세요.</p>
      </div>
    )
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Production / Photo</p>
          <h2>사진 촬영 보드</h2>
        </div>
        <button className="primary-button" type="button" onClick={addProject}>
          <Plus size={17} />
          프로젝트 추가
        </button>
      </header>

      <section className="summary-grid">
        <article className="metric-card">
          <Camera size={20} />
          <div>
            <strong>{projects.length}</strong>
            <span>촬영 프로젝트</span>
          </div>
        </article>
        <article className="metric-card">
          <Tags size={20} />
          <div>
            <strong>{selectedProject.references.length}</strong>
            <span>무드 레퍼런스</span>
          </div>
        </article>
        <article className="metric-card">
          <ClipboardList size={20} />
          <div>
            <strong>{selectedProject.shotList.length}</strong>
            <span>샷 리스트</span>
          </div>
        </article>
        <article className="metric-card">
          <Archive size={20} />
          <div>
            <strong>Drive</strong>
            <span>결과물 관리</span>
          </div>
        </article>
      </section>

      <section className="photo-grid">
        <div className="board-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Projects</p>
              <h3>촬영 프로젝트</h3>
            </div>
            <div className="status-tabs">
              {Object.entries(photoStatusMeta).map(([status, meta]) => (
                <button
                  className={selectedProject.status === status ? 'active' : ''}
                  key={status}
                  type="button"
                  onClick={() => updateSelectedProject({ status: status as PhotoProjectStatus })}
                >
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          <div className="photo-project-list">
            {projects.map((project) => (
              <button
                className={project.id === selectedProject.id ? 'photo-project-card selected' : 'photo-project-card'}
                key={project.id}
                type="button"
                onClick={() => setSelectedProjectId(project.id)}
              >
                <div className="card-topline">
                  <span className={`status-pill ${photoStatusMeta[project.status].tone}`}>{photoStatusMeta[project.status].label}</span>
                  <span>{project.category}</span>
                </div>
                <strong>{project.title}</strong>
                <p>{project.purpose}</p>
                <span>{project.deliverable}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="detail-panel">
          <div className="detail-header">
            <span className={`status-pill ${photoStatusMeta[selectedProject.status].tone}`}>
              {photoStatusMeta[selectedProject.status].label}
            </span>
            <h3>{selectedProject.title}</h3>
            <p>{selectedProject.purpose}</p>
          </div>

          <section className="detail-section">
            <h4>
              <FileText size={17} />
              촬영 프로젝트 정의
            </h4>
            <div className="photo-form-grid">
              <label className="form-field">
                <span>프로젝트명</span>
                <input value={selectedProject.title} onChange={(event) => updateSelectedProject({ title: event.target.value })} />
              </label>
              <label className="form-field">
                <span>카테고리</span>
                <select
                  value={selectedProject.category}
                  onChange={(event) =>
                    updateSelectedProject({
                      category: event.target.value,
                      shotList: photoShotGuides[event.target.value] ?? selectedProject.shotList,
                    })
                  }
                >
                  {Object.keys(photoShotGuides).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>촬영 장소</span>
                <input value={selectedProject.location} onChange={(event) => updateSelectedProject({ location: event.target.value })} />
              </label>
            </div>
            <label className="form-field spacious-field">
              <span>목적</span>
              <textarea className="field-note-input" value={selectedProject.purpose} onChange={(event) => updateSelectedProject({ purpose: event.target.value })} />
            </label>
            <label className="form-field spacious-field">
              <span>결과물</span>
              <textarea className="field-note-input" value={selectedProject.deliverable} onChange={(event) => updateSelectedProject({ deliverable: event.target.value })} />
            </label>
          </section>

          <section className="detail-section">
            <h4>
              <Sparkles size={17} />
              촬영 콘셉트
            </h4>
            <label className="form-field spacious-field">
              <span>원하는 느낌</span>
              <textarea className="field-note-input" value={selectedProject.concept} onChange={(event) => updateSelectedProject({ concept: event.target.value })} />
            </label>
            <label className="form-field spacious-field">
              <span>피해야 할 느낌</span>
              <textarea className="field-note-input" value={selectedProject.avoid} onChange={(event) => updateSelectedProject({ avoid: event.target.value })} />
            </label>
          </section>

          <section className="detail-section">
            <h4>
              <ExternalLink size={17} />
              무드 레퍼런스
            </h4>
            <div className="reference-capture">
              <input placeholder="외부 이미지나 보드 링크" value={referenceUrl} onChange={(event) => setReferenceUrl(event.target.value)} />
              <input placeholder="분위기 메모" value={referenceMood} onChange={(event) => setReferenceMood(event.target.value)} />
              <button className="primary-button" type="button" onClick={addReference} disabled={!referenceUrl.trim()}>
                <Plus size={17} />
                저장
              </button>
            </div>
            <div className="reference-actions">
              <a href={moodSearchUrl} target="_blank" rel="noreferrer">
                Unsplash 비슷한 분위기
                <ExternalLink size={15} />
              </a>
              <a href={pexelsSearchUrl} target="_blank" rel="noreferrer">
                Pexels 비슷한 분위기
                <ExternalLink size={15} />
              </a>
            </div>
            <div className="reference-list">
              {selectedProject.references.map((reference) => (
                <a className="reference-card" href={reference.url} key={reference.id} target="_blank" rel="noreferrer">
                  <strong>{reference.title}</strong>
                  <span>{reference.mood}</span>
                </a>
              ))}
            </div>
          </section>

          <section className="detail-section">
            <h4>
              <ClipboardList size={17} />
              추천 샷 리스트
            </h4>
            <button className="ghost-button compact-action" type="button" onClick={applyShotGuide}>
              카테고리 매뉴얼 적용
            </button>
            <ul>
              {selectedProject.shotList.map((shot) => (
                <li key={shot}>{shot}</li>
              ))}
            </ul>
          </section>

          <section className="detail-section">
            <h4>
              <CheckCircle2 size={17} />
              촬영 체크리스트
            </h4>
            <ul>
              {selectedProject.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="detail-section">
            <h4>
              <Archive size={17} />
              결과물 관리
            </h4>
            <div className="drive-path">
              <span>Google Drive 저장 위치</span>
              <strong>{selectedProject.drivePath}</strong>
            </div>
            <ul>
              {selectedProject.outputSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </>
  )
}

function ReservationWorkspace() {
  const [monitors, setMonitors] = useState<ReservationMonitor[]>(() => loadReservationMonitors())
  const [selectedMonitorId, setSelectedMonitorId] = useState<ReservationMonitor['id']>(defaultReservationMonitors[0].id)
  const [reservationFilter, setReservationFilter] = useState<ReservationStatus | 'all'>('all')
  const [isAddingMonitor, setIsAddingMonitor] = useState(false)
  const [newMonitor, setNewMonitor] = useState<ReservationMonitorDraft>({
    service: '국립공원공단',
    areaId: getReservationAreaId('국립공원공단', '월악산'),
    facilityId: 'knps-b111002',
    startDate: '2026-06-13',
    nights: '1',
    notify: '텔레그램 알림 예정',
  })
  const [testNotice, setTestNotice] = useState('')
  const [checkNotice, setCheckNotice] = useState('')
  const [checkingMonitorId, setCheckingMonitorId] = useState<ReservationMonitor['id'] | null>(null)

  useEffect(() => {
    window.localStorage.setItem(RESERVATION_MONITORS_STORAGE_KEY, JSON.stringify(monitors))
  }, [monitors])

  useEffect(() => {
    let isActive = true

    async function loadStoredMonitors() {
      try {
        const response = await fetch('/api/reservation-monitors')
        if (!response.ok) return

        const data: unknown = await response.json()
        if (!isReservationMonitorsResponse(data) || data.monitors.length === 0 || !isActive) return

        const storedMonitors = data.monitors.map(createMonitorFromStored)
        setMonitors(storedMonitors)
        setSelectedMonitorId(storedMonitors[0].id)
      } catch (error) {
        console.error(error)
      }
    }

    void loadStoredMonitors()

    return () => {
      isActive = false
    }
  }, [])

  const filteredMonitors = useMemo(
    () =>
      reservationFilter === 'all'
        ? monitors
        : monitors.filter((monitor) => monitor.status === reservationFilter),
    [monitors, reservationFilter],
  )
  const selectedMonitor =
    filteredMonitors.find((monitor) => monitor.id === selectedMonitorId) ?? filteredMonitors[0]
  const notifyingMonitorCount = monitors.filter((monitor) => monitor.notify !== '알림 미설정').length
  const availableMonitorCount = monitors.filter((monitor) => monitor.status === 'available').length
  const areaOptions = getReservationAreaOptions(newMonitor.service)
  const selectedArea = areaOptions.find((area) => area.id === newMonitor.areaId) ?? areaOptions[0]
  const facilityOptions = getReservationFacilityOptions(newMonitor.service, selectedArea?.id ?? '')
  const selectedFacility =
    facilityOptions.find((facility) => facility.id === newMonitor.facilityId) ?? facilityOptions[0]
  const areaFieldLabel = newMonitor.service === '숲나들e' ? '광역 지역' : '국립공원'
  const facilityFieldLabel = newMonitor.service === '숲나들e' ? '휴양림/야영장' : '야영장'
  const reservationLink = selectedFacility?.link ?? reservationServiceLinks[newMonitor.service]
  const periodText = `${formatReservationDate(newMonitor.startDate)}부터 ${newMonitor.nights}박`
  const conditionText = `${newMonitor.nights}박 빈자리 알림`

  const addMonitor = async () => {
    if (!selectedFacility || !newMonitor.startDate) return

    const campgroundName =
      selectedFacility.service === '숲나들e' ? selectedFacility.label : `[${selectedFacility.park}] ${selectedFacility.label}`

    const monitorPayload = {
      service: newMonitor.service,
      campground: campgroundName,
      period: periodText,
      condition: conditionText,
      status: 'watching',
      url: reservationLink,
      alertStatuses: ['available'],
    }

    try {
      const response = await fetch('/api/reservation-monitors', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(monitorPayload),
      })
      const data: unknown = await response.json()

      if (!response.ok) {
        const message =
          typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
            ? data.error
            : '모니터링 조건 저장에 실패했습니다.'
        throw new Error(message)
      }

      if (
        typeof data !== 'object' ||
        data === null ||
        !('monitor' in data) ||
        !isStoredReservationMonitor((data as { monitor: unknown }).monitor)
      ) {
        throw new Error('모니터링 조건 저장 응답 형식이 올바르지 않습니다.')
      }

      const nextMonitor = createMonitorFromStored((data as { monitor: StoredReservationMonitor }).monitor)
      setMonitors((currentMonitors) => [nextMonitor, ...currentMonitors])
      setSelectedMonitorId(nextMonitor.id)
      setReservationFilter('watching')
      setIsAddingMonitor(false)
      setCheckNotice('조건이 DB에 저장됐습니다. 다음 자동조회부터 서버가 이 조건을 확인합니다.')
    } catch (error) {
      const message = error instanceof Error ? error.message : '모니터링 조건 저장에 실패했습니다.'
      setCheckNotice(`저장 실패: ${message}`)
    }
  }

  const triggerTestNotice = () => {
    if (!selectedMonitor) return

    setTestNotice(
      `[알림 테스트] ${selectedMonitor.service} / ${selectedMonitor.campground} / ${selectedMonitor.period} 조건으로 빈자리 감지 메시지를 보냅니다.`,
    )
  }

  const deleteSelectedMonitor = async () => {
    if (!selectedMonitor || checkingMonitorId !== null) return

    if (typeof selectedMonitor.id === 'string') {
      try {
        const response = await fetch(`/api/reservation-monitors?id=${encodeURIComponent(selectedMonitor.id)}`, {
          method: 'DELETE',
        })
        if (!response.ok) throw new Error('DB 조건 삭제에 실패했습니다.')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'DB 조건 삭제에 실패했습니다.'
        setCheckNotice(`삭제 실패: ${message}`)
        return
      }
    }

    const nextMonitors = monitors.filter((monitor) => monitor.id !== selectedMonitor.id)
    const nextVisibleMonitors =
      reservationFilter === 'all'
        ? nextMonitors
        : nextMonitors.filter((monitor) => monitor.status === reservationFilter)

    setMonitors(nextMonitors)
    setSelectedMonitorId(nextVisibleMonitors[0]?.id ?? nextMonitors[0]?.id ?? 0)
    setCheckNotice('')
    setTestNotice('')
  }

  const checkSelectedMonitor = async () => {
    if (!selectedMonitor || checkingMonitorId !== null) return

    setCheckingMonitorId(selectedMonitor.id)
    setCheckNotice('')

    const query = new URLSearchParams({
      service: selectedMonitor.service,
      campground: selectedMonitor.campground,
      period: selectedMonitor.period,
      condition: selectedMonitor.condition,
      url: selectedMonitor.link,
    })

    try {
      const response = await fetch(`/api/check-reservation?${query.toString()}`)
      const data: unknown = await response.json()

      if (!response.ok) {
        const message =
          typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
            ? data.error
            : '예약 페이지 조회에 실패했습니다.'
        throw new Error(message)
      }

      if (!isReservationCheckResult(data)) {
        throw new Error('예약 조회 응답 형식이 올바르지 않습니다.')
      }

      const checkedAt = formatCheckedAt(data.checkedAt)
      const historyMessage = `${checkedAt} ${data.message}`

      setMonitors((currentMonitors) =>
        currentMonitors.map((monitor) =>
          monitor.id === selectedMonitor.id
            ? {
                ...monitor,
                status: data.status,
                lastChecked: checkedAt,
                nextCheck: data.status === 'available' ? '지금 공식 페이지 확인' : '필요하면 다시 조회',
                history: [historyMessage, ...monitor.history].slice(0, 8),
              }
            : monitor,
        ),
      )
      if (typeof selectedMonitor.id === 'string') {
        await fetch(`/api/reservation-monitors?id=${encodeURIComponent(selectedMonitor.id)}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: data.status }),
        })
      }
      setCheckNotice(historyMessage)
    } catch (error) {
      const checkedAt = formatCheckedAt(new Date().toISOString())
      const message = error instanceof Error ? error.message : '예약 페이지 조회에 실패했습니다.'
      const historyMessage = `${checkedAt} 조회 실패: ${message}`

      setMonitors((currentMonitors) =>
        currentMonitors.map((monitor) =>
          monitor.id === selectedMonitor.id
            ? {
                ...monitor,
                lastChecked: checkedAt,
                nextCheck: '조회 설정 확인 필요',
                history: [historyMessage, ...monitor.history].slice(0, 8),
              }
            : monitor,
        ),
      )
      setCheckNotice(historyMessage)
    } finally {
      setCheckingMonitorId(null)
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">모니터 / 야영장 예약</p>
          <h2>야영장 빈자리 알림판</h2>
        </div>
      </header>

      <section className="summary-grid" aria-label="Reservation monitor summary">
        <article className="metric-card">
          <Tent size={20} />
          <div>
            <strong>{monitors.length}</strong>
            <span>등록 조건</span>
          </div>
        </article>
        <article className="metric-card">
          <Bell size={20} />
          <div>
            <strong>{notifyingMonitorCount}</strong>
            <span>알림 예정</span>
          </div>
        </article>
        <article className="metric-card">
          <Sparkles size={20} />
          <div>
            <strong>{availableMonitorCount}</strong>
            <span>빈자리 감지</span>
          </div>
        </article>
        <article className="metric-card">
          <BadgeCheck size={20} />
          <div>
            <strong>2시간</strong>
            <span>자동 조회 주기</span>
          </div>
        </article>
      </section>

      <section className="reservation-notice">
        <div>
          <p className="eyebrow">Scope</p>
          <h3>빈자리 조회와 알림은 자동화</h3>
          <p>서버가 DB에 저장된 조건을 2시간마다 확인합니다. 정각 혼잡을 피하려고 홀수시 17분 전후에 실행합니다.</p>
        </div>
        <div className="monitor-actions">
          <button className="ghost-button" type="button" onClick={() => setIsAddingMonitor((isAdding) => !isAdding)}>
            <Plus size={17} />
            모니터링 조건 추가
          </button>
          <button className="primary-button" type="button" onClick={triggerTestNotice}>
            <Bell size={17} />
            알림 테스트
          </button>
        </div>
      </section>

      {testNotice ? <div className="test-notice">{testNotice}</div> : null}
      {checkNotice ? <div className="test-notice">{checkNotice}</div> : null}

      {isAddingMonitor ? (
        <section className="monitor-form" aria-label="모니터링 조건 추가">
          <div>
            <p className="eyebrow">New Monitor</p>
            <h3>빈자리 알림 조건 추가</h3>
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span>서비스</span>
              <select
                value={newMonitor.service}
                onChange={(event) => {
                  const service = event.target.value as ReservationService
                  const areaId = getDefaultAreaId(service)
                  setNewMonitor({
                    ...newMonitor,
                    service,
                    areaId,
                    facilityId: getDefaultFacilityId(service, areaId),
                  })
                }}
              >
                <option value="국립공원공단">{reservationServiceLabels.국립공원공단}</option>
                <option value="숲나들e">{reservationServiceLabels.숲나들e}</option>
              </select>
            </label>
            <label className="form-field">
              <span>{areaFieldLabel}</span>
              <select
                key={`${newMonitor.service}-area`}
                value={selectedArea?.id ?? ''}
                onChange={(event) => {
                  const areaId = event.target.value
                  setNewMonitor({
                    ...newMonitor,
                    areaId,
                    facilityId: getDefaultFacilityId(newMonitor.service, areaId),
                  })
                }}
              >
                {areaOptions.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>{facilityFieldLabel}</span>
              <select
                key={`${newMonitor.service}-${selectedArea?.id ?? 'area'}-facility`}
                value={selectedFacility?.id ?? ''}
                onChange={(event) => setNewMonitor({ ...newMonitor, facilityId: event.target.value })}
              >
                {facilityOptions.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>날짜</span>
              <input
                type="date"
                value={newMonitor.startDate}
                onChange={(event) => setNewMonitor({ ...newMonitor, startDate: event.target.value })}
              />
            </label>
            <label className="form-field">
              <span>숙박수</span>
              <select
                value={newMonitor.nights}
                onChange={(event) => setNewMonitor({ ...newMonitor, nights: event.target.value as StayNights })}
              >
                <option value="1">1박</option>
                <option value="2">2박</option>
              </select>
            </label>
            <label className="form-field">
              <span>알림</span>
              <select
                value={newMonitor.notify}
                onChange={(event) => setNewMonitor({ ...newMonitor, notify: event.target.value })}
              >
                <option>텔레그램 알림 예정</option>
                <option>앱 안에서만 기록</option>
                <option>알림 미설정</option>
              </select>
            </label>
            <div className="form-field link-preview">
              <span>예약 페이지</span>
              <a href={reservationLink} target="_blank" rel="noreferrer">
                {getReservationServiceLabel(newMonitor.service)} 예약 페이지
                <ExternalLink size={15} />
              </a>
            </div>
          </div>
          <div className="form-actions">
            <button className="ghost-button" type="button" onClick={() => setIsAddingMonitor(false)}>
              취소
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={addMonitor}
              disabled={!selectedFacility || !newMonitor.startDate}
            >
              <Plus size={17} />
              조건 저장
            </button>
          </div>
        </section>
      ) : null}

      <section className="reservation-grid">
        <div className="board-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Watch List</p>
              <h3>예약 모니터 조건</h3>
            </div>
            <div className="status-tabs reservation-filter" role="tablist" aria-label="예약 모니터 상태 필터">
              <button
                className={reservationFilter === 'all' ? 'active' : ''}
                type="button"
                onClick={() => setReservationFilter('all')}
              >
                전체
              </button>
              {(['watching', 'available', 'closed'] as ReservationStatus[]).map((status) => (
                <button
                  className={reservationFilter === status ? 'active' : ''}
                  key={status}
                  type="button"
                  onClick={() => setReservationFilter(status)}
                >
                  {reservationStatusMeta[status].label}
                </button>
              ))}
            </div>
          </div>

          <div className="monitor-list">
            {filteredMonitors.length > 0 ? (
              filteredMonitors.map((monitor) => (
                <button
                  className={selectedMonitor?.id === monitor.id ? 'monitor-card selected' : 'monitor-card'}
                  key={monitor.id}
                  type="button"
                  onClick={() => setSelectedMonitorId(monitor.id)}
                >
                  <div className="card-topline">
                    <span className={`status-pill ${reservationStatusMeta[monitor.status].tone}`}>
                      {reservationStatusMeta[monitor.status].label}
                    </span>
                    <span>{getReservationServiceLabel(monitor.service)}</span>
                  </div>
                  <strong>{monitor.campground}</strong>
                  <p>{monitor.period}</p>
                  <span>{monitor.condition}</span>
                </button>
              ))
            ) : (
              <div className="empty-state">
                <strong>표시할 조건이 없습니다.</strong>
                <p>다른 상태를 선택하거나 새 모니터링 조건을 추가하세요.</p>
              </div>
            )}
          </div>
        </div>

        {selectedMonitor ? (
          <aside className="detail-panel">
            <div className="detail-header">
              <span className={`status-pill ${reservationStatusMeta[selectedMonitor.status].tone}`}>
                {reservationStatusMeta[selectedMonitor.status].label}
              </span>
              <h3>{selectedMonitor.campground}</h3>
              <p>{selectedMonitor.condition}</p>
              <div className="detail-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={checkSelectedMonitor}
                  disabled={checkingMonitorId !== null}
                >
                  <Search size={17} />
                  {checkingMonitorId === selectedMonitor.id
                    ? '조회 중'
                    : selectedMonitor.lastChecked === NOT_CHECKED_TEXT
                      ? '지금 조회'
                      : '다시 조회'}
                </button>
                <button
                  className="ghost-button danger-button"
                  type="button"
                  onClick={deleteSelectedMonitor}
                  disabled={checkingMonitorId !== null}
                >
                  <Trash2 size={17} />
                  카드 삭제
                </button>
              </div>
            </div>

            <section className="detail-section">
              <h4>
                <CalendarDays size={17} />
                감시 조건
              </h4>
              <div className="reservation-facts">
                <span>서비스</span>
                <strong>{getReservationServiceLabel(selectedMonitor.service)}</strong>
                <span>기간</span>
                <strong>{selectedMonitor.period}</strong>
                <span>마지막 확인</span>
                <strong>{selectedMonitor.lastChecked}</strong>
                <span>다음 확인</span>
                <strong>{selectedMonitor.nextCheck}</strong>
                <span>알림</span>
                <strong>{selectedMonitor.notify}</strong>
              </div>
            </section>

            <section className="detail-section">
              <h4>
                <ClipboardList size={17} />
                상태 기록
              </h4>
              <ul>
                {selectedMonitor.history.map((history) => (
                  <li key={history}>{history}</li>
                ))}
              </ul>
            </section>

            <section className="detail-section">
              <h4>
                <ExternalLink size={17} />
                예약 페이지
              </h4>
              <a className="reservation-link" href={selectedMonitor.link} target="_blank" rel="noreferrer">
                예약 페이지 열기
                <ExternalLink size={16} />
              </a>
            </section>
          </aside>
        ) : null}
      </section>
    </>
  )
}

function BlogWorkspace({
  activeStatus,
  filteredItems,
  items,
  quickMemo,
  searchQuery,
  copyState,
  onAddQuickMemo,
  onCopyPrompt,
  selectedId,
  selectedItem,
  setActiveStatus,
  setQuickMemo,
  setSearchQuery,
  setSelectedId,
  updateSelectedFieldAnswer,
  updateSelectedStatus,
}: {
  activeStatus: Status | 'all'
  filteredItems: BlogItem[]
  items: BlogItem[]
  quickMemo: string
  searchQuery: string
  copyState: 'idle' | 'success' | 'error'
  onAddQuickMemo: () => void
  onCopyPrompt: () => void
  selectedId: number
  selectedItem: BlogItem
  setActiveStatus: (status: Status | 'all') => void
  setQuickMemo: (memo: string) => void
  setSearchQuery: (query: string) => void
  setSelectedId: (id: number) => void
  updateSelectedFieldAnswer: (questionId: string, answer: string) => void
  updateSelectedStatus: (status: Status) => void
}) {
  const draftPrompt = createDraftPrompt(selectedItem)

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">저스트레킹 / 블로그</p>
          <h2>현장형 블로그 업무판</h2>
        </div>
      </header>

      <section className="summary-grid" aria-label="Blog summary">
        <article className="metric-card">
          <ClipboardList size={20} />
          <div>
            <strong>{items.length}</strong>
            <span>진행 글감</span>
          </div>
        </article>
        <article className="metric-card">
          <Compass size={20} />
          <div>
            <strong>3</strong>
            <span>현장 확인 필요</span>
          </div>
        </article>
        <article className="metric-card">
          <Sparkles size={20} />
          <div>
            <strong>2</strong>
            <span>초안화 가능</span>
          </div>
        </article>
        <article className="metric-card">
          <BadgeCheck size={20} />
          <div>
            <strong>0</strong>
            <span>이번 주 발행</span>
          </div>
        </article>
      </section>

      <section className="quick-capture" aria-label="Quick capture">
        <div>
          <p className="eyebrow">First Action</p>
          <h3>아이디어 먼저 적기</h3>
          <p>장소, 본 것, 느낌, 확인할 것만 단답으로 남기면 글감 카드가 됩니다.</p>
        </div>
        <textarea
          value={quickMemo}
          onChange={(event) => setQuickMemo(event.target.value)}
          placeholder="예) 양양 낙산 차박 / 화장실 가까움 / 폭죽 소음 가능 / 취사는 비추"
        />
        <div className="capture-actions">
          <button className="ghost-button" type="button">
            <Mic size={17} />
            음성메모
          </button>
          <button className="primary-button" type="button" onClick={onAddQuickMemo} disabled={quickMemo.trim().length === 0}>
            <Plus size={17} />
            글감 저장
          </button>
        </div>
      </section>

      <section className="content-grid">
        <div className="board-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Pipeline</p>
              <h3>블로그 글감</h3>
            </div>
            <div className="board-tools">
              <label className="search-box compact">
                <Search size={17} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="저장된 글감 검색"
                />
              </label>
              <div className="status-tabs" role="tablist" aria-label="Filter by status">
                <button className={activeStatus === 'all' ? 'active' : ''} type="button" onClick={() => setActiveStatus('all')}>
                  전체
                </button>
                {statusOrder.map((status) => (
                  <button
                    className={activeStatus === status ? 'active' : ''}
                    type="button"
                    key={status}
                    onClick={() => setActiveStatus(status)}
                  >
                    {statusMeta[status].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="blog-list">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
              <button
                className={selectedId === item.id ? 'blog-card selected' : 'blog-card'}
                type="button"
                key={item.id}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="card-topline">
                  <span className={`status-pill ${statusMeta[item.status].tone}`}>{statusMeta[item.status].label}</span>
                  <span>{item.category}</span>
                </div>
                <strong>{item.title}</strong>
                <p>{item.intent}</p>
                <div className="card-meta">
                  <span>
                    <MapPin size={15} />
                    {item.destination}
                  </span>
                  <span>
                    <CalendarDays size={15} />
                    {item.due}
                  </span>
                </div>
              </button>
              ))
            ) : (
              <div className="empty-state">
                <strong>검색 결과 없음</strong>
                <p>검색어를 줄이거나 상태 필터를 전체로 바꿔보세요.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="detail-panel">
          <div className="detail-header">
            <span className={`status-pill ${statusMeta[selectedItem.status].tone}`}>{statusMeta[selectedItem.status].label}</span>
            <h3>{selectedItem.title}</h3>
            <p>{selectedItem.draftAngle}</p>
            <div className="status-control" aria-label="글감 상태 변경">
              {statusOrder.map((status) => (
                <button
                  className={selectedItem.status === status ? 'active' : ''}
                  key={status}
                  type="button"
                  onClick={() => updateSelectedStatus(status)}
                >
                  {statusMeta[status].label}
                </button>
              ))}
            </div>
          </div>

          <section className="detail-section">
            <h4>
              <Search size={17} />
              조사 포인트
            </h4>
            <ul>
              {selectedItem.research.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>

          <section className="detail-section">
            <h4>
              <CheckCircle2 size={17} />
              현장 질문지
            </h4>
            <div className="questionnaire">
              {fieldQuestions.map((question) => (
                <div className="question-card" key={question.id}>
                  <div className="question-title">
                    <strong>{question.label}</strong>
                    <span>{selectedItem.fieldAnswers[question.id] || '미입력'}</span>
                  </div>
                  <div className="answer-chips">
                    {question.options.map((option) => (
                      <button
                        className={selectedItem.fieldAnswers[question.id] === option ? 'active' : ''}
                        key={option}
                        type="button"
                        onClick={() => updateSelectedFieldAnswer(question.id, option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={selectedItem.fieldAnswers[question.id] ?? ''}
                    onChange={(event) => updateSelectedFieldAnswer(question.id, event.target.value)}
                    placeholder={question.placeholder}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="detail-section">
            <h4>
              <Tags size={17} />
              키워드
            </h4>
            <div className="keyword-row">
              {selectedItem.keywords.map((keyword) => (
                <span key={keyword}>{keyword}</span>
              ))}
            </div>
          </section>

          <section className="detail-section">
            <h4>
              <FileText size={17} />
              Codex용 요청문
            </h4>
            <div className="prompt-card">
              <textarea className="prompt-preview" value={draftPrompt} readOnly />
              <button className="primary-button" type="button" onClick={onCopyPrompt}>
                <Copy size={17} />
                요청문 복사
              </button>
              {copyState === 'success' ? <p className="copy-message success">복사 완료. 그대로 Codex나 ChatGPT에 붙여넣으면 됩니다.</p> : null}
              {copyState === 'error' ? <p className="copy-message error">복사 권한이 막혔습니다. 요청문을 직접 선택해서 복사해주세요.</p> : null}
            </div>
          </section>
        </aside>
      </section>
    </>
  )
}

export default App
