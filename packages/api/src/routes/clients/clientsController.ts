import type { FastifyReply, FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'

import { Client } from '../../models'
import type { IClientScope } from '../../models/client'
import { Errors, handleAndReturnErrorResponse } from '../../schema/errors'

// --- Types & state ---

export interface RegisterBody {
	clientId?: string
	name: string
	scope: IClientScope
	receiveUrl?: string
}

export interface UnregisterBody {
	clientId: string
}

// --- Core functions ---

export async function registerClient(
	request: FastifyRequest<{ Body: RegisterBody }>,
	reply: FastifyReply
) {
	try {
		const { clientId, name, scope, receiveUrl } = request.body

		if (scope.receive && !receiveUrl) {
			throw new Errors.ERR_RECEIVE_URL_REQUIRED()
		}

		const id = clientId ?? randomUUID()

		// $inc tokenVersion so any previously issued JWT for this client is invalidated
		const client = await Client.findOneAndUpdate(
			{ clientId: id },
			{
				$set: { name, scope, receiveUrl, isActive: true },
				$inc: { tokenVersion: 1 }
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		)

		const jwt = request.server.jwt.sign({
			clientId: id,
			scope: client.scope,
			ver: client.tokenVersion
		})

		return reply.send({ clientId: id, scope: client.scope, jwt })
	} catch (error) {
		return handleAndReturnErrorResponse(reply, error)
	}
}

export async function unregisterClient(
	request: FastifyRequest<{ Body: UnregisterBody }>,
	reply: FastifyReply
) {
	try {
		const { clientId } = request.body

		const client = await Client.findOneAndUpdate(
			{ clientId },
			{ $set: { isActive: false }, $inc: { tokenVersion: 1 } },
			{ new: true }
		)

		if (!client) {
			throw new Errors.ERR_CLIENT_NOT_FOUND()
		}

		return reply.send({ ok: true })
	} catch (error) {
		return handleAndReturnErrorResponse(reply, error)
	}
}
