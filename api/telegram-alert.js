export function hasTelegramConfig() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
}

export async function sendTelegramMessage(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    return { sent: false, reason: 'telegram_env_missing' }
  }

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

export function buildReservationAlertText(monitor, result) {
  return [
    '[GILUXY 야영장 빈자리 감지]',
    `${monitor.service} / ${monitor.campground}`,
    `${monitor.period} / ${monitor.condition}`,
    result.message,
    monitor.url,
  ].join('\n')
}
