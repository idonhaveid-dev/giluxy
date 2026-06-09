const ALLOWED_HOSTS = new Set([
  'reservation.knps.or.kr',
  'www.foresttrip.go.kr',
  'yonginforest.foresttrip.go.kr',
  'barasan.foresttrip.go.kr',
])

const knpsFacilityFallbacks = [
  { pattern: /송계/, deptId: 'B111002', deptName: '송계', parkName: '월악산' },
  { pattern: /닷돈재1/, deptId: 'B111003', deptName: '닷돈재1', parkName: '월악산' },
  { pattern: /닷돈재2/, deptId: 'B111001', deptName: '닷돈재2', parkName: '월악산' },
  { pattern: /덕주/, deptId: 'B111007', deptName: '덕주', parkName: '월악산' },
  { pattern: /용하/, deptId: 'B111004', deptName: '용하', parkName: '월악산' },
  { pattern: /하선암/, deptId: 'B111008', deptName: '하선암', parkName: '월악산' },
  { pattern: /덕유대1/, deptId: 'B051006', deptName: '덕유대1', parkName: '덕유산' },
  { pattern: /덕유대2/, deptId: 'B051007', deptName: '덕유대2', parkName: '덕유산' },
  { pattern: /덕유대3/, deptId: 'B051008', deptName: '덕유대3', parkName: '덕유산' },
  { pattern: /고사포1/, deptId: 'B181003', deptName: '고사포1', parkName: '변산반도' },
  { pattern: /고사포2/, deptId: 'B181004', deptName: '고사포2', parkName: '변산반도' },
]

const availablePatterns = [/잔여\s*[1-9]/, /예약가능\s*[1-9]/, /[1-9]\s*자리/]

const closedPatterns = [/예약\s*마감/, /예약마감/, /매진/, /대기\s*마감/, /잔여\s*0/]

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

function collectSetCookie(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie().join('; ')
  }

  return headers.get('set-cookie') ?? ''
}

function extractDate(value) {
  const match = String(value ?? '').match(/(\d{4})[.-](\d{2})[.-](\d{2})/)
  if (!match) return null

  return `${match[1]}${match[2]}${match[3]}`
}

function extractNights(period, condition) {
  const match = `${period ?? ''} ${condition ?? ''}`.match(/([12])\s*박/)
  return match ? Number(match[1]) : 1
}

function getNextKnpsDate(dateValue) {
  const date = new Date(`${dateValue.slice(0, 4)}-${dateValue.slice(4, 6)}-${dateValue.slice(6, 8)}T00:00:00`)
  date.setDate(date.getDate() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function findKnpsFacility(targetUrl, campground) {
  const deptId = targetUrl.searchParams.get('deptId')
  const fallback =
    knpsFacilityFallbacks.find((facility) => facility.deptId === deptId) ??
    knpsFacilityFallbacks.find((facility) => facility.pattern.test(String(campground ?? '')))

  if (fallback) return fallback
  if (!deptId) return null

  return {
    deptId,
    deptName: String(campground ?? '야영장'),
    parkName: '',
  }
}

function getAttribute(tag, name) {
  return tag.match(new RegExp(`${name}=["']([^"']*)`))?.[1] ?? ''
}

function parseKnpsAvailability(html, dateValue, nights) {
  const dayMatches = [...html.matchAll(new RegExp(`<i[^>]*data-use_df=["']${dateValue}["'][^>]*>`, 'g'))]
  const availableSites = []
  const waitingSites = []

  for (const match of dayMatches) {
    const tag = match[0]
    const status = getAttribute(tag, 'data-reser_tp')
    const title = getAttribute(tag, 'data-title')

    if (status === 'R') {
      availableSites.push(title)
    }

    if (status === 'W') {
      waitingSites.push(title)
    }
  }

  if (nights === 2 && availableSites.length > 0) {
    const availableByProduct = new Set(
      dayMatches
        .filter((match) => getAttribute(match[0], 'data-reser_tp') === 'R')
        .map((match) => getAttribute(match[0], 'data-prod-id')),
    )
    const nextDate = getNextKnpsDate(dateValue)
    const nextDayAvailable = [...html.matchAll(new RegExp(`<i[^>]*data-use_df=["']${nextDate}["'][^>]*>`, 'g'))]
      .filter((match) => getAttribute(match[0], 'data-reser_tp') === 'R')
      .map((match) => getAttribute(match[0], 'data-prod-id'))
      .filter((productId) => availableByProduct.has(productId))

    if (nextDayAvailable.length === 0) {
      return {
        status: waitingSites.length > 0 ? 'watching' : 'closed',
        message: `입실일 가능 신호는 있으나 ${nights}박 연속 가능 사이트는 감지되지 않았습니다.`,
      }
    }

    return {
      status: 'available',
      message: `${dateValue} 기준 ${nights}박 연속 예약 가능 사이트 ${nextDayAvailable.length}개 감지.`,
    }
  }

  if (availableSites.length > 0) {
    return {
      status: 'available',
      message: `${dateValue} 기준 예약 가능 사이트 ${availableSites.length}개 감지: ${availableSites.slice(0, 3).join(', ')}`,
    }
  }

  if (waitingSites.length > 0) {
    return {
      status: 'watching',
      message: `${dateValue} 기준 대기 가능 사이트 ${waitingSites.length}개 감지. 예약 가능 사이트는 아직 없습니다.`,
    }
  }

  return {
    status: 'closed',
    message: `${dateValue} 기준 예약 가능 또는 대기 가능 사이트가 감지되지 않았습니다.`,
  }
}

async function checkKnpsReservation(targetUrl, query) {
  const facility = findKnpsFacility(targetUrl, query.campground)
  const dateValue = extractDate(query.period)
  const nights = extractNights(query.period, query.condition)

  if (!facility || !dateValue) {
    return {
      status: 'watching',
      message: '국립공원 잔여현황 조회에 필요한 야영장 코드 또는 날짜를 찾지 못했습니다.',
    }
  }

  const entryResponse = await fetch('https://reservation.knps.or.kr/reservation/searchSimpleCampReservation.do', {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'GILUXY reservation monitor',
    },
  })
  const cookie = collectSetCookie(entryResponse.headers)
  const body = new URLSearchParams({
    dept_id: facility.deptId,
    dept_name: facility.deptName,
    parent_dept_name: facility.parkName,
    prd_ctg_id: '',
    isGreenpoint: 'N',
  })

  const listResponse = await fetch('https://reservation.knps.or.kr/reservation/campsiteList.do', {
    method: 'POST',
    headers: {
      accept: 'text/html,*/*',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      cookie,
      referer: 'https://reservation.knps.or.kr/reservation/searchSimpleCampReservation.do',
      'user-agent': 'GILUXY reservation monitor',
      'x-requested-with': 'XMLHttpRequest',
    },
    body,
  })

  if (!listResponse.ok) {
    throw new Error(`국립공원 잔여현황 응답 오류: ${listResponse.status}`)
  }

  const html = await listResponse.text()
  return parseKnpsAvailability(html, dateValue, nights)
}

function detectGenericStatus(html, targetUrl) {
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
      message: '예약 가능 수량 문구가 감지됐습니다. 공식 예약 페이지에서 즉시 확인하세요.',
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
    let result

    if (targetUrl.hostname === 'reservation.knps.or.kr') {
      result = await checkKnpsReservation(targetUrl, request.query)
    } else {
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
      result = detectGenericStatus(html, targetUrl)
    }

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
