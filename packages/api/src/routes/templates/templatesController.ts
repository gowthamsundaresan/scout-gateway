import type { FastifyReply, FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'

import { Template } from '../../models'
import type { Channel } from '../../models/template'
import { handleAndReturnErrorResponse } from '../../schema/errors'

// --- Types & state ---

export interface TemplateBody {
	templateId?: string
	name: string
	channel: Channel
	title: string
	body: string
}

// --- Core functions ---

export async function upsertTemplate(
	request: FastifyRequest<{ Body: TemplateBody }>,
	reply: FastifyReply
) {
	try {
		const { templateId, name, channel, title, body } = request.body
		const id = templateId ?? randomUUID()

		const template = await Template.findOneAndUpdate(
			{ templateId: id },
			{ $set: { name, channel, title, body } },
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		)

		return reply.send({
			templateId: template.templateId,
			name: template.name,
			channel: template.channel
		})
	} catch (error) {
		return handleAndReturnErrorResponse(reply, error)
	}
}

export async function listTemplates(_request: FastifyRequest, reply: FastifyReply) {
	try {
		const templates = await Template.find().sort({ createdAt: -1 }).lean()
		return reply.send({
			templates: templates.map((t) => ({
				templateId: t.templateId,
				name: t.name,
				channel: t.channel
			}))
		})
	} catch (error) {
		return handleAndReturnErrorResponse(reply, error)
	}
}
