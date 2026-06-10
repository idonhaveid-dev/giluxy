import { checkReservationStatus } from './check-reservation.js'
import { reservationMonitors } from './reservation-monitor-config.js'
import {
  getActiveReservationMonitorRows,
  hasSupabaseReservationStore,
  updateReservationMonitorRow,
} from './supabase-rest.js'
import { buildReservationAlertText, sendTelegramMessage } from './telegram-alert.js'

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

async function loadReservationMonitors() {
  if (!hasSupabaseReservationStore()) return reservationMonitors

  return getActiveReservationMonitorRows()
}

function shouldAlert(monitor, result) {
  return monitor.alertStatuses.includes(result.status) && monitor.status !== result.status
}

function getAlertSkipReason(monitor, result) {
  if (!monitor.alertStatuses.includes(result.status)) return 'status_not_alert_target'
  return 'status_not_changed'
}

async function sendTelegramAlert(monitor, result) {
  return sendTelegramMessage(buildReservationAlertText(monitor, result))
}

async function runMonitor(monitor) {
  const result = await checkReservationStatus(buildMonitorQuery(monitor))
  const alertRequired = shouldAlert(monitor, result)
  const alert = alertRequired ? await sendTelegramAlert(monitor, result) : { sent: false, reason: getAlertSkipReason(monitor, result) }

  if (hasSupabaseReservationStore()) {
    await updateReservationMonitorRow(monitor.id, { status: result.status })
  }

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
  const monitors = await loadReservationMonitors()

  for (const monitor of monitors) {
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
    monitorCount: monitors.length,
    results,
  })
}
