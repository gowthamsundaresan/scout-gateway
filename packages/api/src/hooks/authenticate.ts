import type { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify'

import { Client } from '../models'
import type { ClientDocument, IClientScope } from '../models/client'
import { Errors, handleAndReturnErrorResponse } from '../schema/errors'

// --- Types & state ---

type ScopeKey = keyof IClientScope

declare module 'fastify' {
	interface FastifyInstance {
		authenticate: (
			scope?: ScopeKey
		) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
	}
	interface FastifyRequest {
		client?: ClientDocument
	}
}

declare module '@fastify/jwt' {
	interface FastifyJWT {
		payload: { clientId: string; scope: IClientScope; ver: number }
		user: { clientId: string; scope: IClientScope; ver: number }
	}
}

// --- Core functions ---

export function authenticateHook(
	server: FastifyInstance,
	_opts: FastifyPluginOptions,
	next: () => void
) {
	server.decorate('authenticate', (scope?: ScopeKey) => {
		return async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				await request.jwtVerify()
			} catch (err) {
				return handleAndReturnErrorResponse(reply, err)
			}

			const { clientId, ver } = request.user
			const client = await Client.findOne({ clientId, isActive: true })

			// tokenVersion mismatch means the JWT was superseded by a re-register/unregister
			if (!client || client.tokenVersion !== ver) {
				return handleAndReturnErrorResponse(reply, new Errors.ERR_INVALID_TOKEN())
			}

			if (scope && !client.scope[scope]) {
				return handleAndReturnErrorResponse(reply, new Errors.ERR_FORBIDDEN_SCOPE())
			}

			request.client = client
		}
	})

	next()
}
