const scopeSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		send: { type: 'boolean' },
		receive: { type: 'boolean' },
		read: { type: 'boolean' }
	}
}

export const registerBody = {
	type: 'object',
	additionalProperties: false,
	required: ['name', 'scope'],
	properties: {
		clientId: { type: 'string', minLength: 1 },
		name: { type: 'string', minLength: 1 },
		scope: scopeSchema,
		receiveUrl: { type: 'string', format: 'uri' }
	}
}

export const unregisterBody = {
	type: 'object',
	additionalProperties: false,
	required: ['clientId'],
	properties: {
		clientId: { type: 'string', minLength: 1 }
	}
}

export const templateBody = {
	type: 'object',
	additionalProperties: false,
	required: ['name', 'channel', 'title', 'body'],
	properties: {
		templateId: { type: 'string', minLength: 1 },
		name: { type: 'string', minLength: 1 },
		channel: { type: 'string', enum: ['email', 'tg', 'web'] },
		title: { type: 'string' },
		body: { type: 'string' }
	}
}

export const sendBody = {
	type: 'object',
	additionalProperties: false,
	required: ['templateId', 'intent'],
	properties: {
		messageId: { type: 'string', minLength: 1 },
		templateId: { type: 'string', minLength: 1 },
		intent: { type: 'integer', enum: [0, 1] },
		vars: { type: 'object', additionalProperties: { type: 'string' } },
		data: { type: 'object', additionalProperties: true },
		receiverIds: { type: 'array', items: { type: 'string' } }
	}
}

export const listMessagesQuery = {
	type: 'object',
	additionalProperties: false,
	properties: {
		direction: { type: 'string', enum: ['out', 'in'] },
		templateId: { type: 'string', minLength: 1 },
		fromClientId: { type: 'string', minLength: 1 },
		before: { type: 'string', pattern: '^[a-f0-9]{24}$' },
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
	}
}

export const threadParams = {
	type: 'object',
	required: ['messageId'],
	properties: {
		messageId: { type: 'string', minLength: 1 }
	}
}

export const receiveBody = {
	type: 'object',
	additionalProperties: false,
	required: ['payload'],
	properties: {
		messageId: { type: 'string', minLength: 1 },
		payload: { type: 'object', additionalProperties: true },
		replyToMessageId: { type: 'string', minLength: 1 }
	}
}
