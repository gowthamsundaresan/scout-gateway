import { beforeAll, describe, expect, it } from 'vitest'

import { buildServer } from '../app'

beforeAll(() => {
	process.env.DATABASE_URL = 'mongodb://localhost:27017/scout-gateway-test'
	process.env.ADMIN_SECRET = 'test-admin'
	process.env.JWT_SECRET = 'test-jwt'
	process.env.FORWARD_SECRET = 'test-forward'
})

describe('health', () => {
	it('responds ok without auth', async () => {
		const server = buildServer({ logger: false })
		const res = await server.inject({ method: 'GET', url: '/health' })

		expect(res.statusCode).toBe(200)
		expect(res.json()).toEqual({ status: 'ok' })

		await server.close()
	})

	it('rejects /send without a token', async () => {
		const server = buildServer({ logger: false })
		const res = await server.inject({
			method: 'POST',
			url: '/send',
			payload: { templateId: 't', intent: 0 }
		})

		expect(res.statusCode).toBe(401)

		await server.close()
	})
})
