import { Errors } from '../schema/errors'

export async function sendTelegram(title: string, body: string): Promise<void> {
	const token = process.env.TELEGRAM_BOT_TOKEN
	const chatId = process.env.TELEGRAM_CHAT_ID
	if (!token || !chatId) {
		throw new Errors.ERR_CHANNEL_NOT_CONFIGURED()
	}

	const text = title ? `*${title}*\n\n${body}` : body
	const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
	})
	if (!res.ok) {
		throw new Errors.ERR_DELIVERY_FAILED()
	}
}
