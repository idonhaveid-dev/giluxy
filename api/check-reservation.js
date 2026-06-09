const ALLOWED_HOSTS = new Set([
  'reservation.knps.or.kr',
  'www.foresttrip.go.kr',
  'yonginforest.foresttrip.go.kr',
  'barasan.foresttrip.go.kr',
])

const availablePatterns = [
  /잔여\s*[1-9]/,
  /예약가능\s*[1-9]/,
  /[1-9]\s*자리/,
]

const closedPatterns = [
  /예약\s*마감/,
  /예약마감/,
  /매진/,
  /대기\s*마감/,
  /잔여\s*0/,
]

function sanitizeUrl(value) {
  if (typeof value !== 'string') {
    return null
  }

  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
      return null
    }

    return url
  } catch {
    return null
  }
}

function detectStatus(html, targetUrl) {
  if (targetUrl.pathname.includes('/serviceGuide.do')) {
    return {
      status: 'watching',
      message: '예약 안내 페이지 연결은 확인했습니다. 실제 잔여석 조회 화면 연결이 필요합니다.',
    }
  }

  const normalizedText = html.replace(/\s+/g, ' ')
  const hasAvailableSignal = availablePatterns.some((pattern) => pattern.test(normalizedText))
  const hasClosedSignal = closedPatterns.some((pattern) => pattern.test(normalizedText))

  if (hasAvailableSignal && !hasClosedSignal) {
    return {
      status: 'available',
      message: '예약 가능 문구가 감지됐습니다. 공식 예약 페이지에서 즉시 확인하세요.',
    }
  }

  if (hasClosedSignal && !hasAvailableSignal) {
    return {
      status: 'closed',
      message: '마감 또는 잔여 0 문구가 감지됐습니다.',
    }
  }

  return {
    status: 'watching',
    message: '예약 페이지 연결은 확인했습니다. 잔여석은 공식 화면에서 추가 확인이 필요합니다.',
  }
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const targetUrl = sanitizeUrl(request.query.url)
  if (!targetUrl) {
    response.status(400).json({ error: '지원하지 않는 예약 페이지 주소입니다.' })
    return
  }

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'GILUXY reservation monitor',
      },
    })

    if (!upstreamResponse.ok) {
      response.status(502).json({
        error: `예약 페이지 응답 오류: ${upstreamResponse.status}`,
      })
      return
    }

    const html = await upstreamResponse.text()
    const result = detectStatus(html, targetUrl)

    response.status(200).json({
      checkedAt: new Date().toISOString(),
      source: targetUrl.toString(),
      ...result,
    })
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : '예약 페이지 조회에 실패했습니다.',
    })
  }
}
