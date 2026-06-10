import {
  createReservationMonitorRow,
  disableReservationMonitorRow,
  getActiveReservationMonitorRows,
  hasSupabaseReservationStore,
  updateReservationMonitorRow,
} from './supabase-rest.js'

function getIdFromRequest(request) {
  const queryId = request.query?.id
  if (typeof queryId === 'string' && queryId.trim()) return queryId.trim()

  return null
}

function isValidMonitorPayload(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.service === 'string' &&
    typeof value.campground === 'string' &&
    typeof value.period === 'string' &&
    typeof value.condition === 'string' &&
    typeof value.url === 'string'
  )
}

export default async function handler(request, response) {
  if (!hasSupabaseReservationStore()) {
    response.status(503).json({ error: 'Supabase 환경변수가 아직 연결되지 않았습니다.' })
    return
  }

  try {
    if (request.method === 'GET') {
      response.status(200).json({ monitors: await getActiveReservationMonitorRows() })
      return
    }

    if (request.method === 'POST') {
      if (!isValidMonitorPayload(request.body)) {
        response.status(400).json({ error: '모니터링 조건 형식이 올바르지 않습니다.' })
        return
      }

      const monitor = await createReservationMonitorRow(request.body)
      response.status(201).json({ monitor })
      return
    }

    if (request.method === 'DELETE') {
      const id = getIdFromRequest(request)
      if (!id) {
        response.status(400).json({ error: '삭제할 모니터 ID가 필요합니다.' })
        return
      }

      await disableReservationMonitorRow(id)
      response.status(204).end()
      return
    }

    if (request.method === 'PATCH') {
      const id = getIdFromRequest(request)
      if (!id) {
        response.status(400).json({ error: '수정할 모니터 ID가 필요합니다.' })
        return
      }

      const nextStatus = request.body?.status
      if (nextStatus !== 'watching' && nextStatus !== 'available' && nextStatus !== 'closed') {
        response.status(400).json({ error: '상태 값이 올바르지 않습니다.' })
        return
      }

      const monitor = await updateReservationMonitorRow(id, { status: nextStatus })
      response.status(200).json({ monitor })
      return
    }

    response.setHeader('Allow', 'GET, POST, PATCH, DELETE')
    response.status(405).json({ error: 'Method not allowed.' })
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : '예약 모니터 저장소 처리에 실패했습니다.',
    })
  }
}
