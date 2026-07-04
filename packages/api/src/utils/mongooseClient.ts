import mongoose from 'mongoose'

let isConnected = false

export async function connectToDatabase() {
	if (isConnected) {
		return mongoose
	}

	const mongoUri = process.env.DATABASE_URL
	if (!mongoUri) {
		throw new Error('DATABASE_URL is not defined')
	}

	await mongoose.connect(mongoUri)
	isConnected = true
	return mongoose
}
