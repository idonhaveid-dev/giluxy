import { useEffect, useMemo, useState } from 'react'
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

type AppView = 'home' | 'blog' | 'reservation'
type Status = 'idea' | 'research' | 'field' | 'draft' | 'published'
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
  id: AppView | 'youtube' | 'photo' | 'drone' | 'location' | 'archive' | 'settings'
  title: string
  group: string
  description: string
  state: string
  icon: typeof FileText
  enabled: boolean
}

type ReservationMonitor = {
  id: number
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

const statusMeta: Record<Status, { label: string; tone: string }> = {
  idea: { label: '아이디어', tone: 'neutral' },
  research: { label: '조사중', tone: 'blue' },
  field: { label: '현장메모', tone: 'green' },
  draft: { label: '초안작성', tone: 'orange' },
  published: { label: '발행완료', tone: 'dark' },
}

const BLOG_ITEMS_STORAGE_KEY = 'giluxy.blogItems.v1'
const RESERVATION_MONITORS_STORAGE_KEY = 'giluxy.reservationMonitors.v1'

const reservationStatusMeta: Record<ReservationStatus, { label: string; tone: string }> = {
  watching: { label: '감시중', tone: 'blue' },
  available: { label: '빈자리 감지', tone: 'green' },
  closed: { label: '마감', tone: 'neutral' },
}

const reservationServiceLinks: Record<ReservationService, string> = {
  국립공원공단: 'https://reservation.knps.or.kr/',
  숲나들e: 'https://www.foresttrip.go.kr/',
}

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
  {
    id: 'forest-yongin',
    service: '숲나들e',
    park: '서울/인천/경기',
    label: '용인자연휴양림',
    link: 'https://www.foresttrip.go.kr/pot/rm/fa/selectCmpgrArmpListView.do?hmpgId=ID02030031&menuId=002002002',
  },
  {
    id: 'forest-unaksan',
    service: '숲나들e',
    park: '서울/인천/경기',
    label: '운악산 자연휴양림',
    link: 'https://www.foresttrip.go.kr/pot/rm/fa/selectCmpgrArmpListView.do?hmpgId=0224&menuId=002002002',
  },
  {
    id: 'forest-yumyeongsan',
    service: '숲나들e',
    park: '서울/인천/경기',
    label: '유명산 자연휴양림',
    link: 'https://www.foresttrip.go.kr/pot/rm/fa/selectCmpgrArmpListView.do?hmpgId=0101&menuId=002002002',
  },
  {
    id: 'forest-barasan',
    service: '숲나들e',
    park: '서울/인천/경기',
    label: '의왕바라산자연휴양림',
    link: 'https://www.foresttrip.go.kr/pot/rm/fa/selectCmpgrArmpListView.do?hmpgId=ID02030065&menuId=002002002',
  },
  {
    id: 'forest-baegunbong',
    service: '숲나들e',
    park: '서울/인천/경기',
    label: '양평 백운봉 자연휴양림',
    link: 'https://www.foresttrip.go.kr/pot/rm/fa/selectCmpgrArmpListView.do?hmpgId=ID02030087&menuId=002002002',
  },
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
    state: '준비중',
    icon: Camera,
    enabled: false,
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
    lastChecked: '아직 자동 조회 전',
    nextCheck: '로컬 모니터 연결 후 설정',
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
    lastChecked: '수동 확인 필요',
    nextCheck: '대상 휴양림 지정 후 설정',
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
    typeof monitor.id === 'number' &&
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

function getReservationFacilityOptions(service: ReservationService): ReservationFacilityOption[] {
  return reservationFacilityOptions.filter((facility) => facility.service === service)
}

function getDefaultFacilityId(service: ReservationService): string {
  return getReservationFacilityOptions(service)[0]?.id ?? reservationFacilityOptions[0].id
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
        {view === 'home' ? <HomeScreen onOpenBlog={() => setView('blog')} onOpenReservation={() => setView('reservation')} /> : null}
        {view === 'reservation' ? <ReservationWorkspace /> : null}
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
          <button className="nav-item" type="button">
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

function HomeScreen({ onOpenBlog, onOpenReservation }: { onOpenBlog: () => void; onOpenReservation: () => void }) {
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

function ReservationWorkspace() {
  const [monitors, setMonitors] = useState<ReservationMonitor[]>(() => loadReservationMonitors())
  const [selectedMonitorId, setSelectedMonitorId] = useState(defaultReservationMonitors[0].id)
  const [reservationFilter, setReservationFilter] = useState<ReservationStatus | 'all'>('all')
  const [isAddingMonitor, setIsAddingMonitor] = useState(false)
  const [newMonitor, setNewMonitor] = useState<ReservationMonitorDraft>({
    service: '국립공원공단',
    facilityId: 'knps-b111002',
    startDate: '2026-06-13',
    nights: '1',
    notify: '텔레그램 알림 예정',
  })
  const [testNotice, setTestNotice] = useState('')
  const [checkNotice, setCheckNotice] = useState('')
  const [checkingMonitorId, setCheckingMonitorId] = useState<number | null>(null)

  useEffect(() => {
    window.localStorage.setItem(RESERVATION_MONITORS_STORAGE_KEY, JSON.stringify(monitors))
  }, [monitors])

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
  const facilityOptions = getReservationFacilityOptions(newMonitor.service)
  const selectedFacility =
    facilityOptions.find((facility) => facility.id === newMonitor.facilityId) ?? facilityOptions[0]
  const reservationLink = selectedFacility?.link ?? reservationServiceLinks[newMonitor.service]
  const periodText = `${formatReservationDate(newMonitor.startDate)}부터 ${newMonitor.nights}박`
  const conditionText = `${newMonitor.nights}박 빈자리 알림`

  const addMonitor = () => {
    if (!selectedFacility || !newMonitor.startDate) return

    const nextMonitor: ReservationMonitor = {
      id: Math.max(0, ...monitors.map((monitor) => monitor.id)) + 1,
      service: newMonitor.service,
      campground: `[${selectedFacility.park}] ${selectedFacility.label}`,
      period: periodText,
      condition: conditionText,
      status: 'watching',
      lastChecked: '아직 자동 조회 전',
      nextCheck: '로컬 모니터 연결 후 설정',
      notify: newMonitor.notify.trim() || '알림 미설정',
      link: reservationLink,
      history: ['모니터링 조건 추가', '예약 확정은 사용자가 수동으로 진행'],
    }

    setMonitors((currentMonitors) => [nextMonitor, ...currentMonitors])
    setSelectedMonitorId(nextMonitor.id)
    setReservationFilter('watching')
    setIsAddingMonitor(false)
  }

  const triggerTestNotice = () => {
    if (!selectedMonitor) return

    setTestNotice(
      `[알림 테스트] ${selectedMonitor.service} / ${selectedMonitor.campground} / ${selectedMonitor.period} 조건으로 빈자리 감지 메시지를 보냅니다.`,
    )
  }

  const deleteSelectedMonitor = () => {
    if (!selectedMonitor || checkingMonitorId !== null) return

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
                nextCheck: data.status === 'available' ? '지금 공식 페이지 확인' : '다음 수동 확인 대기',
                history: [historyMessage, ...monitor.history].slice(0, 8),
              }
            : monitor,
        ),
      )
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
            <strong>1일</strong>
            <span>자동 조회 주기</span>
          </div>
        </article>
      </section>

      <section className="reservation-notice">
        <div>
          <p className="eyebrow">Scope</p>
          <h3>빈자리 조회와 알림은 자동화</h3>
          <p>서버가 하루 1회 등록 조건을 확인합니다. 10분 주기는 외부 스케줄러나 Pro 배포에서 켭니다.</p>
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
            <h3>빈자리 감시 조건 추가</h3>
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span>서비스</span>
              <select
                value={newMonitor.service}
                onChange={(event) => {
                  const service = event.target.value as ReservationService
                  setNewMonitor({
                    ...newMonitor,
                    service,
                    facilityId: getDefaultFacilityId(service),
                  })
                }}
              >
                <option>국립공원공단</option>
                <option>숲나들e</option>
              </select>
            </label>
            <label className="form-field">
              <span>야영장</span>
              <select
                value={newMonitor.facilityId}
                onChange={(event) => setNewMonitor({ ...newMonitor, facilityId: event.target.value })}
              >
                {facilityOptions.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    [{facility.park}] {facility.label}
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
                {newMonitor.service} 예약 페이지
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
                    <span>{monitor.service}</span>
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
                  {checkingMonitorId === selectedMonitor.id ? '확인 중' : '상태 확인'}
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
                <strong>{selectedMonitor.service}</strong>
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
