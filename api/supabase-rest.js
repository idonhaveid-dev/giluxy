const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabaseRestUrl() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null

  const baseUrl = SUPABASE_URL.replace(/\/$/, '')
  return baseUrl.endsWith('/rest/v1') ? baseUrl : `${baseUrl}/rest/v1`
}

function getHeaders(extraHeaders = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'content-type': 'application/json',
    ...extraHeaders,
  }
}

export function hasSupabaseReservationStore() {
  return Boolean(getSupabaseRestUrl())
}

export function mapReservationMonitorRow(row) {
  return {
    id: row.id,
    service: row.service,
    campground: row.campground,
    period: row.period,
    condition: row.condition,
    status: row.status ?? 'watching',
    url: row.url,
    alertStatuses: Array.isArray(row.alert_statuses) ? row.alert_statuses : ['available'],
    enabled: row.enabled !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function requestSupabase(path, options = {}) {
  const restUrl = getSupabaseRestUrl()
  if (!restUrl) {
    throw new Error('Supabase environment variables are not configured.')
  }

  const response = await fetch(`${restUrl}${path}`, {
    ...options,
    headers: getHeaders(options.headers),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Supabase request failed: ${response.status} ${body}`)
  }

  if (response.status === 204) return null
  return response.json()
}

export async function getActiveReservationMonitorRows() {
  const rows = await requestSupabase('/reservation_monitors?enabled=eq.true&order=created_at.desc')
  return rows.map(mapReservationMonitorRow)
}

export async function createReservationMonitorRow(monitor) {
  const rows = await requestSupabase('/reservation_monitors', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify({
      service: monitor.service,
      campground: monitor.campground,
      period: monitor.period,
      condition: monitor.condition,
      url: monitor.url,
      status: monitor.status ?? 'watching',
      enabled: true,
      alert_statuses: monitor.alertStatuses ?? ['available'],
    }),
  })

  return mapReservationMonitorRow(rows[0])
}

export async function updateReservationMonitorRow(id, patch) {
  const rows = await requestSupabase(`/reservation_monitors?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify({
      ...patch,
      updated_at: new Date().toISOString(),
    }),
  })

  return rows[0] ? mapReservationMonitorRow(rows[0]) : null
}

export async function disableReservationMonitorRow(id) {
  return updateReservationMonitorRow(id, { enabled: false })
}
