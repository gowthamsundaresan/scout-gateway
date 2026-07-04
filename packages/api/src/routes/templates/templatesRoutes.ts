import type { FastifyInstance } from 'fastify'

import { templateBody } from '../../schema/requests'
import type { TemplateBody } from './templatesController'
import { listTemplates, upsertTemplate } from './templatesController'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const register = (server: FastifyInstance, _: any, next: any) => {
	server.post<{ Body: TemplateBody }>(
		'/templates',
		{ preHandler: server.adminKey, schema: { body: templateBody } },
		upsertTemplate
	)

	server.get('/templates', { preHandler: server.adminKey }, listTemplates)

	next()
}
