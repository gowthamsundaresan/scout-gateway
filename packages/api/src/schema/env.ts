import type { JSONSchemaType } from 'env-schema'

// --- Types & state ---

interface IEnvSchema {
	SERVER_PORT: string
	SERVER_HOST: string
	DATABASE_URL: string

	ADMIN_SECRET: string
	JWT_SECRET: string
	FORWARD_SECRET: string

	POSTMARK_SERVER_TOKEN?: string
	POSTMARK_FROM_EMAIL?: string
	EMAIL_TO?: string
	REPLY_TO_EMAIL?: string

	TELEGRAM_BOT_TOKEN?: string
	TELEGRAM_CHAT_ID?: string
}

declare module 'fastify' {
	interface FastifyInstance {
		config: IEnvSchema
	}
}

export const envSchema: JSONSchemaType<IEnvSchema> = {
	type: 'object',
	required: ['DATABASE_URL', 'ADMIN_SECRET', 'JWT_SECRET', 'FORWARD_SECRET'],
	properties: {
		SERVER_PORT: { type: 'string', default: '3001' },
		SERVER_HOST: { type: 'string', default: '0.0.0.0' },
		DATABASE_URL: { type: 'string' },

		ADMIN_SECRET: { type: 'string' },
		JWT_SECRET: { type: 'string' },
		FORWARD_SECRET: { type: 'string' },

		POSTMARK_SERVER_TOKEN: { type: 'string', nullable: true },
		POSTMARK_FROM_EMAIL: { type: 'string', nullable: true },
		EMAIL_TO: { type: 'string', nullable: true },
		REPLY_TO_EMAIL: { type: 'string', nullable: true },

		TELEGRAM_BOT_TOKEN: { type: 'string', nullable: true },
		TELEGRAM_CHAT_ID: { type: 'string', nullable: true }
	}
}
