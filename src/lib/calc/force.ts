// Map multiplier (Arcane / Sacred Force) and the level-advantage multiplier.
//
// Sources: docs/research/formulas.md §1.11 (level advantage) and §1.12
// (Star / Arcane / Sacred Force maps).

/** Round to `places` decimals, half away from zero, with a float-representation guard. */
function roundTo(value: number, places: number): number {
	const scale = 10 ** places;
	const scaled = Number((value * scale).toFixed(6));
	return (Math.sign(scaled) * Math.round(Math.abs(scaled))) / scale;
}

// ---------------------------------------------------------------------------
// Arcane Force
// ---------------------------------------------------------------------------

/**
 * Arcane Force map multiplier, keyed on `floor(have / req * 100)`.
 *
 * Source: docs/research/formulas.md §1.12 "Arcane Force maps":
 *   0-9% -> -90% · 10-29% -> -70% · 30-49% -> -40% · 50-69% -> -30% ·
 *   70-99% -> -20% · 100-109% -> 0% · 110-129% -> +10% ·
 *   130-149% -> +30% · 150%+ -> +50%
 *
 * §1.12 notes this exactly reproduces the per-boss breakpoints on masonym.dev,
 * e.g. Lucid (req 360): 400 = 111% -> +10%, 470 = 130.5% -> +30%,
 * 540 = 150% -> +50%.
 */
export const ARCANE_BANDS: ReadonlyArray<{ minRatioPercent: number; multiplier: number }> = [
	{ minRatioPercent: 150, multiplier: 1.5 },
	{ minRatioPercent: 130, multiplier: 1.3 },
	{ minRatioPercent: 110, multiplier: 1.1 },
	{ minRatioPercent: 100, multiplier: 1.0 },
	{ minRatioPercent: 70, multiplier: 0.8 },
	{ minRatioPercent: 50, multiplier: 0.7 },
	{ minRatioPercent: 30, multiplier: 0.6 },
	{ minRatioPercent: 10, multiplier: 0.3 },
	{ minRatioPercent: 0, multiplier: 0.1 }
];

/**
 * @param req  the map/boss Arcane Force requirement (0 or undefined => no requirement)
 * @param have the character's total Arcane Force
 */
export function arcaneMultiplier(req: number | undefined, have: number | undefined): number {
	if (!req || req <= 0) return 1;
	const ratioPercent = Math.floor(Number((((have ?? 0) / req) * 100).toFixed(10)));
	for (const band of ARCANE_BANDS) {
		if (ratioPercent >= band.minRatioPercent) return band.multiplier;
	}
	return 0.1;
}

// ---------------------------------------------------------------------------
// Sacred (Authentic) Force
// ---------------------------------------------------------------------------

/** Largest Sacred Force penalty, in percentage points (formulas.md §1.12). */
export const SACRED_MAX_PENALTY = 95;
/** Largest Sacred Force bonus, in percentage points (formulas.md §1.12). */
export const SACRED_MAX_BONUS = 25;

/**
 * Sacred (GMS) / Authentic (KMS, MSEA) Force map multiplier — linear, not banded.
 *
 * Source: docs/research/formulas.md §1.12 "Authentic / Sacred Force maps":
 *   Below requirement: -1%p final damage per 1 Force short, max -95%
 *   Above requirement: +1%p final damage per 2 Force over, floored, max +25%
 * This reproduces the "+25% (Max)" at `requirement + 50` shown on masonym.dev
 * for every Grandis boss.
 */
export function sacredMultiplier(req: number | undefined, have: number | undefined): number {
	if (!req || req <= 0) return 1;
	const diff = (have ?? 0) - req;
	if (diff < 0) {
		const penalty = Math.min(SACRED_MAX_PENALTY, -diff);
		return roundTo(1 - penalty / 100, 10);
	}
	const bonus = Math.min(SACRED_MAX_BONUS, Math.floor(diff / 2));
	return roundTo(1 + bonus / 100, 10);
}

// ---------------------------------------------------------------------------
// Level advantage
// ---------------------------------------------------------------------------

/**
 * Level advantage multiplier, from `playerLevel - monsterLevel`.
 *
 * Source: docs/research/formulas.md §1.11 (StrategyWiki §Level Advantage
 * Multiplier), which is declared canonical there because MapleStory Wiki's copy
 * has a transcription bug at -37/-38/-39 (it prints 0.8 / 0.5 / 0.3 where the
 * pattern requires 0.08 / 0.05 / 0.03). This implementation follows the rules,
 * which reproduce every published row:
 *
 *   * `diff >= 0`: 1.10 + 0.02 per level above, capped at 1.20 (i.e. +5 and up)
 *   * `-4 <= diff <= -1`: the above-level term keeps stepping down 2%p
 *     (1.08, 1.06, 1.04, 1.02) and is MULTIPLIED by the below-level penalty
 *   * `diff <= -5`: the penalty alone
 *   * penalty = 1 - 0.025 per level below, rounded to two decimals as the
 *     source table prints it (e.g. -7 -> 0.825 -> 0.83), floored at 0
 *     (-40 or more below deals 1 damage)
 */
export function levelMultiplier(playerLevel: number, monsterLevel: number): number {
	const diff = playerLevel - monsterLevel;
	if (diff >= 5) return 1.2;
	if (diff >= 0) return roundTo(1.1 + 0.02 * diff, 10);

	const below = -diff;
	const penalty = Math.max(0, roundTo(1 - 0.025 * below, 2));
	if (below >= 5) return penalty;
	return roundTo((1.1 + 0.02 * diff) * penalty, 10);
}

/**
 * The published anchor rows of the level table (formulas.md §1.11), kept so the
 * tests can assert the rules above reproduce the source verbatim.
 */
export const LEVEL_MULTIPLIER_TABLE: ReadonlyArray<[diff: number, multiplier: number]> = [
	[5, 1.2],
	[4, 1.18],
	[3, 1.16],
	[2, 1.14],
	[1, 1.12],
	[0, 1.1],
	[-1, 1.0584],
	[-2, 1.007],
	[-3, 0.9672],
	[-4, 0.918],
	[-5, 0.88],
	[-6, 0.85],
	[-7, 0.83],
	[-8, 0.8],
	[-9, 0.78],
	[-10, 0.75],
	[-15, 0.63],
	[-20, 0.5],
	[-30, 0.25],
	[-40, 0]
];
