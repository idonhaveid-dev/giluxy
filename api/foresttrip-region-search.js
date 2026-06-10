// Server-side region-list availability for 숲나들이 (foresttrip.go.kr).
//
// Mirrors the main.do search flow for the region-only branch (fn_top_goSearch -> action1):
//   1. GET main.do                       -> WMONID + JSESSIONID cookies + _csrf token
//   2. GET nf.foresttrip.go.kr/ts.wseq   -> netfunnel_key (opcode 5101; status 200 = pass-through)
//   3. GET fcfsRsrvtRcrfrDtlDetls.do     -> full region result; parse one <div class="rc_item">
//                                           card per facility and read its date-aware status badge.
//
// Why region-list instead of the per-facility detail page: the detail endpoint
// (fcfsRsrvtPssblGoodsDetls.do) needs an extra NetFunnel hop and was unreliable from
// serverless fetch; the region list returns every facility's availability in one request,
// so we can detect a target forest (e.g. 유명산) inside it.
//
// Read-only. This module never logs in, clicks reservation buttons, submits booking
// forms, pays, or solves CAPTCHA. The netfunnel_key is the same pass-through key the
// public web page requests; we do not bypass the queue when one exists.

const ORIGIN = 'https://www.foresttrip.go.kr'
const NETFUNNEL_URL = 'https://nf.foresttrip.go.kr/ts.wseq'
const MAIN_URL = `${ORIGIN}/main.do`
const REGION_RESULT_URL = `${ORIGIN}/rep/or/fcfsRsrvtRcrfrDtlDetls.do`
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/** Region code (srchInsttArcd) -> display name. Code 1 verified; 2-9 follow the main.do map order. */
export const FOREST_REGION_NAMES = {
  1: '서울/인천/경기',
  2: '충북',
  3: '대전/충남',
  4: '전북',
  5: '광주/전남',
  6: '강원',
  7: '대구/경북',
  8: '부산/경남',
  9: '제주',
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function dash(yyyymmdd) {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

function setCookieList(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie()
  const raw = headers.get('set-cookie')
  return raw ? [raw] : []
}

/** Merge Set-Cookie response headers into a name->value jar. */
function mergeCookies(jar, headers) {
  for (const entry of setCookieList(headers)) {
    const pair = entry.split(';')[0]
    const eq = pair.indexOf('=')
    if (eq <= 0) continue
    jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim()
  }
  return jar
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

/**
 * fetch + read body with retry. foresttrip.go.kr intermittently resets connections
 * (ECONNRESET); a couple of retries with backoff turns those transient resets into success.
 * Throws the last error after exhausting retries so callers can treat it as a fetch failure.
 * @returns {Promise<{ status: number, headers: Headers, body: string }>}
 */
async function fetchTextWithRetry(url, init, retries = 3) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, init)
      const body = await response.text()
      return { status: response.status, headers: response.headers, body }
    } catch (error) {
      lastError = error
      if (attempt < retries) await sleep(400 * (attempt + 1))
    }
  }
  throw lastError
}

/**
 * Step 1: load main.do for a session (WMONID + JSESSIONID cookies) and the _csrf token.
 * @returns {Promise<{ csrf: string }>}
 */
async function getSession(jar) {
  const { headers, body } = await fetchTextWithRetry(MAIN_URL, {
    headers: { accept: 'text/html', 'accept-language': 'ko-KR,ko;q=0.9', 'user-agent': UA },
  })
  mergeCookies(jar, headers)
  return { csrf: body.match(/name="_csrf"\s+value="([^"]+)"/)?.[1] ?? '' }
}

/**
 * Parse the NetFunnel JSONP body:
 *   NetFunnel.gRtype=5101;NetFunnel.gControl.result='<rtype>:<status>:key=...&nwait=..&...';
 * status 200 = kSuccess (pass through), 300 = kTsBypass, 201 = kContinue (queued).
 */
function parseNetfunnel(body) {
  const match = body.match(/result='(\d+):(\d+):([^']*)'/)
  if (!match) return { status: null, key: '', nwait: 0 }
  const params = new URLSearchParams(match[3])
  return {
    status: Number(match[2]),
    key: params.get('key') ?? '',
    nwait: Number(params.get('nwait') ?? '0'),
  }
}

/**
 * Step 2: request a netfunnel_key. action1 is the region-list service id used by main.do.
 * @returns {Promise<{ status: number|null, key: string, nwait: number }>}
 */
async function getNetfunnelKey(jar) {
  const url =
    `${NETFUNNEL_URL}?opcode=5101&nfid=0` +
    `&prefix=${encodeURIComponent('NetFunnel.gRtype=5101;')}` +
    `&sid=service_1&aid=action1&js=yes&${Date.now()}`
  const { headers, body } = await fetchTextWithRetry(url, {
    headers: { accept: '*/*', 'user-agent': UA, referer: MAIN_URL, cookie: cookieHeader(jar) },
  })
  mergeCookies(jar, headers)
  return parseNetfunnel(body)
}

/** Build the GET query for the region result, matching the main.do srch_frm fields. */
function buildRegionParams({ regionCode, startYmd, endYmd, nights, people, csrf, key }) {
  return new URLSearchParams({
    _csrf: csrf,
    netfunnel_key: key,
    srchInsttArcd: String(regionCode),
    srchInsttId: '',
    srchRsrvtBgDt: startYmd,
    srchRsrvtEdDt: endYmd,
    srchStngNofpr: String(people),
    srchSthngCnt: String(nights),
    srchWord: '',
    srchUseDt: `${dash(startYmd)}-${dash(endYmd)}`,
    houseCampSctin: '01',
    rsrvtPssblYn: 'N',
    srchHouseCharg: '',
    srchCampCharg: '',
    goodsClsscHouseCdArr: '',
    goodsClsscCampCdArr: '',
    srchInsttTpcd: '',
    srchMyLtd: '',
    srchMyLng: '',
    srchDstnc: '',
    keyword: '',
    menuId: '001001',
    hmpgId: 'FRIP',
  })
}

/**
 * Split the region result HTML into facility cards and read each one's authoritative,
 * date-aware status. Each facility renders as one <div class="rc_item"> with:
 *   - badge: <i>[예약가능]</i> | <i>[예약불가]</i>
 *   - name:  <b>[국립](가평군)유명산자연휴양림</b>
 *   - rooms: <div class="ut_roomcount">예약가능 객실 수 : N</div>
 * @returns {{ name: string, badge: string, rooms: number, available: boolean }[]}
 */
export function parseRegionCards(html) {
  return html
    .split('<div class="rc_item">')
    .slice(1)
    .map((card) => {
      const badge = card.match(/<i>\[([^\]]+)\]<\/i>/)?.[1] ?? ''
      const name = (card.match(/<b>([^<]+)<\/b>/)?.[1] ?? '').trim()
      const rooms = Number(card.match(/예약가능 객실 수\s*:\s*(\d+)/)?.[1] ?? '0')
      return { name, badge, rooms, available: badge === '예약가능' || rooms > 0 }
    })
    .filter((card) => card.name)
}

function buildSnapshot(cards, matches) {
  return {
    facilities: cards.length,
    available: cards.filter((card) => card.available).length,
    target: matches.map((card) => ({ name: card.name, badge: card.badge, rooms: card.rooms })),
  }
}

/**
 * Check whether a target forest is bookable inside its region's full result list.
 * Dates are pre-computed YYYYMMDD strings so this module owns no date math.
 *
 * @param {object} input
 * @param {string|number} input.regionCode  srchInsttArcd (e.g. 1 = 서울/인천/경기)
 * @param {string} input.matchName  substring identifying the facility in card names (e.g. '유명산자연휴양림')
 * @param {string} input.startYmd  check-in date, YYYYMMDD
 * @param {string} input.endYmd    check-out date, YYYYMMDD
 * @param {number} input.nights
 * @param {string} input.label     human-facing facility label for messages
 * @param {number} [input.people]  party size (defaults to the main.do default of 2)
 * @returns {Promise<{ status: 'available'|'closed'|'watching', message: string, snapshot?: object }>}
 */
export async function checkForestRegionAvailability({ regionCode, matchName, startYmd, endYmd, nights, label, people = 2 }) {
  const regionName = FOREST_REGION_NAMES[Number(regionCode)] ?? `지역코드 ${regionCode}`
  const jar = {}
  const { csrf } = await getSession(jar)
  const netfunnel = await getNetfunnelKey(jar)

  const params = buildRegionParams({ regionCode, startYmd, endYmd, nights, people, csrf, key: netfunnel.key })
  const { body } = await fetchTextWithRetry(`${REGION_RESULT_URL}?${params.toString()}`, {
    headers: {
      accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
      'accept-language': 'ko-KR,ko;q=0.9',
      'user-agent': UA,
      referer: MAIN_URL,
      cookie: cookieHeader(jar),
      'upgrade-insecure-requests': '1',
    },
  })

  // Without a valid pass-through key (or during congestion) the server returns this guard page.
  if (/비정상적인 접근/.test(body)) {
    const congestion = netfunnel.nwait > 0 ? ` (NetFunnel 대기열 ${netfunnel.nwait}명)` : ''
    return {
      status: 'watching',
      message: `${label} ${regionName} 지역 조회가 NetFunnel 단계에서 차단됐습니다${congestion}. 잠시 후 다시 시도하세요.`,
    }
  }

  const cards = parseRegionCards(body)
  if (cards.length === 0) {
    return {
      status: 'watching',
      message: `${label} ${regionName} 지역 목록을 받았지만 휴양림 카드를 해석하지 못했습니다. 결과 화면 구조가 바뀌었을 수 있습니다.`,
    }
  }

  const matches = cards.filter((card) => card.name.includes(matchName))
  if (matches.length === 0) {
    return {
      status: 'watching',
      message: `${label} ${regionName} 지역 ${cards.length}곳을 조회했지만 대상 휴양림명("${matchName}")을 목록에서 찾지 못했습니다.`,
      snapshot: buildSnapshot(cards, matches),
    }
  }

  const snapshot = buildSnapshot(cards, matches)
  const available = matches.some((card) => card.available)
  if (available) {
    const open = matches.find((card) => card.available)
    return {
      status: 'available',
      message: `${label} ${startYmd} 기준 ${nights}박 예약 가능 감지: ${open.name} (예약가능 객실 ${open.rooms}). 공식 페이지에서 즉시 확인하세요.`,
      snapshot,
    }
  }

  return {
    status: 'closed',
    message: `${label} ${startYmd} 기준 ${nights}박은 아직 예약불가입니다. (${regionName} 지역 전체 ${snapshot.facilities}곳 중 예약가능 ${snapshot.available}곳)`,
    snapshot,
  }
}
