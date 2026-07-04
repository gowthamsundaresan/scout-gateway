import fastifyEnv from '@fastify/env'
import fastifyJwt from '@fastify/jwt'
import fastify, { type FastifyServerOptions } from 'fastify'
import fastifyPlugin from 'fastify-plugin'

import { JWT_EXPIRY } from './constants'
import { adminKeyHook } from './hooks/adminKey'
import { authenticateHook } from './hooks/authenticate'
import { rateLimiterHook } from './hooks/rateLimiter'
import { register as registerClients } from './routes/clients/clientsRoutes'
import { register as registerMessages } from './routes/messages/messagesRoutes'
import { register as registerTemplates } from './routes/templates/templatesRoutes'
import { envSchema } from './schema/env'

// No Mongo connect or listen here, so the server stays testable via inject().
export function buildServer(opts: FastifyServerOptions = { logger: true }) {
	const server = fastify(opts)

	server.get('/health', async () => ({ status: 'ok' }))

	server.register(fastifyEnv, { schema: envSchema })

	const jwtSecret = process.env.JWT_SECRET
	if (!jwtSecret) {
		throw new Error('JWT_SECRET is not defined')
	}
	server.register(fastifyJwt, { secret: jwtSecret, sign: { expiresIn: JWT_EXPIRY } })

	server.register(fastifyPlugin(adminKeyHook))
	server.register(fastifyPlugin(authenticateHook))
	server.register(fastifyPlugin(rateLimiterHook))

	server.register(registerClients)
	server.register(registerMessages)
	server.register(registerTemplates)

	return server
}
