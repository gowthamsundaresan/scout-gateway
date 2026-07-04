import type { FastifyInstance } from 'fastify'

import { receiveBody, sendBody } from '../../schema/requests'
import type { ReceiveBody, SendBody } from './messagesController'
import { receive, send } from './messagesController'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const register = (server: FastifyInstance, _: any, next: any) => {
	server.post<{ Body: SendBody }>(
		'/send',
		{ preHandler: server.authenticate('send'), schema: { body: sendBody } },
		send
	)

	// /receive ingests an inbound message; publishing into the gateway requires the send scope.
	server.post<{ Body: ReceiveBody }>(
		'/receive',
		{ preHandler: server.authenticate('send'), schema: { body: receiveBody } },
		receive
	)

	next()
}
