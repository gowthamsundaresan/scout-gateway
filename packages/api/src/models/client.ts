import mongoose, { type HydratedDocument } from 'mongoose'

// --- Types & state ---

export interface IClientScope {
	send: boolean
	receive: boolean
	read: boolean
}

export interface IClient {
	clientId: string
	name: string
	scope: IClientScope
	receiveUrl?: string
	tokenVersion: number
	isActive: boolean
	createdAt: Date
	updatedAt: Date
}

export type ClientDocument = HydratedDocument<IClient>

const ClientSchema = new mongoose.Schema<IClient>(
	{
		clientId: { type: String, required: true, unique: true, trim: true },
		name: { type: String, required: true, trim: true },
		scope: {
			send: { type: Boolean, default: false },
			receive: { type: Boolean, default: false },
			read: { type: Boolean, default: false }
		},
		receiveUrl: {
			type: String,
			validate: {
				// Forward targets must be reachable over HTTPS
				validator: (value: string) => {
					if (!value) return true
					try {
						return new URL(value).protocol === 'https:'
					} catch {
						return false
					}
				},
				message: 'receiveUrl must be a valid HTTPS URL'
			}
		},
		tokenVersion: { type: Number, default: 0 },
		isActive: { type: Boolean, default: true }
	},
	{ timestamps: true }
)

ClientSchema.index({ isActive: 1 })

const Client = mongoose.model<IClient>('Client', ClientSchema)
export default Client
