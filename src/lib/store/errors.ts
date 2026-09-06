/** Thrown when a character, snapshot or slot does not exist. Maps to HTTP 404. */
export class NotFoundError extends Error {
	readonly status = 404;

	constructor(message: string) {
		super(message);
		this.name = 'NotFoundError';
	}
}

export interface ValidationIssue {
	path: string;
	message: string;
	code?: string;
}

/** Thrown when a payload fails schema or invariant checks. Maps to HTTP 400. */
export class ValidationError extends Error {
	readonly status = 400;
	readonly issues: ValidationIssue[];

	constructor(message: string, issues: ValidationIssue[] = []) {
		super(message);
		this.name = 'ValidationError';
		this.issues = issues;
	}

	/** Build a ValidationError from a zod `ZodError`-shaped object. */
	static fromZod(
		error: { issues: readonly { path: PropertyKey[]; message: string; code?: string }[] },
		message = 'Validation failed'
	): ValidationError {
		return new ValidationError(
			message,
			error.issues.map((issue) => ({
				path: issue.path.map(String).join('.'),
				message: issue.message,
				...(issue.code ? { code: issue.code } : {})
			}))
		);
	}
}
