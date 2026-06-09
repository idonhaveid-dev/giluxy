import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const defaultUrl =
  'https://www.foresttrip.go.kr/pot/rm/fa/selectCmpgrArmpListView.do?hmpgId=ID02030087&menuId=002002002'

const defaultAvailablePatterns = [
  /예약\s*가능/,
  /잔여\s*[1-9]/,
  /신청\s*가능/,
  /선택\s*가능/,
  /예약하기/,
]

const defaultClosedPatterns = [/예약\s*마감/, /마감/, /잔여\s*0/, /매진/]

function parseArgs(argv) {
  const args = {
    url: defaultUrl,
    intervalSeconds: 30,
    port: 9223,
    once: false,
    selfTest: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === '--help') {
      args.help = true
      continue
    }

    if (value === '--once') {
      args.once = true
      continue
    }

    if (value === '--self-test') {
      args.selfTest = true
      continue
    }

    if (value === '--url') {
      args.url = argv[index + 1] ?? args.url
      index += 1
      continue
    }

    if (value === '--interval') {
      args.intervalSeconds = Number(argv[index + 1] ?? args.intervalSeconds)
      index += 1
      continue
    }

    if (value === '--port') {
      args.port = Number(argv[index + 1] ?? args.port)
      index += 1
    }
  }

  return args
}

function printHelp() {
  console.log(`GILUXY foresttrip browser monitor

Usage:
  npm run monitor:foresttrip
  npm run monitor:foresttrip -- --url <foresttrip-url> --interval 30
  npm run monitor:foresttrip -- --once

Behavior:
  - Opens Chrome or Edge with a dedicated GILUXY browser profile.
  - Reads visible page text only.
  - Does not click reservation buttons, submit forms, solve CAPTCHA, or bypass NetFunnel.
  - If TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set, sends an alert when availability text is detected.

Manual step:
  After the browser opens, handle any login, NetFunnel, date selection, or search steps yourself.
`)
}

function getChromeCandidates() {
  if (process.env.CHROME_PATH) return [process.env.CHROME_PATH]

  const local = process.env.LOCALAPPDATA
  const programFiles = process.env.PROGRAMFILES
  const programFilesX86 = process.env['PROGRAMFILES(X86)']

  return [
    local && join(local, 'Google\\Chrome\\Application\\chrome.exe'),
    programFiles && join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
    programFilesX86 && join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
    programFiles && join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe'),
    programFilesX86 && join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
  ].filter(Boolean)
}

async function pathExists(path) {
  try {
    await import('node:fs/promises').then((fs) => fs.access(path))
    return true
  } catch {
    return false
  }
}

async function findBrowserPath() {
  for (const candidate of getChromeCandidates()) {
    if (await pathExists(candidate)) return candidate
  }

  throw new Error('Chrome or Edge executable was not found. Set CHROME_PATH and retry.')
}

async function waitForJson(url, timeoutMs) {
  const startedAt = Date.now()
  let lastError

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return response.json()
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }

    await sleep(500)
  }

  throw lastError instanceof Error ? lastError : new Error(`Timed out waiting for ${url}`)
}

async function startBrowser({ port, url }) {
  const browserPath = await findBrowserPath()
  const profileDir = join(homedir(), '.giluxy', 'foresttrip-browser-profile')
  await mkdir(profileDir, { recursive: true })

  const child = spawn(
    browserPath,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      url,
    ],
    {
      detached: true,
      stdio: 'ignore',
    },
  )
  child.unref()

  await waitForJson(`http://127.0.0.1:${port}/json/version`, 15_000)
}

async function getPageWebSocketUrl(port, fallbackUrl) {
  const pages = await waitForJson(`http://127.0.0.1:${port}/json/list`, 15_000)
  const page =
    pages.find((entry) => entry.type === 'page' && entry.url.includes('foresttrip.go.kr')) ??
    pages.find((entry) => entry.type === 'page')

  if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl

  const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(fallbackUrl)}`, {
    method: 'PUT',
  })
  const newPage = await response.json()
  if (!newPage.webSocketDebuggerUrl) throw new Error('Could not create a Chrome debugging page.')

  return newPage.webSocketDebuggerUrl
}

function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl)
  let id = 0
  const pending = new Map()

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (!message.id || !pending.has(message.id)) return

    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)

    if (message.error) {
      reject(new Error(message.error.message))
      return
    }

    resolve(message.result)
  })

  return new Promise((resolve, reject) => {
    socket.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          id += 1
          socket.send(JSON.stringify({ id, method, params }))

          return new Promise((requestResolve, requestReject) => {
            pending.set(id, { resolve: requestResolve, reject: requestReject })
          })
        },
        close() {
          socket.close()
        },
      })
    })
    socket.addEventListener('error', () => reject(new Error('Chrome debugging WebSocket failed.')))
  })
}

async function readVisiblePage(client) {
  const expression = `(() => ({
    title: document.title,
    url: location.href,
    text: document.body ? document.body.innerText : ''
  }))()`
  const result = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
  })

  return result.result.value
}

function getPatterns(envName, fallbackPatterns) {
  const value = process.env[envName]
  if (!value) return fallbackPatterns

  return value
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean)
    .map((pattern) => new RegExp(pattern))
}

function detectReservationStatus(text) {
  const availablePatterns = getPatterns('FORESTTRIP_AVAILABLE_PATTERNS', defaultAvailablePatterns)
  const closedPatterns = getPatterns('FORESTTRIP_CLOSED_PATTERNS', defaultClosedPatterns)
  const matchedAvailable = availablePatterns.find((pattern) => pattern.test(text))
  const matchedClosed = closedPatterns.find((pattern) => pattern.test(text))

  if (matchedAvailable && !matchedClosed) {
    return {
      status: 'available',
      reason: `matched:${matchedAvailable.source}`,
    }
  }

  if (matchedClosed && !matchedAvailable) {
    return {
      status: 'closed',
      reason: `matched:${matchedClosed.source}`,
    }
  }

  return {
    status: 'watching',
    reason: 'no_decisive_visible_text',
  }
}

function summarizeText(text) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 180)
}

async function sendTelegramAlert(page, detection) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) return { sent: false, reason: 'telegram_env_missing' }

  const body = {
    chat_id: chatId,
    text: ['[GILUXY 숲나들e 브라우저 감지]', page.title, page.url, detection.reason].join('\n'),
    disable_web_page_preview: true,
  }
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) return { sent: false, reason: `telegram_${response.status}` }
  return { sent: true }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function runSelfTest() {
  const cases = [
    { text: '야영데크 01 예약가능', expected: 'available' },
    { text: '잔여 2 사이트', expected: 'available' },
    { text: '예약 마감 잔여 0', expected: 'closed' },
    { text: '야영장 시설 안내', expected: 'watching' },
  ]

  for (const testCase of cases) {
    const actual = detectReservationStatus(testCase.text).status
    if (actual !== testCase.expected) {
      throw new Error(`Self-test failed. expected=${testCase.expected}, actual=${actual}, text=${testCase.text}`)
    }
  }

  console.log('self-test passed')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  if (args.selfTest) {
    runSelfTest()
    return
  }

  await startBrowser(args)
  const webSocketUrl = await getPageWebSocketUrl(args.port, args.url)
  const client = await createCdpClient(webSocketUrl)
  let lastAlertKey = ''

  console.log(`[GILUXY] Browser monitor started. interval=${args.intervalSeconds}s`)
  console.log('[GILUXY] Complete any login, NetFunnel, date selection, or search steps in the opened browser.')

  while (true) {
    const page = await readVisiblePage(client)
    const detection = detectReservationStatus(page.text)
    const checkedAt = new Date().toLocaleString('ko-KR')
    console.log(`[${checkedAt}] ${detection.status} ${detection.reason} ${page.title}`)
    console.log(`  ${summarizeText(page.text)}`)

    if (detection.status === 'available') {
      const alertKey = `${page.url}:${detection.reason}`
      if (alertKey !== lastAlertKey) {
        const alert = await sendTelegramAlert(page, detection)
        lastAlertKey = alertKey
        console.log(`  alert=${JSON.stringify(alert)}`)
      }
    }

    if (args.once) break
    await sleep(args.intervalSeconds * 1000)
  }

  client.close()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

