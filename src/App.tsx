import { useMemo, useState } from 'react'
import {
  Archive,
  BadgeCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Compass,
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
  fieldNotes: string[]
  checklist: string[]
  draftAngle: string
}

const statusMeta: Record<Status, { label: string; tone: string }> = {
  idea: { label: '아이디어', tone: 'neutral' },
  research: { label: '조사중', tone: 'blue' },
  field: { label: '현장메모', tone: 'green' },
  draft: { label: '초안작성', tone: 'orange' },
  published: { label: '발행완료', tone: 'dark' },
}

const blogItems: BlogItem[] = [
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
    fieldNotes: ['바닷가 바로 앞보다 한 블럭 뒤가 조용함', '폭죽 소리 가능성 있음', '취사는 추천하지 않음'],
    checklist: ['화장실 사진', '주차장 진입로', '잠자기 좋은 구역', '소음 발생 시간'],
    draftAngle: '취사 차박이 아니라 잠만 자는 스텔스 차박 기준으로 판단',
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
    fieldNotes: ['1코스는 만개에 가까움', '2코스 앞부분은 다음주가 절정', '보고 즐기기에는 충분함'],
    checklist: ['개화율 한줄 결론', '주차장 만차 여부', '화장실 위치', '사진 잘 나오는 방향'],
    draftAngle: '길게 설명하지 말고 방문 전 판단에 필요한 정보만 앞에 배치',
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
    fieldNotes: [],
    checklist: ['주차장 넓이', '화장실 상태', '위험구간', '하산 선택지'],
    draftAngle: '100대명산보다 빡센 체감과 8봉 하산 추천을 명확히',
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
    fieldNotes: ['5회 사용 후 전원 안 들어옴', '결국 발펌프 150회', '노즐은 무선 펌프와 호환'],
    checklist: ['제품 사진', '시거잭 연결 사진', '에어매트 주입 시간', '대체품 사진'],
    draftAngle: '추천글이 아니라 실제 차박에서 죽어버린 장비 후기',
  },
]

const menuGroups = [
  {
    label: 'GILUXY',
    items: [
      { label: '홈', icon: Home, active: false },
      { label: '전체 업무', icon: LayoutDashboard, active: false },
    ],
  },
  {
    label: '저스트레킹',
    items: [
      { label: '블로그', icon: FileText, active: true },
      { label: '유튜브', icon: Video, active: false },
    ],
  },
  {
    label: '제작',
    items: [
      { label: '사진촬영', icon: Camera, active: false },
      { label: '드론촬영', icon: Plane, active: false },
      { label: '촬영지', icon: MapPin, active: false },
    ],
  },
  {
    label: '관리',
    items: [
      { label: '자료보관함', icon: Archive, active: false },
      { label: '설정', icon: Settings, active: false },
    ],
  },
]

const statusOrder: Status[] = ['idea', 'research', 'field', 'draft', 'published']

function App() {
  const [selectedId, setSelectedId] = useState(blogItems[0].id)
  const [activeStatus, setActiveStatus] = useState<Status | 'all'>('all')
  const [quickMemo, setQuickMemo] = useState('변산 마실길 샤스타데이지 이번 주말 확인. 주차, 화장실, 개화율, 사진 포인트 중심.')

  const selectedItem = blogItems.find((item) => item.id === selectedId) ?? blogItems[0]

  const filteredItems = useMemo(() => {
    if (activeStatus === 'all') return blogItems
    return blogItems.filter((item) => item.status === activeStatus)
  }, [activeStatus])

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="GILUXY navigation">
        <div className="brand-block">
          <div className="brand-mark">G</div>
          <div>
            <p className="eyebrow">Personal Groupware</p>
            <h1>GILUXY</h1>
          </div>
        </div>

        <nav className="nav-groups">
          {menuGroups.map((group) => (
            <section className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <button className={item.active ? 'nav-item active' : 'nav-item'} type="button" key={item.label}>
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </section>
          ))}
        </nav>
      </aside>

      <main className="workspace">
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
              <strong>{blogItems.length}</strong>
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
            <button className="primary-button" type="button">
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
                <FileText size={17} />
                초안 요청문
              </h4>
              <div className="prompt-card">
                <p>
                  이 글감을 내 블로그 말투로 네이버 노출용 초안으로 바꿔줘. 제목 후보, 요약, 본문, 사진 사이 문장,
                  태그까지 만들고 과장된 표현은 빼줘.
                </p>
                <button className="primary-button" type="button">
                  초안 만들기
                  <ChevronRight size={17} />
                </button>
              </div>
            </section>
          </aside>
        </section>
      </main>
    </div>
  )
}

export default App
