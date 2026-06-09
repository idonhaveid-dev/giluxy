import { checkReservationStatus } from './check-reservation.js'
import { reservationMonitors } from './reservation-monitor-config.js'

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

function buildMonitorQuery(monitor) {
  return {
    url: monitor.url,
    campground: monitor.campground,
    period: monitor.period,
    condition: monitor.condition,
  }
}

function shouldAlert(monitor, result) {
  return monitor.alertStatuses.includes(result.status)
}

async function sendTelegramAlert(monitor, result) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    return { sent: false, reason: 'telegram_env_missing' }
  }

  const text = [
    '[GILUXY 야영장 빈자리 감지]',
    `${monitor.service} / ${monitor.campground}`,
    `${monitor.period} / ${monitor.condition}`,
    result.message,
    monitor.url,
  ].join('\n')
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  })

  if (!response.ok) {
    return { sent: false, reason: `telegram_${response.status}` }
  }

  return { sent: true }
}

async function runMonitor(monitor) {
  const result = await checkReservationStatus(buildMonitorQuery(monitor))
  const alertRequired = shouldAlert(monitor, result)
  const alert = alertRequired ? await sendTelegramAlert(monitor, result) : { sent: false, reason: 'status_not_alert_target' }

  return {
    id: monitor.id,
    service: monitor.service,
    campground: monitor.campground,
    period: monitor.period,
    condition: monitor.condition,
    alertRequired,
    alert,
    ...result,
  }
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

  const results = []
  for (const monitor of reservationMonitors) {
    try {
      results.push(await runMonitor(monitor))
    } catch (error) {
      results.push({
        id: monitor.id,
        service: monitor.service,
        campground: monitor.campground,
        status: 'watching',
        error: error instanceof Error ? error.message : 'monitor_failed',
        checkedAt: new Date().toISOString(),
      })
    }
  }

  response.status(200).json({
    checkedAt: new Date().toISOString(),
    monitorCount: reservationMonitors.length,
    results,
  })
}

