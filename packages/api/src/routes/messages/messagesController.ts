import type { FastifyReply, FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'

import { deliver } from '../../delivery'
import { Client, Message, Template } from '../../models'
import { Errors, ScoutApiError, handleAndReturnErrorResponse } from '../../schema/errors'
import { forwardMessage } from '../../utils/forward'
import { extractVars, render } from '../../utils/render'

// --- Types & state ---

export interface SendBody {
	messageId?: string
	templateId: string
	intent: number
	vars?: Record<string, string>
	receiverIds?: string[]
}

export interface ReceiveBody {
	messageId?: string
	payload: Record<string, unknown>
	replyToMessageId?: string
}

// --- Core functions ---

export async function send(request: FastifyRequest<{ Body: SendBody }>, reply: FastifyReply) {
	try {
		const { messageId, templateId, intent, vars, receiverIds } = request.body
		const client = request.client!

		const existing = messageId ? await Message.findOne({ messageId }) : null
		if (existing) {
			return reply.send({ messageId: existing.messageId, status: existing.status })
		}

		const template = await Template.findOne({ templateId })
		if (!template) {
			throw new Errors.ERR_TEMPLATE_NOT_FOUND()
		}

		// A template's {var} placeholders are its required inputs; fail loud on a broken digest
		const required = [...new Set([...extractVars(template.title), ...extractVars(template.body)])]
		const missing = required.filter((key) => !vars || !(key in vars))
		if (missing.length) {
			throw new ScoutApiError('bad_request', `Missing template vars: ${missing.join(', ')}`)
		}

		const id = messageId ?? randomUUID()
		const rendered = {
			title: render(template.title, vars),
			body: render(template.body, vars)
		}

		// Persist before delivering so a failed send is still recorded, not lost
		const message = await Message.create({
			messageId: id,
			fromClientId: client.clientId,
			direction: 'out',
			intent,
			templateId,
			payload: { vars: vars ?? {}, rendered },
			receiverIds: receiverIds ?? [],
			status: 'pending'
		})

		try {
			await deliver(template.channel, rendered, id)
			message.status = 'delivered'
			await message.save()
		} catch (error) {
			message.status = 'failed'
			await message.save()
			throw error
		}

		return reply.send({ messageId: id, status: 'delivered' })
	} catch (error) {
		return handleAndReturnErrorResponse(reply, error)
	}
}

export async function receive(request: FastifyRequest<{ Body: ReceiveBody }>, reply: FastifyReply) {
	try {
		const { messageId, payload, replyToMessageId } = request.body
		const client = request.client!

		const existing = messageId ? await Message.findOne({ messageId }) : null
		if (existing) {
			return reply.send({ messageId: existing.messageId, forwardedTo: existing.receiverIds })
		}

		// Routing is inherited from the replied-to message; ingress never chooses receivers
		const targets = await resolveReceivers(replyToMessageId)

		const id = messageId ?? randomUUID()
		const message = await Message.create({
			messageId: id,
			fromClientId: client.clientId,
			direction: 'in',
			payload,
			replyToMessageId,
			receiverIds: targets,
			status: 'received'
		})

		const forwardedTo = await forwardToReceivers(targets, request.server.config.FORWARD_SECRET, {
			messageId: id,
			fromClientId: client.clientId,
			replyToMessageId,
			payload
		})

		message.receiverIds = forwardedTo
		message.status = forwardedTo.length ? 'forwarded' : 'received'
		await message.save()

		return reply.send({ messageId: id, forwardedTo })
	} catch (error) {
		return handleAndReturnErrorResponse(reply, error)
	}
}

// --- Helper functions ---

async function resolveReceivers(replyToMessageId: string | undefined): Promise<string[]> {
	if (!replyToMessageId) {
		return []
	}
	const original = await Message.findOne({ messageId: replyToMessageId })
	return original?.receiverIds ?? []
}

async function forwardToReceivers(
	receiverIds: string[],
	secret: string,
	body: Record<string, unknown>
): Promise<string[]> {
	const delivered: string[] = []
	for (const clientId of receiverIds) {
		const client = await Client.findOne({ clientId, isActive: true })
		if (!client?.scope.receive || !client.receiveUrl) {
			continue
		}
		const ok = await forwardMessage(client.receiveUrl, secret, body)
		if (ok) {
			delivered.push(clientId)
		}
	}
	return delivered
}
