import { createHmac, timingSafeEqual } from 'node:crypto'

// Constant-time string compare; returns false on length mismatch without leaking timing.
export function safeEqual(a: string, b: string): boolean {
	const ab = Buffer.from(a)
	const bb = Buffer.from(b)
	if (ab.length !== bb.length) {
		return false
	}
	return timingSafeEqual(ab, bb)
}

export function hmacSign(payload: string, secret: string): string {
	return createHmac('sha256', secret).update(payload).digest('hex')
}
