// POST /api/analyze  ->  { character, target?, topN?, kinds? }
//
// Stateless: nothing is read from or written to `data/`. Useful for "what would
// this look like if..." without persisting a document (design §7).

import { json } from '@sveltejs/kit';

import { AnalysisError, analyzeAsync, UPGRADE_KINDS } from '$lib/analysis';
import type { AnalysisOptions, UpgradeKind } from '$lib/analysis';
import { CharacterSchema, type Character } from '$lib/schema';
import { ValidationError } from '$lib/store';

import { apiError, errorResponse, readJsonObject } from '../_http';

import type { RequestHandler } from './$types';

function parseOptions(body: Record<string, unknown>): AnalysisOptions {
	const options: AnalysisOptions = {};
	if (body.target !== undefined) {
		if (typeof body.target !== 'string') throw new ValidationError('`target` must be a string');
		options.target = body.target;
	}
	if (body.topN !== undefined) {
		if (typeof body.topN !== 'number' || !Number.isInteger(body.topN) || body.topN < 0) {
			throw new ValidationError('`topN` must be a non-negative integer');
		}
		options.topN = body.topN;
	}
	if (body.kinds !== undefined) {
		if (
			!Array.isArray(body.kinds) ||
			body.kinds.some((kind) => !UPGRADE_KINDS.includes(kind as UpgradeKind))
		) {
			throw new ValidationError(`\`kinds\` must be a subset of: ${UPGRADE_KINDS.join(', ')}`);
		}
		options.kinds = body.kinds as UpgradeKind[];
	}
	if (body.includeBossBoard !== undefined) {
		if (typeof body.includeBossBoard !== 'boolean') {
			throw new ValidationError('`includeBossBoard` must be a boolean');
		}
		options.includeBossBoard = body.includeBossBoard;
	}
	if (body.includeEarlyBosses !== undefined) {
		if (typeof body.includeEarlyBosses !== 'boolean') {
			throw new ValidationError('`includeEarlyBosses` must be a boolean');
		}
		options.includeEarlyBosses = body.includeEarlyBosses;
	}
	return options;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await readJsonObject(request);
		if (typeof body.character !== 'object' || body.character === null) {
			throw new ValidationError('The body must contain a `character` object');
		}

		// The document need not have been saved, so the store-managed timestamps
		// are filled in rather than demanded.
		const now = new Date().toISOString();
		const candidate = { createdAt: now, updatedAt: now, ...(body.character as object) };
		const parsed = CharacterSchema.safeParse(candidate);
		if (!parsed.success) {
			throw ValidationError.fromZod(parsed.error, 'Invalid character document');
		}
		const character: Character = parsed.data;

		return json(await analyzeAsync(character, parseOptions(body)));
	} catch (error) {
		if (error instanceof AnalysisError) return apiError(error.status, error.message);
		return errorResponse(error);
	}
};
