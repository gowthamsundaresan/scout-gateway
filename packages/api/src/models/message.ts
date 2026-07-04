import mongoose from 'mongoose'

// --- Types & state ---

export type Direction = 'out' | 'in'

export interface IMessage {
	messageId: string
	fromClientId: string
	direction: Direction
	intent?: number
	templateId?: string
	payload: Record<string, unknown>
	receiverIds: string[]
	replyToMessageId?: string
	status: string
	createdAt: Date
	updatedAt: Date
}

const MessageSchema = new mongoose.Schema<IMessage>(
	{
		messageId: { type: String, required: true, unique: true, trim: true },
		fromClientId: { type: String, required: true, index: true },
		direction: { type: String, required: true, enum: ['out', 'in'] },
		intent: { type: Number },
		templateId: { type: String },
		payload: { type: mongoose.Schema.Types.Mixed, default: {} },
		receiverIds: { type: [String], default: [] },
		replyToMessageId: { type: String, index: true },
		status: { type: String, default: 'pending' }
	},
	{ timestamps: true }
)

const Message = mongoose.model<IMessage>('Message', MessageSchema)
export default Message
