// Substitutes {var} placeholders only — never evaluates expressions.
export function render(template: string, vars: Record<string, string> = {}): string {
	return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '')
}

export function extractVars(template: string): string[] {
	const keys = new Set<string>()
	for (const match of template.matchAll(/\{(\w+)\}/g)) {
		keys.add(match[1])
	}
	return [...keys]
}
