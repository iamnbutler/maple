// Request-shaping helpers shared by the three analysis routes.
//
// Kept beside the engine rather than in `src/routes/api/_http.ts` so that the
// query-string vocabulary (`target`, `topN`, `kinds`) lives next to the option
// type it parses into.

import { ValidationError } from '$lib/store';

import type { AnalysisOptions, UpgradeKind } from './types';

/**
 * Every `UpgradeKind` the `?kinds=` filter accepts.
 *
 * MUST stay in step with `UpgradeKind` in `./types` and `ALL_KINDS` in
 * `./candidates`. It had drifted: eight kinds the engine generates — `set`, the
 * four Legion/link ones and the three V-Matrix/HEXA ones — were missing, so
 * `?kinds=set` was rejected as unknown rather than filtered.
 */
export const UPGRADE_KINDS: readonly UpgradeKind[] = [
	'acquisition',
	'starforce',
	'flame',
	'potential',
	'bonus-potential',
	'symbol',
	'hyper-stat',
	'stat-line',
	'set',
	'link',
	'legion-board',
	'legion-member',
	'legion-artifact',
	'v-matrix',
	'hexa-skill',
	'hexa-stat'
];

function isTruthy(value: string): boolean {
	return value !== 'false' && value !== '0' && value !== '';
}

/** `?target=&topN=&kinds=a,b&bossBoard=&includeEarly=` -> `AnalysisOptions`. */
export function optionsFromSearchParams(params: URLSearchParams): AnalysisOptions {
	const options: AnalysisOptions = {};

	const target = params.get('target');
	if (target) options.target = target;

	const topN = params.get('topN');
	if (topN !== null) {
		const parsed = Number(topN);
		if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
			throw new ValidationError(
				`topN must be a non-negative integer (got ${JSON.stringify(topN)})`
			);
		}
		options.topN = parsed;
	}

	const kinds = params.get('kinds');
	if (kinds !== null) {
		const requested = kinds
			.split(',')
			.map((kind) => kind.trim())
			.filter((kind) => kind.length > 0);
		const unknown = requested.filter((kind) => !UPGRADE_KINDS.includes(kind as UpgradeKind));
		if (unknown.length > 0) {
			throw new ValidationError(
				`Unknown upgrade kind(s): ${unknown.join(', ')}. Valid kinds: ${UPGRADE_KINDS.join(', ')}`
			);
		}
		options.kinds = requested as UpgradeKind[];
	}

	const bossBoard = params.get('bossBoard');
	if (bossBoard !== null) options.includeBossBoard = isTruthy(bossBoard);

	const includeEarly = params.get('includeEarly');
	if (includeEarly !== null) options.includeEarlyBosses = isTruthy(includeEarly);

	return options;
}
