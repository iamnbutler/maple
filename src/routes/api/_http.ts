// Shared HTTP plumbing for the agent-facing API.
//
// Errors are always `{ error, issues? }`; writes are always
// `{ character, warnings }`.

import { json } from '@sveltejs/kit';

import { characterWarnings, type Character } from '$lib/schema';
import { NotFoundError, ValidationError, type ValidationIssue } from '$lib/store';

export interface ApiError {
	error: string;
	issues?: ValidationIssue[];
}

/** `{ error, issues? }` with the given status. */
export function apiError(status: number, message: string, issues?: ValidationIssue[]): Response {
	const body: ApiError = { error: message };
	if (issues && issues.length > 0) body.issues = issues;
	return json(body, { status });
}

/** Map a thrown store/schema error onto a JSON response. */
export function errorResponse(error: unknown): Response {
	if (error instanceof NotFoundError) return apiError(404, error.message);
	if (error instanceof ValidationError) return apiError(400, error.message, error.issues);
	if (error instanceof SyntaxError) return apiError(400, `Malformed JSON body: ${error.message}`);

	console.error('[api] unhandled error', error);
	const message = error instanceof Error ? error.message : String(error);
	return json({ error: `Internal error: ${message}` } satisfies ApiError, { status: 500 });
}

/** Parse a JSON request body, or throw a {@link ValidationError}. */
export async function readJsonBody(request: Request): Promise<unknown> {
	const text = await request.text();
	if (text.trim().length === 0) throw new ValidationError('A JSON body is required');
	try {
		return JSON.parse(text) as unknown;
	} catch (error) {
		throw new ValidationError(`Malformed JSON body: ${(error as Error).message}`);
	}
}

/** Same, but the body must be a JSON object. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
	const body = await readJsonBody(request);
	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		throw new ValidationError('The body must be a JSON object');
	}
	return body as Record<string, unknown>;
}

/** The standard write response: the saved document plus non-fatal warnings. */
export function writeResponse(character: Character, status = 200): Response {
	return json({ character, warnings: characterWarnings(character) }, { status });
}
