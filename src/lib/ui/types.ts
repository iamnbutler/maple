// UI-side view types over the analysis contract.

import type { BossBoard, BossRow, BossTier } from '$lib/analysis/types';

export type { BossTier };

/** A row's tier. Defaults to `current` so nothing is ever hidden by accident. */
export function rowTier(row: BossRow): BossTier {
	return row.tier ?? 'current';
}

/**
 * Per-tier counts. The engine reports what it saw before filtering (that is what
 * the "N hidden" copy needs); fall back to counting the rows we were given.
 */
export function tierCounts(board: BossBoard): Record<BossTier, number> {
	const counted: Record<BossTier, number> = { trivial: 0, early: 0, current: 0 };
	for (const row of board.rows) counted[rowTier(row)] += 1;
	const declared = board.tierCounts;
	if (!declared) return counted;
	return {
		trivial: declared.trivial ?? counted.trivial,
		early: declared.early ?? counted.early,
		current: declared.current ?? counted.current
	};
}

/** One point on a history chart. */
export interface ChartPoint {
	at: string;
	value: number;
}

/** What a history snapshot yields once the unknown `summary` is probed. */
export interface HistoryPoint {
	ts: string;
	at: string;
	level: number;
	equipped: number;
	damageIndex?: number;
	damageIndexArcane?: number;
	damageIndexGrandis?: number;
	combatPower?: number;
}
