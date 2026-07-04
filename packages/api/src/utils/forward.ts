import { hmacSign } from './crypto'

// Signed so the receiver can verify the gateway is the source.
export async function forwardMessage(
	url: string,
	secret: string,
	body: Record<string, unknown>
): Promise<boolean> {
	const raw = JSON.stringify(body)
	const signature = hmacSign(raw, secret)

	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-scout-signature': signature
			},
			body: raw
		})
		return res.ok
	} catch {
		return false
	}
}
