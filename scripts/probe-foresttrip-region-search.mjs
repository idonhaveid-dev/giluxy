// Server-side reproduction probe for 숲나들이(foresttrip.go.kr) region-list reservation search.
//
// Goal: query "region + date + 1 night" as the main-page search flow does, get the FULL
// result list, and detect whether a target forest (e.g. 유명산 자연휴양림) is bookable —
// all over plain HTTP, no browser, no login, no booking.
//
// Flow (mirrors main.do JS fn_top_goSearch for the region-only branch / action1):
//   1. GET main.do            -> WMONID + JSESSIONID cookies + _csrf token
//   2. GET nf.foresttrip ts.wseq opcode=5101 -> netfunnel_key (status 200 = pass-through)
//   3. GET fcfsRsrvtRcrfrDtlDetls.do?... -> region result HTML/JSON, parse target status
//
// Usage:
//   node scripts/probe-foresttrip-region-search.mjs
//   node scripts/probe-foresttrip-region-search.mjs --region 1 --start 20260613 --nights 1 --target 유명산
//   node scripts/probe-foresttrip-region-search.mjs --keep   (save every response into logs/)
//
// This script only READS availability. It never logs in, clicks reservation buttons,
// submits booking forms, pays, or solves CAPTCHA.

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ORIGIN = 'https://www.foresttrip.go.kr'
const NETFUNNEL_BASE = 'https://nf.foresttrip.go.kr/ts.wseq'
const MAIN_URL = `${ORIGIN}/main.do`
const REGION_RESULT_URL = `${ORIGIN}/rep/or/fcfsRsrvtRcrfrDtlDetls.do`
const GOODS_RESULT_URL = `${ORIGIN}/rep/or/sssn/fcfsRsrvtPssblGoodsDetls.do`
const LOG_DIR = join(process.cwd(), 'logs', 'foresttrip-probe')
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

function parseArgs(argv) {
  const args = { region: '1', start: '20260613', nights: 1, people: 2, target: '유명산', keep: false }
  for (let i = 0; i < argv.length; i += 1) {
    const v = argv[i]
    if (v === '--keep') args.keep = true
    else if (v === '--region') args.region = argv[++i] ?? args.region
    else if (v === '--start') args.start = argv[++i] ?? args.start
    else if (v === '--nights') args.nights = Number(argv[++i] ?? args.nights)
    else if (v === '--people') args.people = Number(argv[++i] ?? args.people)
    else if (v === '--target') args.target = argv[++i] ?? args.target
  }
  return args
}

function addDays(yyyymmdd, days) {
  const d = new Date(`${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}T00:00:00`)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function dash(yyyymmdd) {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

function setCookieList(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie()
  const raw = headers.get('set-cookie')
  return raw ? [raw] : []
}

// Merge Set-Cookie pairs into a cookie jar object keyed by name.
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
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

const evidence = []
function note(step, detail) {
  evidence.push({ step, ...detail })
  const code = detail.errorCode ? ` code=${detail.errorCode}` : ''
  console.log(`[${step}] ${detail.summary ?? ''}${code}`)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// foresttrip.go.kr intermittently resets connections (ECONNRESET). Retry with backoff.
async function fetchText(url, init, label, retries = 3) {
  const startedAt = Date.now()
  let lastError
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, init)
      const body = await res.text()
      return { ok: true, status: res.status, headers: res.headers, body, ms: Date.now() - startedAt, attempt }
    } catch (error) {
      lastError = error
      if (attempt < retries) await sleep(400 * (attempt + 1))
    }
  }
  return {
    ok: false,
    status: 0,
    error: lastError,
    errorCode: lastError?.cause?.code ?? lastError?.message,
    ms: Date.now() - startedAt,
    label,
  }
}

// --- Step 1: main.do (cookies + csrf) ---------------------------------------
async function getSession(jar) {
  const r = await fetchText(
    MAIN_URL,
    { headers: { accept: 'text/html', 'accept-language': 'ko-KR,ko;q=0.9', 'user-agent': UA } },
    'main.do',
  )
  if (!r.ok) {
    note('main.do', { summary: 'fetch failed', errorCode: r.errorCode, ms: r.ms })
    return null
  }
  mergeCookies(jar, r.headers)
  const csrf = r.body.match(/name="_csrf"\s+value="([^"]+)"/)?.[1] ?? ''
  note('main.do', {
    summary: `HTTP ${r.status}, ${r.body.length}B, cookies=[${Object.keys(jar).join(',')}], csrf=${csrf ? 'yes' : 'no'}`,
    status: r.status,
    ms: r.ms,
    csrf: Boolean(csrf),
  })
  return { csrf, body: r.body }
}

// --- Step 2: NetFunnel key ---------------------------------------------------
// Response: NetFunnel.gRtype=5101;NetFunnel.gControl.result='<rtype>:<status>:key=...&nwait=..&...';
function parseNetfunnel(body) {
  const m = body.match(/result='(\d+):(\d+):([^']*)'/)
  if (!m) return { status: null, key: '', nwait: null, raw: body.slice(0, 200) }
  const params = new URLSearchParams(m[3])
  return {
    rtype: Number(m[1]),
    status: Number(m[2]),
    key: params.get('key') ?? '',
    nwait: Number(params.get('nwait') ?? '0'),
    nnext: Number(params.get('nnext') ?? '0'),
    ip: params.get('ip') ?? '',
  }
}

async function getNetfunnelKey(jar, actionId) {
  const url =
    `${NETFUNNEL_BASE}?opcode=5101&nfid=0` +
    `&prefix=${encodeURIComponent('NetFunnel.gRtype=5101;')}` +
    `&sid=service_1&aid=${actionId}&js=yes&${Date.now()}`
  const r = await fetchText(
    url,
    { headers: { accept: '*/*', 'user-agent': UA, referer: MAIN_URL, cookie: cookieHeader(jar) } },
    'netfunnel',
  )
  if (!r.ok) {
    note('netfunnel', { summary: `fetch failed (aid=${actionId})`, errorCode: r.errorCode, ms: r.ms })
    return { key: '', status: null }
  }
  mergeCookies(jar, r.headers)
  const parsed = parseNetfunnel(r.body)
  // 200 kSuccess / 300 kTsBypass => pass-through with usable key. 201 kContinue => queued.
  const verdict = parsed.status === 200 ? 'kSuccess' : parsed.status === 300 ? 'kTsBypass' : parsed.status === 201 ? 'kContinue(queued)' : `code ${parsed.status}`
  note('netfunnel', {
    summary: `aid=${actionId} HTTP ${r.status} -> ${verdict}, nwait=${parsed.nwait}, key=${parsed.key ? parsed.key.slice(0, 16) + '…(' + parsed.key.length + ')' : 'none'}`,
    status: r.status,
    nfStatus: parsed.status,
    nwait: parsed.nwait,
    keyLen: parsed.key.length,
    ms: r.ms,
  })
  return parsed
}

// --- Step 3: region result ---------------------------------------------------
function buildRegionParams({ region, start, end, nights, people, csrf, key, keyword }) {
  return new URLSearchParams({
    _csrf: csrf,
    netfunnel_key: key,
    srchInsttArcd: region,
    srchInsttId: '',
    srchRsrvtBgDt: start,
    srchRsrvtEdDt: end,
    srchStngNofpr: String(people),
    srchSthngCnt: String(nights),
    srchWord: keyword ?? '',
    srchUseDt: `${dash(start)}-${dash(end)}`,
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
    keyword: keyword ?? '',
    menuId: '001001',
    hmpgId: 'FRIP',
  })
}

async function getRegionResult(jar, url, params, refererBody) {
  const fullUrl = `${url}?${params.toString()}`
  const r = await fetchText(
    fullUrl,
    {
      headers: {
        accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'accept-language': 'ko-KR,ko;q=0.9',
        'user-agent': UA,
        referer: MAIN_URL,
        cookie: cookieHeader(jar),
        'upgrade-insecure-requests': '1',
      },
    },
    'region-result',
  )
  void refererBody
  if (!r.ok) {
    note('region-result', { summary: `fetch failed at ${url}`, errorCode: r.errorCode, ms: r.ms })
    return null
  }
  mergeCookies(jar, r.headers)
  note('region-result', {
    summary: `HTTP ${r.status}, ${r.body.length}B (${url.split('/').pop()})`,
    status: r.status,
    bytes: r.body.length,
    ms: r.ms,
  })
  return { status: r.status, body: r.body, url: fullUrl }
}

// --- Result parsing: find target forest and its availability ----------------
const AVAILABLE = [/예약\s*가능/, /잔여\s*[1-9]/, /신청\s*가능/, /예약하기/]
const CLOSED = [/예약\s*마감/, /마감/, /잔여\s*0\b/, /매진/]

function textContent(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Slice the HTML around each target-name occurrence and classify the local status.
function detectTarget(html, target) {
  const occurrences = [...html.matchAll(new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))]
  if (occurrences.length === 0) {
    return { found: false, status: 'absent', windows: [] }
  }
  const windows = occurrences.slice(0, 5).map((m) => {
    const around = html.slice(Math.max(0, m.index - 400), m.index + 1200)
    const text = textContent(around)
    const hasAvail = AVAILABLE.some((p) => p.test(text))
    const hasClosed = CLOSED.some((p) => p.test(text))
    return { hasAvail, hasClosed, snippet: text.slice(0, 220) }
  })
  const anyAvail = windows.some((w) => w.hasAvail && !w.hasClosed)
  const allClosed = windows.every((w) => w.hasClosed && !w.hasAvail)
  return {
    found: true,
    status: anyAvail ? 'available' : allClosed ? 'closed' : 'present-unknown',
    count: occurrences.length,
    windows,
  }
}

async function maybeSave(keep, name, body) {
  if (!keep) return
  await mkdir(LOG_DIR, { recursive: true })
  await writeFile(join(LOG_DIR, name), body, 'utf8')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const end = addDays(args.start, args.nights)
  console.log(
    `GILUXY foresttrip region probe — region=${args.region} ${args.start}~${end} (${args.nights}박, ${args.people}인) target="${args.target}"\n`,
  )

  const jar = {}
  const session = await getSession(jar)
  if (!session) return finish(args)
  await maybeSave(args.keep, 'main.do.html', session.body)

  // action1 = region-list search (fn_top_goSearch empty-instt branch)
  const nf = await getNetfunnelKey(jar, 'action1')

  const params = buildRegionParams({
    region: args.region,
    start: args.start,
    end,
    nights: args.nights,
    people: args.people,
    csrf: session.csrf,
    key: nf.key,
  })
  const result = await getRegionResult(jar, REGION_RESULT_URL, params, session.body)
  if (!result) return finish(args)
  await maybeSave(args.keep, 'region-result.html', result.body)

  // Classify
  const text = textContent(result.body)
  const looksLikeResults = /자연휴양림|예약|잔여|객실|야영/.test(text)
  const blocked = /접근이 차단|비정상적인 접근|일시적인 오류|NetFunnel|대기/.test(text) && !looksLikeResults
  note('classify', {
    summary: `looksLikeResults=${looksLikeResults} blocked=${blocked} textLen=${text.length}`,
  })

  const detection = detectTarget(result.body, args.target)
  note('target', {
    summary:
      detection.status === 'absent'
        ? `"${args.target}" not found in region result`
        : `"${args.target}" => ${detection.status} (${detection.count} occurrence(s))`,
    targetStatus: detection.status,
  })
  for (const [i, w] of (detection.windows ?? []).entries()) {
    console.log(`   win${i} avail=${w.hasAvail} closed=${w.hasClosed} :: ${w.snippet}`)
  }

  // First 600 chars of stripped text, to eyeball what came back.
  console.log('\n--- result text sample ---')
  console.log(text.slice(0, 600))

  finish(args)
}

function finish(args) {
  console.log('\n=== EVIDENCE SUMMARY ===')
  for (const e of evidence) console.log(`- ${e.step}: ${e.summary ?? ''}`)
  console.log(`\n(run with --keep to dump raw responses into ${LOG_DIR})`)
  void args
}

main().catch((e) => {
  console.error('UNCAUGHT', e?.message)
  process.exitCode = 1
})
