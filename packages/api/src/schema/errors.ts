import type { FastifyReply } from 'fastify'

// --- Types & state ---

export type ErrorCode =
	| 'bad_request'
	| 'unauthorized'
	| 'forbidden'
	| 'not_found'
	| 'rate_limit_exceeded'
	| 'configuration_error'
	| 'internal_server_error'

const errorCodeToHttpStatus: Record<ErrorCode, number> = {
	bad_request: 400,
	unauthorized: 401,
	forbidden: 403,
	not_found: 404,
	rate_limit_exceeded: 429,
	configuration_error: 500,
	internal_server_error: 500
}

export interface ErrorResponse {
	error: {
		code: ErrorCode
		message: string
	}
}

export class ScoutApiError extends Error {
	public readonly code: ErrorCode

	constructor(code: ErrorCode, message: string) {
		super(message)
		this.code = code
	}
}

const errorConfig = {
	ERR_INVALID_ADMIN_KEY: ['unauthorized', 'Invalid or missing admin key'],
	ERR_INVALID_TOKEN: ['unauthorized', 'Invalid or expired token'],
	ERR_FORBIDDEN_SCOPE: ['forbidden', 'Client is not authorized for this action'],
	ERR_CLIENT_NOT_FOUND: ['not_found', 'Client not found'],
	ERR_TEMPLATE_NOT_FOUND: ['not_found', 'Template not found'],
	ERR_RECEIVE_URL_REQUIRED: ['bad_request', 'receiveUrl is required when receive scope is enabled'],
	ERR_CHANNEL_NOT_CONFIGURED: ['configuration_error', 'Delivery channel is not configured'],
	ERR_DELIVERY_FAILED: ['internal_server_error', 'Failed to deliver message']
} as const satisfies Record<string, readonly [ErrorCode, string]>

// --- Core functions ---

export function handleApiError(error: unknown): ErrorResponse & { status: number } {
	if (error instanceof ScoutApiError) {
		return {
			error: { code: error.code, message: error.message },
			status: errorCodeToHttpStatus[error.code]
		}
	}

	// Fastify schema validation errors
	if (error && typeof error === 'object' && 'validation' in error) {
		return {
			error: {
				code: 'bad_request',
				message: (error as { message?: string }).message || 'Validation failed'
			},
			status: 400
		}
	}

	// Fastify JWT errors (FST_JWT_* / FAST_JWT_*)
	if (
		error &&
		typeof error === 'object' &&
		'code' in error &&
		typeof (error as { code: unknown }).code === 'string' &&
		((error as { code: string }).code.startsWith('FST_JWT_') ||
			(error as { code: string }).code.startsWith('FAST_JWT_'))
	) {
		return {
			error: { code: 'unauthorized', message: 'Invalid or expired authorization token' },
			status: 401
		}
	}

	console.error('Unhandled API error', error)
	return {
		error: { code: 'internal_server_error', message: 'An internal server error occurred' },
		status: 500
	}
}

export function handleAndReturnErrorResponse(reply: FastifyReply, error: unknown) {
	const { error: body, status } = handleApiError(error)
	return reply.status(status).send({ error: body })
}

// --- Helper functions ---

function createErrors<T extends Record<string, readonly [ErrorCode, string]>>(config: T) {
	const out = {} as { [K in keyof T]: new () => ScoutApiError }
	for (const [key, [code, message]] of Object.entries(config)) {
		out[key as keyof T] = class extends ScoutApiError {
			constructor() {
				super(code, message)
			}
		}
	}
	return out
}

export const Errors = createErrors(errorConfig)
