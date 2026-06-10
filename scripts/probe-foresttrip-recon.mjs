// One-off reconnaissance: fetch main.do, save HTML, extract JS refs and search-flow JS.
// Throwaway investigation helper; the durable probe is probe-foresttrip-region-search.mjs.
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const LOG_DIR = join(process.cwd(), 'logs', 'foresttrip-probe')
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

function collectSetCookie(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie()
  const raw = headers.get('set-cookie')
  return raw ? [raw] : []
}

function cookiePairs(setCookies) {
  return setCookies.map((c) => c.split(';')[0]).filter(Boolean).join('; ')
}

async function main() {
  await mkdir(LOG_DIR, { recursive: true })
  const url = 'https://www.foresttrip.go.kr/main.do'
  const startedAt = Date.now()

  let response
  try {
    response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'user-agent': UA,
      },
    })
  } catch (error) {
    console.log('FETCH_FAILED', error?.message, error?.cause?.code)
    return
  }

  const elapsed = Date.now() - startedAt
  const setCookies = collectSetCookie(response.headers)
  const html = await response.text()
  await writeFile(join(LOG_DIR, 'main.do.html'), html, 'utf8')

  console.log('STATUS', response.status, `${elapsed}ms`, `${html.length} bytes`)
  console.log('CONTENT-TYPE', response.headers.get('content-type'))
  console.log('SET-COOKIE pairs:', cookiePairs(setCookies) || '(none)')
  console.log('SET-COOKIE raw count:', setCookies.length)

  // CSRF token
  const csrf = html.match(/name="_csrf"\s+value="([^"]+)"/)?.[1]
  const csrfMeta = html.match(/<meta[^>]+name="_csrf"[^>]+content="([^"]+)"/)?.[1]
  const csrfHeader = html.match(/name="_csrf_header"\s+value="([^"]+)"/)?.[1]
  console.log('CSRF input:', csrf ?? '(none)')
  console.log('CSRF meta:', csrfMeta ?? '(none)')
  console.log('CSRF header name:', csrfHeader ?? '(none)')

  // Script srcs
  const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1])
  console.log('\n--- SCRIPT SRC (' + scripts.length + ') ---')
  for (const s of scripts) console.log(s)

  // NetFunnel references
  console.log('\n--- NetFunnel mentions ---')
  const nf = [...html.matchAll(/.{0,80}[Nn]et[Ff]unnel.{0,80}/g)].map((m) => m[0].trim())
  for (const line of nf.slice(0, 20)) console.log(line)
  console.log('netfunnel mention count:', nf.length)

  // Search-flow JS functions
  console.log('\n--- fn_goRsvrtTheme / fn_moveRsvrtTheme occurrences ---')
  for (const name of ['fn_goRsvrtTheme', 'fn_moveRsvrtTheme', 'fn_goRsvrt', 'fcfsRsrvtPssblGoodsDetls']) {
    const count = (html.match(new RegExp(name, 'g')) || []).length
    console.log(`${name}: ${count}`)
  }

  // Yumyeongsan callsite
  console.log('\n--- 유명산 callsites ---')
  const ym = [...html.matchAll(/.{0,120}유명산.{0,40}/g)].map((m) => m[0].trim())
  for (const line of ym.slice(0, 10)) console.log(line)

  // Region/instt theme list rows
  console.log('\n--- fn_goRsvrtTheme( samples ---')
  const themeCalls = [...html.matchAll(/fn_goRsvrtTheme\([^)]*\)/g)].map((m) => m[0])
  for (const line of themeCalls.slice(0, 15)) console.log(line)
  console.log('theme call count:', themeCalls.length)
}

main().catch((e) => {
  console.error('UNCAUGHT', e?.message)
  process.exitCode = 1
})
