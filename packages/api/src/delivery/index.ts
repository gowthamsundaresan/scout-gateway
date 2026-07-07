import type { Channel } from '../models/template'
import { Errors } from '../schema/errors'
import { sendEmail } from './email'
import { sendTelegram } from './telegram'

export interface Rendered {
	title: string
	body: string
}

// replyToken (the messageId) is embedded in the email reply-to so replies can be correlated.
export async function deliver(
	channel: Channel,
	rendered: Rendered,
	replyToken?: string
): Promise<void> {
	switch (channel) {
		case 'email':
			return sendEmail(rendered.title, rendered.body, replyToken)
		case 'tg':
			return sendTelegram(rendered.title, rendered.body, replyToken)
		case 'web':
			// Stored-only channel: the dashboard reads messages via GET /messages
			return
		default:
			throw new Errors.ERR_CHANNEL_NOT_CONFIGURED()
	}
}
