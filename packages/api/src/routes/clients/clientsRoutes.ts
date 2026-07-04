import type { FastifyInstance } from 'fastify'

import { registerBody, unregisterBody } from '../../schema/requests'
import type { RegisterBody, UnregisterBody } from './clientsController'
import { registerClient, unregisterClient } from './clientsController'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const register = (server: FastifyInstance, _: any, next: any) => {
	server.post<{ Body: RegisterBody }>(
		'/register',
		{ preHandler: server.adminKey, schema: { body: registerBody } },
		registerClient
	)

	server.post<{ Body: UnregisterBody }>(
		'/unregister',
		{ preHandler: server.adminKey, schema: { body: unregisterBody } },
		unregisterClient
	)

	next()
}
