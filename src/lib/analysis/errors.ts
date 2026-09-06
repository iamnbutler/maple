// Typed errors the analysis layer throws, and the HTTP status each maps to.
//
// The routes translate these rather than string-matching messages, so a missing
// stat window comes back as a 409 ("the document exists, but it is not in a
// state that can be analysed") instead of a generic 500.

export type AnalysisErrorCode = 'missing-stat-window' | 'unknown-class' | 'unknown-target';

const STATUS: Record<AnalysisErrorCode, number> = {
	'missing-stat-window': 409,
	'unknown-class': 409,
	'unknown-target': 400
};

export class AnalysisError extends Error {
	readonly code: AnalysisErrorCode;
	readonly status: number;

	constructor(code: AnalysisErrorCode, message: string) {
		super(message);
		this.name = 'AnalysisError';
		this.code = code;
		this.status = STATUS[code];
	}
}

/** `409` — the character has no `statWindow`, which is the source of truth (design §2). */
export function missingStatWindow(id: string): AnalysisError {
	return new AnalysisError(
		'missing-stat-window',
		`Character ${JSON.stringify(id)} has no stat window. The stat window is the source of ` +
			'truth for every total the damage formula needs (design §2), so nothing can be ' +
			'analysed without it. Capture the Character Info window plus the main-stat, ' +
			'secondary-stat and ATT hover tooltips and PUT them to ' +
			`/api/characters/${id}/stat-window.`
	);
}

/** `409` — the document names a class the class table does not know. */
export function unknownClass(classId: string): AnalysisError {
	return new AnalysisError(
		'unknown-class',
		`Unknown classId ${JSON.stringify(classId)}. See GET /api/ref/classes for the valid ids.`
	);
}

/** `400` — the requested target is neither a preset nor a boss id. */
export function unknownTarget(id: string): AnalysisError {
	return new AnalysisError(
		'unknown-target',
		`Unknown target ${JSON.stringify(id)}. Use "arcane", "grandis", or a boss id from ` +
			'src/lib/data/bosses.ts (e.g. "hard-lucid").'
	);
}
