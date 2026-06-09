import { hasTelegramConfig, sendTelegramMessage } from './telegram-alert.js'

function getBearerToken(request) {
  const authorization = request.headers.authorization ?? request.headers.Authorization ?? ''
  const match = String(authorization).match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? ''
}

function isAuthorized(request) {
  const cronSecret = process.env.RESERVATION_CRON_SECRET
  if (!cronSecret) return true

  return request.query.secret === cronSecret || getBearerToken(request) === cronSecret
}

export default async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST')
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  if (!isAuthorized(request)) {
    response.status(401).json({ error: 'Unauthorized.' })
    return
  }

  if (!hasTelegramConfig()) {
    response.status(400).json({ ok: false, error: 'telegram_env_missing' })
    return
  }

  const result = await sendTelegramMessage(
    [
      '[GILUXY 텔레그램 연결 테스트]',
      '이 메시지가 보이면 GILUXY 알림 연결이 정상입니다.',
      new Date().toISOString(),
    ].join('\n'),
  )

  response.status(result.sent ? 200 : 502).json({ ok: result.sent, ...result })
}
