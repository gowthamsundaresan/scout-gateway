import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify'

export function rateLimiterHook(
	server: FastifyInstance,
	_opts: FastifyPluginOptions,
	next: () => void
) {
	server.register(rateLimit, {
		max: 120,
		timeWindow: '1 minute',
		keyGenerator: (request: FastifyRequest) => {
			const user = request.user
			return user?.clientId ? `client:${user.clientId}` : `ip:${request.ip}`
		},
		allowList: (request: FastifyRequest) => request.url.includes('/health')
	})

	next()
}
