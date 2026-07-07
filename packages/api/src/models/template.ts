import mongoose from 'mongoose'

// --- Types & state ---

export type Channel = 'email' | 'tg' | 'web'

export interface ITemplate {
	templateId: string
	name: string
	channel: Channel
	title: string
	body: string
	createdAt: Date
	updatedAt: Date
}

const TemplateSchema = new mongoose.Schema<ITemplate>(
	{
		templateId: { type: String, required: true, unique: true, trim: true },
		name: { type: String, required: true, trim: true },
		channel: { type: String, required: true, enum: ['email', 'tg', 'web'] },
		title: { type: String, default: '' },
		body: { type: String, required: true }
	},
	{ timestamps: true }
)

const Template = mongoose.model<ITemplate>('Template', TemplateSchema)
export default Template
