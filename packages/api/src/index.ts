import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildServer } from './app'
import { connectToDatabase } from './utils/mongooseClient'

// Load .env from the repo root regardless of the workspace cwd
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') })

const server = buildServer({ logger: true })

async function start() {
	try {
		await connectToDatabase()
		server.log.info('Connected to MongoDB')

		await server.ready()
		await server.listen({
			port: Number(server.config.SERVER_PORT),
			host: server.config.SERVER_HOST
		})
	} catch (err) {
		server.log.error(err)
		process.exit(1)
	}
}

start()
