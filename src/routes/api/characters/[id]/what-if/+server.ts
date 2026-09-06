// POST /api/characters/:id/what-if  ->  { deltas: Delta[], target?: string }
//
// Returns the JOINT gain of the whole set plus each delta's marginal gain
// measured alone. They will not sum — formulas.md §3.4 — and that disagreement
// is the reason this endpoint exists.

import { json } from '@sveltejs/kit';

import { AnalysisError, whatIf } from '$lib/analysis';
import type { Delta } from '$lib/calc/types';
import { characters, ValidationError } from '$lib/store';

import { apiError, errorResponse, readJsonObject } from '../../../_http';

import type { RequestHandler } from './$types';

/** Keys `Delta` understands. Anything else is a typo worth rejecting loudly. */
const DELTA_KEYS = new Set<keyof Delta>([
	'mainFlat',
	'mainFinal',
	'mainPct',
	'subFlat',
	'subFinal',
	'subPct',
	'allStatPct',
	'att',
	'attPct',
	'dmg',
	'boss',
	'fd',
	'critDmg',
	'critRate',
	'iedAdd',
	'iedRemove',
	'arcane',
	'sacred'
]);

function parseDelta(value: unknown, index: number): Delta {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new ValidationError(`deltas[${index}] must be an object`);
	}
	const delta: Record<string, unknown> = {};
	for (const [key, raw] of Object.entries(value)) {
		if (!DELTA_KEYS.has(key as keyof Delta)) {
			throw new ValidationError(
				`deltas[${index}].${key} is not a Delta field. Valid fields: ${[...DELTA_KEYS].join(', ')}`
			);
		}
		if (key === 'iedAdd' || key === 'iedRemove') {
			if (!Array.isArray(raw) || raw.some((entry) => typeof entry !== 'number')) {
				throw new ValidationError(
					`deltas[${index}].${key} must be an array of whole-percent numbers — IED sources ` +
						'compose individually and are never summed (formulas.md §1.8).'
				);
			}
		} else if (typeof raw !== 'number' || !Number.isFinite(raw)) {
			throw new ValidationError(`deltas[${index}].${key} must be a finite number`);
		}
		delta[key] = raw;
	}
	return delta as Delta;
}

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = await readJsonObject(request);
		if (!Array.isArray(body.deltas)) {
			throw new ValidationError('The body must contain a `deltas` array');
		}
		if (body.target !== undefined && typeof body.target !== 'string') {
			throw new ValidationError('`target` must be a string');
		}
		const deltas = body.deltas.map(parseDelta);
		const character = await characters.get(params.id);
		return json(whatIf(character, deltas, body.target as string | undefined));
	} catch (error) {
		if (error instanceof AnalysisError) return apiError(error.status, error.message);
		return errorResponse(error);
	}
};
