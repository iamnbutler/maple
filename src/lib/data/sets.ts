// Equipment set effects.
//
// Generated data lives in `sets.json` (rebuild with `node scripts/build-sets.mjs`).
//
// ⚠️ COVERAGE. The upstream manifest omits boss damage, ignore-enemy-defence and
// every other special set effect — it carries only simple stat bonuses. Those
// omissions are exactly the fields that drive damage, so a set flagged
// `partial` UNDERSTATES its real contribution and must never be presented as a
// complete accounting. Only sets whose effects were read off an in-game panel
// (`partial: false`) are trustworthy end-to-end. See `scripts/build-sets.mjs`.
//
// ⚠️ THESE ARE NOT ADDED TO THE BASELINE. Set effects are already inside the
// stat-window totals the character is captured with, so adding them again would
// double-count. They matter only as a DELTA — when a change would move a set
// across a piece-count threshold. `deltaBetweenCounts` is that delta.

import doc from './sets.json';

/** Percent fields are whole percents (`30` means 30%). */
export interface SetEffect {
	str?: number;
	dex?: number;
	int?: number;
	luk?: number;
	allStat?: number;
	maxHp?: number;
	maxMp?: number;
	maxHpPct?: number;
	maxMpPct?: number;
	att?: number;
	matt?: number;
	def?: number;
	critRatePct?: number;
	bossDmgPct?: number;
	iedPct?: number;
}

export interface EquipmentSet {
	setItemId: number;
	name: string;
	completeCount?: number;
	memberItemIds: number[];
	memberCount: number;
	/** Keyed by the piece count that UNLOCKS the effect. Effects are cumulative. */
	effects: Record<string, SetEffect>;
	/** True when only the manifest was available — boss damage and IED are missing. */
	partial: boolean;
}

// The JSON's inferred literal type has an optional key per observed piece
// count, which does not line up with `Record<string, SetEffect>`; the shape is
// guaranteed by the generator instead.
export const SETS: readonly EquipmentSet[] = doc.sets as unknown as EquipmentSet[];

export const SETS_META = {
	generatedAt: doc.generatedAt,
	region: doc.region,
	gameVersion: doc.gameVersion,
	sources: doc.sources,
	warning: doc.warning,
	counts: doc.counts
} as const;

const BY_NAME = new Map<string, EquipmentSet>();
for (const set of SETS) if (!BY_NAME.has(set.name)) BY_NAME.set(set.name, set);

export function getSet(name: string): EquipmentSet | undefined {
	return BY_NAME.get(name);
}

/** The piece counts that unlock an effect, ascending. */
export function thresholds(set: EquipmentSet): number[] {
	return Object.keys(set.effects)
		.map(Number)
		.filter((n) => Number.isFinite(n))
		.sort((a, b) => a - b);
}

const EFFECT_KEYS = [
	'str',
	'dex',
	'int',
	'luk',
	'allStat',
	'maxHp',
	'maxMp',
	'maxHpPct',
	'maxMpPct',
	'att',
	'matt',
	'def',
	'critRatePct',
	'bossDmgPct',
	'iedPct'
] as const satisfies readonly (keyof SetEffect)[];

function add(into: SetEffect, from: SetEffect, sign: 1 | -1): void {
	for (const key of EFFECT_KEYS) {
		const value = from[key];
		if (value === undefined) continue;
		into[key] = (into[key] ?? 0) + sign * value;
	}
}

/**
 * Everything a set grants at `count` pieces.
 *
 * Set effects are CUMULATIVE: four pieces of a 2/3/4 set grant the 2-, 3- and
 * 4-piece rows together, which is how the in-game panel presents them.
 */
export function effectsAt(set: EquipmentSet, count: number): SetEffect {
	const out: SetEffect = {};
	for (const threshold of thresholds(set)) {
		if (threshold > count) break;
		add(out, set.effects[String(threshold)], 1);
	}
	return out;
}

/** What moving from `from` pieces to `to` pieces would add (or remove, if fewer). */
export function deltaBetweenCounts(set: EquipmentSet, from: number, to: number): SetEffect {
	const out = effectsAt(set, to);
	add(out, effectsAt(set, from), -1);
	for (const key of EFFECT_KEYS) if (out[key] === 0) delete out[key];
	return out;
}

/** The next piece count above `count` that unlocks something, or `undefined`. */
export function nextThreshold(set: EquipmentSet, count: number): number | undefined {
	return thresholds(set).find((n) => n > count);
}

/** True when the effect grants nothing this tracker models as damage. */
export function isCosmetic(effect: SetEffect): boolean {
	return EFFECT_KEYS.every((key) => (effect[key] ?? 0) === 0);
}
