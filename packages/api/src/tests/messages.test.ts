import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { FastifyInstance } from 'fastify'

import { buildServer } from '../app'
import { Client, Message, Template } from '../models'
import { connectToDatabase } from '../utils/mongooseClient'

let mongod: MongoMemoryServer
let server: FastifyInstance
let readerToken: string
let senderToken: string
let legacyToken: string

beforeAll(async () => {
	mongod = await MongoMemoryServer.create()
	process.env.DATABASE_URL = mongod.getUri()
	process.env.ADMIN_SECRET = 'test-admin'
	process.env.JWT_SECRET = 'test-jwt'
	process.env.FORWARD_SECRET = 'test-forward'

	await connectToDatabase()
	server = buildServer({ logger: false })
	await server.ready()

	await Client.create({
		clientId: 'reader',
		name: 'reader',
		scope: { send: false, receive: false, read: true }
	})
	await Client.create({
		clientId: 'sender',
		name: 'sender',
		scope: { send: true, receive: false, read: false }
	})
	// Pre-`read`-scope client doc, shaped as registration wrote it before this feature existed
	await Client.collection.insertOne({
		clientId: 'legacy',
		name: 'legacy',
		scope: { send: true, receive: false },
		tokenVersion: 0,
		isActive: true
	})

	readerToken = server.jwt.sign({
		clientId: 'reader',
		scope: { send: false, receive: false, read: true },
		ver: 0
	})
	senderToken = server.jwt.sign({
		clientId: 'sender',
		scope: { send: true, receive: false, read: false },
		ver: 0
	})
	legacyToken = server.jwt.sign({
		clientId: 'legacy',
		scope: { send: true, receive: false, read: false },
		ver: 0
	})

	await Template.create({
		templateId: 'digest-web',
		name: 'Digest — web',
		channel: 'web',
		title: '{title}',
		body: '{body}'
	})

	for (let i = 1; i <= 4; i++) {
		await Message.create({
			messageId: `run-1-section-${i}`,
			fromClientId: 'sender',
			direction: 'out',
			intent: i % 2,
			templateId: 'digest-web',
			payload: { vars: {}, rendered: { title: `t${i}`, body: `b${i}` } },
			receiverIds: ['evals'],
			status: 'delivered'
		})
	}
	for (let i = 1; i <= 2; i++) {
		await Message.create({
			messageId: `reply-${i}`,
			fromClientId: 'web',
			direction: 'in',
			payload: { text: `reply ${i}` },
			replyToMessageId: 'run-1-section-1',
			receiverIds: ['evals'],
			status: 'forwarded'
		})
	}
})

afterAll(async () => {
	await server.close()
	await mongoose.disconnect()
	await mongod.stop()
})

describe('GET /messages auth', () => {
	it('rejects without a token', async () => {
		const res = await server.inject({ method: 'GET', url: '/messages' })
		expect(res.statusCode).toBe(401)
	})

	it('rejects a send-only token', async () => {
		const res = await server.inject({
			method: 'GET',
			url: '/messages',
			headers: { authorization: `Bearer ${senderToken}` }
		})
		expect(res.statusCode).toBe(403)
	})

	it('rejects a legacy client whose doc predates the read scope', async () => {
		const res = await server.inject({
			method: 'GET',
			url: '/messages',
			headers: { authorization: `Bearer ${legacyToken}` }
		})
		expect(res.statusCode).toBe(403)
	})
})

describe('GET /messages', () => {
	it('lists newest first with filters', async () => {
		const res = await server.inject({
			method: 'GET',
			url: '/messages?direction=out&templateId=digest-web',
			headers: { authorization: `Bearer ${readerToken}` }
		})

		expect(res.statusCode).toBe(200)
		const { messages } = res.json()
		expect(messages).toHaveLength(4)
		expect(messages[0].messageId).toBe('run-1-section-4')
		expect(messages.every((m: { direction: string }) => m.direction === 'out')).toBe(true)
	})

	it('filters by fromClientId', async () => {
		const res = await server.inject({
			method: 'GET',
			url: '/messages?fromClientId=web',
			headers: { authorization: `Bearer ${readerToken}` }
		})

		const { messages } = res.json()
		expect(messages).toHaveLength(2)
		expect(messages[0].payload.text).toBe('reply 2')
	})

	it('paginates via the before cursor without overlap', async () => {
		const first = await server.inject({
			method: 'GET',
			url: '/messages?direction=out&limit=2',
			headers: { authorization: `Bearer ${readerToken}` }
		})
		const page1 = first.json()
		expect(page1.messages).toHaveLength(2)
		expect(page1.nextCursor).toBeTruthy()

		const second = await server.inject({
			method: 'GET',
			url: `/messages?direction=out&limit=2&before=${page1.nextCursor}`,
			headers: { authorization: `Bearer ${readerToken}` }
		})
		const page2 = second.json()

		const ids1 = page1.messages.map((m: { messageId: string }) => m.messageId)
		const ids2 = page2.messages.map((m: { messageId: string }) => m.messageId)
		expect(ids1).toEqual(['run-1-section-4', 'run-1-section-3'])
		expect(ids2).toEqual(['run-1-section-2', 'run-1-section-1'])
	})

	it('rejects a malformed cursor', async () => {
		const res = await server.inject({
			method: 'GET',
			url: '/messages?before=not-a-cursor',
			headers: { authorization: `Bearer ${readerToken}` }
		})
		expect(res.statusCode).toBe(400)
	})
})

describe('GET /messages/:messageId/thread', () => {
	it('returns the message and its replies oldest first', async () => {
		const res = await server.inject({
			method: 'GET',
			url: '/messages/run-1-section-1/thread',
			headers: { authorization: `Bearer ${readerToken}` }
		})

		expect(res.statusCode).toBe(200)
		const { message, replies } = res.json()
		expect(message.messageId).toBe('run-1-section-1')
		expect(replies.map((r: { messageId: string }) => r.messageId)).toEqual(['reply-1', 'reply-2'])
	})

	it('404s on an unknown message', async () => {
		const res = await server.inject({
			method: 'GET',
			url: '/messages/nope/thread',
			headers: { authorization: `Bearer ${readerToken}` }
		})
		expect(res.statusCode).toBe(404)
	})
})

describe('POST /send with web channel and data', () => {
	it('delivers with no transport configured and stores payload.data', async () => {
		const res = await server.inject({
			method: 'POST',
			url: '/send',
			headers: { authorization: `Bearer ${senderToken}` },
			payload: {
				messageId: 'run-2-section-1',
				templateId: 'digest-web',
				intent: 0,
				vars: { title: 'People', body: 'fallback body' },
				data: { entries: [{ kind: 'person', name: 'Ada', why: 'ships' }] }
			}
		})

		expect(res.statusCode).toBe(200)
		expect(res.json()).toEqual({ messageId: 'run-2-section-1', status: 'delivered' })

		const read = await server.inject({
			method: 'GET',
			url: '/messages?templateId=digest-web&limit=1',
			headers: { authorization: `Bearer ${readerToken}` }
		})
		const { messages } = read.json()
		expect(messages[0].messageId).toBe('run-2-section-1')
		expect(messages[0].payload.data.entries[0].name).toBe('Ada')
		expect(messages[0].payload.rendered.body).toBe('fallback body')
	})

	it('replays an existing messageId without duplicating', async () => {
		const res = await server.inject({
			method: 'POST',
			url: '/send',
			headers: { authorization: `Bearer ${senderToken}` },
			payload: {
				messageId: 'run-2-section-1',
				templateId: 'digest-web',
				intent: 0,
				vars: { title: 'People', body: 'other' }
			}
		})

		expect(res.statusCode).toBe(200)
		const count = await Message.countDocuments({ messageId: 'run-2-section-1' })
		expect(count).toBe(1)
	})
})
