import type { FastifyInstance } from 'fastify'

import { listMessagesQuery, receiveBody, sendBody, threadParams } from '../../schema/requests'
import type { ListMessagesQuery, ReceiveBody, SendBody, ThreadParams } from './messagesController'
import { getThread, listMessages, receive, send } from './messagesController'

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

	server.get<{ Querystring: ListMessagesQuery }>(
		'/messages',
		{ preHandler: server.authenticate('read'), schema: { querystring: listMessagesQuery } },
		listMessages
	)

	server.get<{ Params: ThreadParams }>(
		'/messages/:messageId/thread',
		{ preHandler: server.authenticate('read'), schema: { params: threadParams } },
		getThread
	)

	next()
}
