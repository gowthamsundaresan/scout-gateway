import { ServerClient } from 'postmark'

import { Errors } from '../schema/errors'

// --- Core functions ---

export async function sendEmail(subject: string, body: string, replyToken?: string): Promise<void> {
	const token = process.env.POSTMARK_SERVER_TOKEN
	const from = process.env.POSTMARK_FROM_EMAIL
	const to = process.env.EMAIL_TO
	if (!token || !from || !to) {
		throw new Errors.ERR_CHANNEL_NOT_CONFIGURED()
	}

	// Plus-addressed reply-to lets inbound email correlate a reply back to its messageId
	const replyBase = process.env.REPLY_TO_EMAIL
	const replyTo = replyBase && replyToken ? plusAddress(replyBase, replyToken) : undefined

	const client = new ServerClient(token)
	try {
		await client.sendEmail({
			From: from,
			To: to,
			Subject: subject,
			TextBody: body,
			ReplyTo: replyTo
		})
	} catch {
		throw new Errors.ERR_DELIVERY_FAILED()
	}
}

// --- Helper functions ---

function plusAddress(base: string, token: string): string {
	const [local, domain] = base.split('@')
	return `${local}+${token}@${domain}`
}
