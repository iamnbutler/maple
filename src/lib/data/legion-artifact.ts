/**
 * Legion Artifact — GMS 2026.
 *
 * Transcribed from `docs/research/legion-artifact.md`. Primary sources cited there:
 *   - https://maplestorywiki.net/w/Legion_Artifact                (level/EXP/AP table, crystal unlocks, Lv10 values)
 *   - https://maplestorywiki.net/w/Legion_Artifact/Boss_Missions  (weekly boss income)
 *   - https://namu.wiki/w/유니온 아티팩트 §3, §5                    (per-level value rules, AP curve, point costs)
 *     archived: https://web.archive.org/web/20260706160539/https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8
 *
 * ═══ THE MECHANIC, which every guide gets wrong ═══
 *
 * You do NOT buy effect levels. Each Crystal has a GRADE (1-5, bought with
 * Artifact AP) and 3 stat slots. The "Lv. N Boss Damage" lines in the Artifact
 * Bonuses panel are DERIVED:
 *
 *     effectLevel(stat) = min(10, Σ grade of every crystal carrying that stat)
 *
 * "Similar to how Boost Nodes work in 5th job, the total levels of the stats on
 * the player's crystals will be added up to determine the boost effect for that
 * stat, up to a maximum of level 10." — maplestorywiki.net/w/Legion_Artifact
 *
 * So the whole system collapses to ONE scalar budget — `effectLevelBudget()` —
 * distributed over 16 effects capped at 10 each. There is no per-effect cost.
 *
 * ⚠️ `formulas.md` §4B §2 §8.2's "per-stat caps" table is not a cap system at
 * all: it is the level-10 column of {@link ARTIFACT_EFFECT_VALUES}.
 */

/* -------------------------------------------------------------------------- */
/* Effects                                                                    */
/* -------------------------------------------------------------------------- */

export type ArtifactEffectKey =
	| 'allStat'
	| 'maxHpMp'
	| 'attack'
	| 'damage'
	| 'bossDamage'
	| 'ignoreDefense'
	| 'buffDuration'
	| 'cooldownSkip'
	| 'mesosObtained'
	| 'itemDropRate'
	| 'criticalRate'
	| 'criticalDamage'
	| 'expObtained'
	| 'statusResistance'
	| 'summonDuration'
	| 'finalAttackDamage';

export interface ArtifactEffectSpec {
	key: ArtifactEffectKey;
	label: string;
	unit: 'flat' | 'percent';
	/** True when the effect moves boss damage output. */
	damageRelevant: boolean;
	note?: string;
}

export const ARTIFACT_EFFECTS: Record<ArtifactEffectKey, ArtifactEffectSpec> = {
	allStat: {
		key: 'allStat',
		label: 'All Stats',
		unit: 'flat',
		damageRelevant: true,
		note: '+15 to STR, DEX, INT and LUK per level'
	},
	maxHpMp: {
		key: 'maxHpMp',
		label: 'Max HP and Max MP',
		unit: 'flat',
		damageRelevant: false,
		note: 'one effect granting both, +750 each per level'
	},
	attack: {
		key: 'attack',
		label: 'ATT and MATT',
		unit: 'flat',
		damageRelevant: true,
		note: 'one effect granting both, +3 each per level'
	},
	damage: { key: 'damage', label: 'Damage', unit: 'percent', damageRelevant: true },
	bossDamage: { key: 'bossDamage', label: 'Boss Damage', unit: 'percent', damageRelevant: true },
	ignoreDefense: {
		key: 'ignoreDefense',
		label: 'Ignore Enemy DEF',
		unit: 'percent',
		damageRelevant: true,
		note: 'nominal IED — composes MULTIPLICATIVELY with other sources (formulas.md §1.8), never additively'
	},
	buffDuration: {
		key: 'buffDuration',
		label: 'Buff Duration',
		unit: 'percent',
		damageRelevant: false
	},
	cooldownSkip: {
		key: 'cooldownSkip',
		label: 'Cooldown Skip Chance',
		unit: 'percent',
		damageRelevant: false
	},
	mesosObtained: {
		key: 'mesosObtained',
		label: 'Mesos Obtained',
		unit: 'percent',
		damageRelevant: false
	},
	itemDropRate: {
		key: 'itemDropRate',
		label: 'Item Drop Rate',
		unit: 'percent',
		damageRelevant: false
	},
	criticalRate: {
		key: 'criticalRate',
		label: 'Critical Rate',
		unit: 'percent',
		damageRelevant: true
	},
	criticalDamage: {
		key: 'criticalDamage',
		label: 'Critical Damage',
		unit: 'percent',
		damageRelevant: true
	},
	expObtained: {
		key: 'expObtained',
		label: 'EXP Obtained',
		unit: 'percent',
		damageRelevant: false,
		note: 'ALSO grants +1 max target for multi-target skills at ANY level >= 1; that half does not scale'
	},
	statusResistance: {
		key: 'statusResistance',
		label: 'Abnormal Status Resistance',
		unit: 'flat',
		damageRelevant: false
	},
	summonDuration: {
		key: 'summonDuration',
		label: 'Summon Duration',
		unit: 'percent',
		damageRelevant: false
	},
	finalAttackDamage: {
		key: 'finalAttackDamage',
		label: 'Final Attack Skill Damage',
		unit: 'percent',
		damageRelevant: true,
		note: 'only applies to a per-class skill list — for Ren that is Second Imugi Spirit Sword: Serpent’s Fang'
	}
};

export const ARTIFACT_EFFECT_KEYS = Object.keys(ARTIFACT_EFFECTS) as ArtifactEffectKey[];

export const ARTIFACT_MAX_EFFECT_LEVEL = 10;

/**
 * Value of each effect at levels 1-10. Index 0 is level 1.
 *
 * Thirteen effects are strictly linear. **Mesos Obtained, Item Drop Rate, EXP
 * Obtained and Status Resistance are NOT** — they run `+1 per level except +2
 * at level 5 and level 10`, giving `1,2,3,4,6,7,8,9,10,12`. That is why a Lv9
 * Mesos line reads 10% and not 10.8%, and it is the single most common place to
 * get this table wrong.
 *
 * (The irregular curve happens to equal `floor(1.2 * L)`. Do not implement it
 * that way — the game's rule is the step table, and the coincidence would break
 * if a value ever changed.)
 */
const MILESTONE_LADDER = [1, 2, 3, 4, 6, 7, 8, 9, 10, 12] as const;

const linear = (step: number): readonly number[] =>
	Array.from(
		{ length: 10 },
		(_, i) =>
			// Keep one decimal place clean for the 0.4 / 0.75 / 1.5 steps.
			Math.round(step * (i + 1) * 100) / 100
	);

export const ARTIFACT_EFFECT_VALUES: Record<ArtifactEffectKey, readonly number[]> = {
	allStat: linear(15),
	maxHpMp: linear(750),
	attack: linear(3),
	damage: linear(1.5),
	bossDamage: linear(1.5),
	ignoreDefense: linear(2),
	buffDuration: linear(2),
	cooldownSkip: linear(0.75),
	mesosObtained: MILESTONE_LADDER,
	itemDropRate: MILESTONE_LADDER,
	criticalRate: linear(2),
	criticalDamage: linear(0.4),
	expObtained: MILESTONE_LADDER,
	statusResistance: MILESTONE_LADDER,
	summonDuration: linear(2),
	finalAttackDamage: linear(3)
};

/** Value of an effect at a level. Level 0 gives 0. */
export function artifactEffectValue(key: ArtifactEffectKey, level: number): number {
	if (!ARTIFACT_EFFECTS[key]) throw new Error(`Unknown artifact effect "${key}".`);
	if (level < 0 || level > ARTIFACT_MAX_EFFECT_LEVEL) {
		throw new Error(`Artifact effect levels run 0-10 (got ${level}).`);
	}
	return level === 0 ? 0 : ARTIFACT_EFFECT_VALUES[key][level - 1];
}

/** Value gained by taking an effect from `from` to `to`. */
export function artifactEffectDelta(key: ArtifactEffectKey, from: number, to: number): number {
	return artifactEffectValue(key, to) - artifactEffectValue(key, from);
}

/* -------------------------------------------------------------------------- */
/* Crystals and AP                                                            */
/* -------------------------------------------------------------------------- */

export const ARTIFACT_MAX_LEVEL = 60;
export const ARTIFACT_MAX_CRYSTALS = 9;
export const ARTIFACT_CRYSTAL_MAX_GRADE = 5;
export const ARTIFACT_SLOTS_PER_CRYSTAL = 3;

/**
 * AP to raise ONE crystal from grade `g` to `g+1`. Index 0 is grade 1 → 2.
 * A crystal costs 8 AP to take from its starting grade 1 to grade 5.
 */
export const ARTIFACT_GRADE_STEP_COST = [1, 2, 2, 3] as const;
export const ARTIFACT_CRYSTAL_MAX_COST = 8;

/**
 * Crystals usable at an Artifact Level: 3 at Lv1, +1 at Lv10 and every 10
 * levels after, to 9 at Lv60.
 */
export function crystalsAt(level: number): number {
	if (level < 1) return 0;
	return Math.min(ARTIFACT_MAX_CRYSTALS, 3 + Math.floor(level / 10));
}

/**
 * Lifetime Artifact AP at a level: +1 per level, +1 extra every 5th.
 * `cumulativeAP(60) = 72 = 9 crystals x 8 AP` — exactly enough to max them all.
 */
export function cumulativeAp(level: number): number {
	if (level < 1) return 0;
	return level + Math.floor(level / 5);
}

/**
 * The largest total of crystal grades affordable at an Artifact Level.
 *
 * Every crystal starts at grade 1, so the floor is `crystalsAt(level)`. Beyond
 * that, spend AP cheapest-step-first across all crystals. Greedy is optimal
 * here: per-crystal marginal cost is non-decreasing (1, 2, 2, 3), so an
 * exchange argument rules out any better allocation.
 */
export function maxTotalGrades(level: number): number {
	const crystals = crystalsAt(level);
	if (crystals === 0) return 0;

	let budget = cumulativeAp(level);
	let grades = crystals;

	for (const step of ARTIFACT_GRADE_STEP_COST) {
		const affordable = Math.min(crystals, Math.floor(budget / step));
		grades += affordable;
		budget -= affordable * step;
		if (affordable < crystals) break;
	}
	return grades;
}

/**
 * Effect levels distributable at an Artifact Level — the ONE number that
 * describes how strong an artifact is.
 *
 * ⚠️ This is lumpy and the UI must say so. Every x10 level is a cliff worth +9
 * in one jump; levels 55-59 are worth **zero** (530,000 EXP for nothing) and
 * exist only as a toll on the way to Lv60's 9th crystal.
 */
export function effectLevelBudget(level: number): number {
	return maxTotalGrades(level) * ARTIFACT_SLOTS_PER_CRYSTAL;
}

/**
 * Effect levels at most `crystals` can carry, ignoring the budget — each effect
 * needs at least one slot, and no crystal may carry the same stat twice.
 */
export function maxDistinctEffects(level: number): number {
	return Math.min(ARTIFACT_EFFECT_KEYS.length, crystalsAt(level) * ARTIFACT_SLOTS_PER_CRYSTAL);
}

/**
 * Whether an effect-level vector is reachable at an Artifact Level.
 *
 * Checks the three real constraints: the budget, the level-10 cap per effect,
 * and the slot count. It deliberately does NOT check decomposability (that each
 * effect's level is a sum of grades from distinct crystals), because with n <= 9
 * crystals a zero-waste packing always exists: 3n <= 27 slots need only
 * ceil(27/2) = 14 distinct stats, and 14 <= the 16 available, so every stat can
 * sit on at most 2 crystals and never overflow. Overflow is a player mistake,
 * not a system tax.
 */
export function isReachable(
	effects: Partial<Record<ArtifactEffectKey, number>>,
	level: number
): { ok: boolean; reason?: string } {
	const entries = Object.entries(effects) as [ArtifactEffectKey, number][];
	let spent = 0;
	let used = 0;

	for (const [key, value] of entries) {
		if (!ARTIFACT_EFFECTS[key]) return { ok: false, reason: `unknown effect "${key}"` };
		if (value < 0 || value > ARTIFACT_MAX_EFFECT_LEVEL) {
			return { ok: false, reason: `${key} is level ${value}; effects cap at 10` };
		}
		if (value > 0) used += 1;
		spent += value;
	}

	const budget = effectLevelBudget(level);
	if (spent > budget) {
		return { ok: false, reason: `spends ${spent} effect levels but Lv${level} affords ${budget}` };
	}
	const slots = maxDistinctEffects(level);
	if (used > slots) {
		return { ok: false, reason: `uses ${used} effects but Lv${level} has only ${slots} slots` };
	}
	return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Artifact levels and EXP                                                    */
/* -------------------------------------------------------------------------- */

/**
 * EXP to go from level N to N+1, for N = 1..59. Index 0 is level 1.
 * maplestorywiki's Artifact EXP Table; Lv1-41 corroborated by the Inven summary
 * table at https://www.inven.co.kr/board/maple/2304/36744.
 */
export const ARTIFACT_EXP_TO_NEXT = [
	2_500, 2_550, 2_600, 2_650, 2_700, 2_750, 2_800, 2_850, 2_900, 2_950, 3_000, 3_050, 3_100, 3_150,
	3_200, 3_250, 3_300, 3_350, 3_400, 3_450, 3_500, 3_550, 3_600, 3_700, 3_800, 3_900, 4_000, 4_500,
	5_000, 5_500, 6_000, 6_500, 7_000, 7_500, 8_000, 8_500, 9_000, 9_500, 10_000, 12_000, 14_000,
	16_000, 18_000, 20_000, 22_000, 24_000, 26_000, 28_000, 30_000, 50_000, 55_000, 60_000, 65_000,
	70_000, 100_000, 110_000, 120_000, 130_000, 200_000
] as const;

/** Cumulative EXP needed to BE at each level. Index 0 is level 1 (which is 0). */
export const ARTIFACT_TOTAL_EXP = (() => {
	const totals = [0];
	for (const step of ARTIFACT_EXP_TO_NEXT) totals.push(totals[totals.length - 1] + step);
	return totals as readonly number[];
})();

/** Total EXP to reach Artifact Level 60. */
export const ARTIFACT_TOTAL_EXP_TO_MAX = 1_342_550;

/** Cumulative EXP to reach an Artifact Level. */
export function artifactExpToReach(level: number): number {
	if (level < 1 || level > ARTIFACT_MAX_LEVEL) {
		throw new Error(`Artifact levels run 1-60 (got ${level}).`);
	}
	return ARTIFACT_TOTAL_EXP[level - 1];
}

/** EXP to go from one Artifact Level to another. */
export function artifactExpBetween(from: number, to: number): number {
	return artifactExpToReach(to) - artifactExpToReach(from);
}

/**
 * Artifact Points a player may hold at a level. Verified against all 60 rows.
 * The cap grows faster past Lv30 and again past Lv50.
 */
export function maxArtifactPoints(level: number): number {
	if (level < 1 || level > ARTIFACT_MAX_LEVEL) {
		throw new Error(`Artifact levels run 1-60 (got ${level}).`);
	}
	if (level <= 30) return 10_100 + 100 * (level - 1);
	if (level <= 50) return 13_000 + 200 * (level - 30);
	return 17_000 + 300 * (level - 50);
}

/**
 * The next Artifact Level that actually buys anything, and what it buys.
 *
 * This exists because "level up your artifact" is bad advice 40% of the time.
 * Levels 55-59 grant zero budget, so from 54 this returns 60 and prices the
 * whole 730,000-EXP haul as one step.
 */
export function nextMeaningfulLevel(
	level: number
): { level: number; exp: number; budgetGained: number } | null {
	const current = effectLevelBudget(level);
	for (let next = level + 1; next <= ARTIFACT_MAX_LEVEL; next += 1) {
		const gained = effectLevelBudget(next) - current;
		if (gained > 0) {
			return { level: next, exp: artifactExpBetween(level, next), budgetGained: gained };
		}
	}
	return null;
}

/* -------------------------------------------------------------------------- */
/* Artifact Points spending                                                   */
/* -------------------------------------------------------------------------- */

/** Reassign one crystal's three stats. The cheap, frequently-correct move. */
export const ARTIFACT_RESTAT_COST_POINTS = 500;

/** Reset all assigned AP. Third-party guide only — **UNVERIFIED**. */
export const UNVERIFIED_ARTIFACT_AP_RESET_COST_POINTS = 500;

/** Crystals go inactive 30 days after being obtained; grades are retained. */
export const ARTIFACT_CRYSTAL_DURATION_DAYS = 30;

/**
 * Points to give one expired crystal a full 30 days again.
 *
 * ⚠️ **CONFLICT.** namu.wiki says 1,000 points for a full 30 days, pro-rated by
 * the days actually added. digitaltq observed **470** in the GMS UI, which is
 * consistent with a crystal that had ~16 days left (1000 x 14/30 ≈ 467). The
 * pro-rating model is therefore probably right, but the ROUNDING RULE and the
 * GMS base figure are unverified.
 */
export const ARTIFACT_CRYSTAL_EXTEND_COST_POINTS = 1_000;

/** Points per 30 days to keep `crystals` alive. See the CONFLICT above. */
export function crystalUpkeepPointsPer30Days(crystals: number): number {
	return crystals * ARTIFACT_CRYSTAL_EXTEND_COST_POINTS;
}

/* -------------------------------------------------------------------------- */
/* Income                                                                     */
/* -------------------------------------------------------------------------- */

/** Normal missions, weekly. EXP and Points are awarded 1:1. Hard cap. */
export const ARTIFACT_NORMAL_WEEKLY_EXP = 2_000;

/** Special missions: 276 one-time missions, per world. EXP only, no Points. */
export const ARTIFACT_SPECIAL_TOTAL_EXP = 317_140;

/** Only the 3 highest-valued boss missions count each week. */
export const ARTIFACT_BOSS_MISSIONS_PER_WEEK = 3;

/**
 * EXP (== Points) per boss mission. maplestorywiki.net/w/Legion_Artifact/Boss_Missions.
 * KMS's namu list carries identical values under Korean boss names.
 */
export const ARTIFACT_BOSS_MISSION_EXP: Record<string, number> = {
	'Easy Cygnus': 100,
	'Hard Hilla': 100,
	'Chaos Pink Bean': 100,
	'Normal Cygnus': 150,
	'Chaos Zakum': 150,
	'Normal Princess No': 180,
	'Chaos Pierre': 180,
	'Chaos Von Bon': 180,
	'Chaos Crimson Queen': 180,
	'Hard Magnus': 200,
	'Chaos Vellum': 200,
	'Chaos Papulatus': 200,
	'Normal Akechi Mitsuhide': 250,
	'Normal Lotus': 250,
	'Normal Damien': 250,
	'Normal Guardian Angel Slime': 250,
	'Easy Lucid': 300,
	'Easy Will': 300,
	'Normal Lucid': 400,
	'Normal Will': 400,
	'Normal Gloom': 500,
	'Normal Darknell': 500,
	'Hard Damien': 700,
	'Hard Lotus': 700,
	'Hard Lucid': 800,
	'Hard Will': 800,
	'Normal Verus Hilla': 800,
	'Chaos Guardian Angel Slime': 900,
	'Chaos Gloom': 900,
	'Hard Darknell': 1_000,
	'Hard Verus Hilla': 1_000,
	'Normal Chosen Seren': 1_200,
	'Easy Kalos the Guardian': 1_400,
	'Easy First Adversary': 1_400,
	'Hard Chosen Seren': 1_500,
	'Easy Kaling': 1_500,
	'Normal Kalos the Guardian': 1_800,
	'Normal First Adversary': 1_800,
	'Extreme Lotus': 1_800,
	'Normal Malefic Star': 2_000,
	'Normal Kaling': 2_000,
	'Normal Limbo': 2_500,
	'Chaos Kalos the Guardian': 3_000,
	'Normal Baldrix': 3_000,
	'Hard First Adversary': 3_000,
	'Normal Jupiter': 3_000,
	'Hard Kaling': 3_500,
	'Hard Limbo': 3_500,
	'Hard Malefic Star': 3_500,
	'Extreme Chosen Seren': 3_500,
	'Extreme Kalos the Guardian': 4_000,
	'Hard Baldrix': 4_000,
	'Extreme First Adversary': 4_000,
	'Hard Jupiter': 4_000,
	'Extreme Kaling': 4_500
};

/** Extreme Kaling plus any two 4,000s. */
export const ARTIFACT_BOSS_WEEKLY_CEILING = 12_500;

/**
 * Weekly Artifact EXP (== Points) from a week's boss clears: normal missions
 * plus the three highest-valued bosses, because only three count.
 */
export function weeklyArtifactExp(bossesCleared: readonly string[]): number {
	const values = bossesCleared
		.map((boss) => ARTIFACT_BOSS_MISSION_EXP[boss] ?? 0)
		.sort((a, b) => b - a)
		.slice(0, ARTIFACT_BOSS_MISSIONS_PER_WEEK);
	return ARTIFACT_NORMAL_WEEKLY_EXP + values.reduce((sum, value) => sum + value, 0);
}

/**
 * Real days to go from one Artifact Level to another at a weekly EXP rate.
 *
 * ⚠️ Always present this in months. Lv39 → Lv60 is 1,180,000 EXP, which is ~570
 * days even at the 14,500/week ceiling. The Artifact is a multi-year track for
 * an endgame account, and any "days to payback" figure that reads like a
 * fortnight is a bug.
 */
export function artifactDaysBetween(from: number, to: number, weeklyExp: number): number {
	if (weeklyExp <= 0) return Infinity;
	return (artifactExpBetween(from, to) / weeklyExp) * 7;
}
