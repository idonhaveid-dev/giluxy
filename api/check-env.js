export default function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  response.status(200).json({
    supabaseUrl: Boolean(process.env.SUPABASE_URL),
    supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    telegramBotToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    telegramChatId: Boolean(process.env.TELEGRAM_CHAT_ID),
  })
}
