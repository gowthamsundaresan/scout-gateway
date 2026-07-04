import type { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify'

import { Errors, handleAndReturnErrorResponse } from '../schema/errors'
import { safeEqual } from '../utils/crypto'

declare module 'fastify' {
	interface FastifyInstance {
		adminKey: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
	}
}

export function adminKeyHook(
	server: FastifyInstance,
	_opts: FastifyPluginOptions,
	next: () => void
) {
	server.decorate('adminKey', async (request: FastifyRequest, reply: FastifyReply) => {
		const provided = request.headers['x-api-key']
		const expected = server.config.ADMIN_SECRET
		if (typeof provided !== 'string' || !safeEqual(provided, expected)) {
			return handleAndReturnErrorResponse(reply, new Errors.ERR_INVALID_ADMIN_KEY())
		}
	})

	next()
}
