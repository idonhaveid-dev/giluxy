import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  BadgeCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Compass,
  Copy,
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
  Video,
} from 'lucide-react'
import './App.css'

type AppView = 'home' | 'blog'
type Status = 'idea' | 'research' | 'field' | 'draft' | 'published'

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
  checklist: string[]
  draftAngle: string
  memo: string
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

const statusMeta: Record<Status, { label: string; tone: string }> = {
  idea: { label: '아이디어', tone: 'neutral' },
  research: { label: '조사중', tone: 'blue' },
  field: { label: '현장메모', tone: 'green' },
  draft: { label: '초안작성', tone: 'orange' },
  published: { label: '발행완료', tone: 'dark' },
}

const BLOG_ITEMS_STORAGE_KEY = 'giluxy.blogItems.v1'

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
    checklist: ['화장실 사진', '주차장 진입로', '잠자기 좋은 구역', '소음 발생 시간'],
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
    checklist: ['개화율 한줄 결론', '주차장 만차 여부', '화장실 위치', '사진 잘 나오는 방향'],
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
    checklist: ['주차장 넓이', '화장실 상태', '위험구간', '하산 선택지'],
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
    checklist: ['제품 사진', '시거잭 연결 사진', '에어매트 주입 시간', '대체품 사진'],
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

const statusOrder: Status[] = ['idea', 'research', 'field', 'draft', 'published']

function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && statusOrder.includes(value as Status)
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
    isStringArray(item.checklist) &&
    typeof item.draftAngle === 'string' &&
    typeof item.memo === 'string'
  )
}

function loadBlogItems(): BlogItem[] {
  try {
    const storedValue = window.localStorage.getItem(BLOG_ITEMS_STORAGE_KEY)
    if (!storedValue) return defaultBlogItems

    const parsedValue: unknown = JSON.parse(storedValue)
    if (!Array.isArray(parsedValue) || !parsedValue.every(isBlogItem)) {
      throw new Error('Saved blog items have an invalid shape.')
    }

    return parsedValue
  } catch (error) {
    console.error(error)
    window.localStorage.removeItem(BLOG_ITEMS_STORAGE_KEY)
    return defaultBlogItems
  }
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
    checklist: ['주차', '화장실', '혼잡도', '사진 포인트'],
    draftAngle: '대충 남긴 메모를 네 블로그 말투의 현장형 정보 글로 정리',
    memo: trimmedMemo,
  }
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

현장 체크리스트:
${item.checklist.map((note) => `- ${note}`).join('\n')}

현장 메모:
${item.memo || '- 아직 없음'}`
}

function App() {
  const [view, setView] = useState<AppView>('home')
  const [items, setItems] = useState<BlogItem[]>(() => loadBlogItems())
  const [selectedId, setSelectedId] = useState(defaultBlogItems[0].id)
  const [activeStatus, setActiveStatus] = useState<Status | 'all'>('all')
  const [quickMemo, setQuickMemo] = useState(
    '변산 마실길 샤스타데이지 이번 주말 확인. 주차, 화장실, 개화율, 사진 포인트 중심.',
  )
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    window.localStorage.setItem(BLOG_ITEMS_STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0] ?? defaultBlogItems[0]

  const filteredItems = useMemo(() => {
    if (activeStatus === 'all') return items
    return items.filter((item) => item.status === activeStatus)
  }, [activeStatus, items])

  const addQuickMemo = () => {
    const newItem = createBlogItemFromMemo(quickMemo, items)
    setItems([newItem, ...items])
    setSelectedId(newItem.id)
    setQuickMemo('')
  }

  const updateSelectedStatus = (status: Status) => {
    setItems((currentItems) => currentItems.map((item) => (item.id === selectedItem.id ? { ...item, status } : item)))
  }

  const updateSelectedMemo = (memo: string) => {
    setItems((currentItems) => currentItems.map((item) => (item.id === selectedItem.id ? { ...item, memo } : item)))
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
        {view === 'home' ? <HomeScreen onOpenBlog={() => setView('blog')} /> : null}
        {view === 'blog' ? (
          <BlogWorkspace
            activeStatus={activeStatus}
            filteredItems={filteredItems}
            items={items}
            quickMemo={quickMemo}
            copyState={copyState}
            onAddQuickMemo={addQuickMemo}
            onCopyPrompt={copyPrompt}
            selectedId={selectedId}
            selectedItem={selectedItem}
            setActiveStatus={setActiveStatus}
            setQuickMemo={setQuickMemo}
            setSelectedId={setSelectedId}
            updateSelectedMemo={updateSelectedMemo}
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

function HomeScreen({ onOpenBlog }: { onOpenBlog: () => void }) {
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
          const clickable = tile.id === 'blog' && tile.enabled
          return (
            <button
              className={clickable ? 'app-tile available' : 'app-tile'}
              disabled={!clickable}
              key={tile.id}
              type="button"
              onClick={clickable ? onOpenBlog : undefined}
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
          <h3>블로그 글감 4개가 준비됨</h3>
          <p>현재는 블로그 앱만 활성화되어 있고, 다음 단계에서 유튜브와 촬영 모듈을 붙일 수 있습니다.</p>
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

function BlogWorkspace({
  activeStatus,
  filteredItems,
  items,
  quickMemo,
  copyState,
  onAddQuickMemo,
  onCopyPrompt,
  selectedId,
  selectedItem,
  setActiveStatus,
  setQuickMemo,
  setSelectedId,
  updateSelectedMemo,
  updateSelectedStatus,
}: {
  activeStatus: Status | 'all'
  filteredItems: BlogItem[]
  items: BlogItem[]
  quickMemo: string
  copyState: 'idle' | 'success' | 'error'
  onAddQuickMemo: () => void
  onCopyPrompt: () => void
  selectedId: number
  selectedItem: BlogItem
  setActiveStatus: (status: Status | 'all') => void
  setQuickMemo: (memo: string) => void
  setSelectedId: (id: number) => void
  updateSelectedMemo: (memo: string) => void
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
        <div className="top-actions">
          <label className="search-box">
            <Search size={18} />
            <input type="search" placeholder="글감, 장소, 키워드 검색" />
          </label>
          <button className="icon-button" type="button" aria-label="새 글감 추가">
            <Plus size={20} />
          </button>
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
          <p className="eyebrow">빠른 입력</p>
          <h3>대충 적어도 글감으로 남기는 곳</h3>
        </div>
        <textarea value={quickMemo} onChange={(event) => setQuickMemo(event.target.value)} />
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

          <div className="blog-list">
            {filteredItems.map((item) => (
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
            ))}
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
              현장 체크
            </h4>
            <div className="check-list">
              {selectedItem.checklist.map((item) => (
                <label key={item}>
                  <input type="checkbox" />
                  <span>{item}</span>
                </label>
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
              <Mic size={17} />
              현장 메모
            </h4>
            <textarea
              className="field-note-input"
              value={selectedItem.memo}
              onChange={(event) => updateSelectedMemo(event.target.value)}
              placeholder="현장에서 본 것만 짧게 적어두기"
            />
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
