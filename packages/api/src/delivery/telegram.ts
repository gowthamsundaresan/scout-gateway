import { Errors } from '../schema/errors'

export async function sendTelegram(
	title: string,
	body: string,
	replyToken?: string
): Promise<void> {
	const token = process.env.TELEGRAM_BOT_TOKEN
	const chatId = process.env.TELEGRAM_CHAT_ID
	if (!token || !chatId) {
		throw new Errors.ERR_CHANNEL_NOT_CONFIGURED()
	}

	// The ·ref footer is what ingress clients parse from reply_to text to correlate replies.
	const titled = title ? `*${title}*\n\n${body}` : body
	const text = replyToken ? `${titled}\n\n·ref:${replyToken}` : titled
	const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
	})
	if (!res.ok) {
		throw new Errors.ERR_DELIVERY_FAILED()
	}
}
