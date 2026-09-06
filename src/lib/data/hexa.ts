/**
 * HEXA Matrix (6th job) — GMS 2026.
 *
 * Transcribed from `docs/research/hexa.md`. Primary sources cited there:
 *   - https://maplestorywiki.net/w/HEXA_Matrix                                   (taxonomy, gates, HEXA Stat prose)
 *   - https://maplestorywiki.net/index.php?title=Module:SolErdaCostTable/costData&action=raw
 *                                                                                (the raw per-level cost arrays)
 *   - https://maplestorywiki.net/w/<Class>/Skills raw wikitext                    (the boost-node FD formula)
 *   - https://memoday.github.io/hexaStat_Simulator/js/statCore.js                 (HEXA Stat value curves)
 *   - https://memoday.github.io/hexaStat_Simulator/js/hexa-simulator.js           (enhancement-rate table)
 *   - https://whackybeanz.as.r.appspot.com/calc/6th-job                           (totals cross-check)
 *
 * Two things a calculator has to get right here:
 *
 *   1. **The milestone shape dominates strategy.** Boost-node Final Damage steps
 *      +1 per level except at 10, 20 and 30, where it jumps +6, +6 and +11. A
 *      greedy "best next level" ranker looking one level ahead will badly
 *      mis-rank a node sitting at 9, 19 or 29. Use {@link costToNextMilestone}.
 *   2. **HEXA Stat's "Enhancement Rate" is not a gauge.** Every enhancement is a
 *      single roll that always levels *some* line; the percentage is that line's
 *      chance of being the one. See {@link enhancementChances}.
 */

/* -------------------------------------------------------------------------- */
/* Taxonomy                                                                   */
/* -------------------------------------------------------------------------- */

export type HexaNodeType = 'origin' | 'ascent' | 'mastery' | 'enhancement' | 'common';

export interface HexaNodeTypeSpec {
	type: HexaNodeType;
	label: string;
	alsoKnownAs?: string;
	/** Nodes of this type a class holds in GMS as of 2026-09-06. */
	count: number;
	maxLevel: 30;
	note?: string;
}

/** The HEXA Matrix unlocks at the 6th Job Advancement. */
export const HEXA_UNLOCK_LEVEL = 260;

export const HEXA_NODE_TYPES: Record<HexaNodeType, HexaNodeTypeSpec> = {
	origin: {
		type: 'origin',
		label: 'Origin',
		alsoKnownAs: 'Skill Node 1 / Origin Core',
		count: 1,
		maxLevel: 30,
		note: 'granted free at level 1 on 6th job advancement; full-screen, invulnerable during cast, applies Absolute Bind, 360s cooldown'
	},
	ascent: {
		type: 'ascent',
		label: 'Ascent',
		alsoKnownAs: 'Skill Node 2 / Ascent Core',
		count: 1,
		maxLevel: 30,
		note: '3 free uses per boss fight with no cooldown; 240s cooldown outside one'
	},
	mastery: {
		type: 'mastery',
		label: 'Mastery Node',
		alsoKnownAs: 'Mastery Core',
		count: 4,
		maxLevel: 30,
		note: 'REPLACES a 1st-4th job skill; the original skill must be maxed or the node deactivates (keeping its level)'
	},
	enhancement: {
		type: 'enhancement',
		label: 'Boost Node',
		alsoKnownAs: 'Enhancement Core',
		count: 4,
		maxLevel: 30,
		note: 'Final Damage on ONE class-specific 5th job skill; that V skill must be Lv25 excluding slot-enhancement levels'
	},
	common: {
		type: 'common',
		label: 'Common Node',
		alsoKnownAs: 'Common Core',
		count: 2,
		maxLevel: 30,
		note: 'Sol Janus and Sol Hecate in GMS today; a third lands with v271'
	}
};

/** Skill nodes a class holds in GMS today. 13 once the v271 third common core lands. */
export const HEXA_SKILL_NODE_COUNT = 12;

/**
 * KMS has a third Skill Node (ver. 1.2.417, 2026-07-31) that GMS does not.
 * It is cheaper than Origin and Ascent and "addresses each class's weakness".
 */
export const HEXA_SKILL_3_LIVE_IN_GMS = false;

/* -------------------------------------------------------------------------- */
/* Cost curves                                                                */
/* -------------------------------------------------------------------------- */

interface CostCurve {
	solErda: readonly number[];
	fragments: readonly number[];
}

/**
 * The four base curves, verbatim from `Module:SolErdaCostTable/costData`.
 * Index 0 is the cost to REACH level 1 (i.e. the activation cost).
 *
 * `generalB` matches Orange Mushroom's KMS ver. 1.2.417 note row-for-row
 * (Lv1 = 7/140, Lv10 = 8/142, Lv20 = 12/252, Lv30 = 14/357).
 */
const BASE_CURVES = {
	general: {
		solErda: [
			5, 1, 1, 1, 2, 2, 2, 3, 3, 10, 3, 3, 4, 4, 4, 4, 4, 4, 5, 15, 5, 5, 5, 5, 5, 6, 6, 6, 7, 20
		],
		fragments: [
			100, 30, 35, 40, 45, 50, 55, 60, 65, 200, 80, 90, 100, 110, 120, 130, 140, 150, 160, 350, 170,
			180, 190, 200, 210, 220, 230, 240, 250, 500
		]
	},
	generalB: {
		solErda: [
			7, 1, 1, 1, 1, 2, 2, 2, 2, 8, 2, 2, 3, 3, 3, 3, 3, 3, 3, 12, 4, 4, 4, 4, 4, 4, 5, 5, 5, 14
		],
		fragments: [
			140, 21, 26, 30, 34, 38, 43, 47, 51, 142, 62, 69, 77, 83, 91, 98, 105, 112, 120, 252, 128,
			136, 145, 152, 161, 168, 177, 184, 193, 357
		]
	},
	commonA: {
		solErda: [
			7, 2, 2, 2, 3, 3, 3, 5, 5, 14, 5, 5, 6, 6, 6, 6, 6, 6, 7, 17, 7, 7, 7, 7, 7, 9, 9, 9, 10, 20
		],
		fragments: [
			125, 38, 44, 50, 57, 63, 69, 75, 82, 300, 110, 124, 138, 152, 165, 179, 193, 207, 220, 525,
			234, 248, 262, 275, 289, 303, 317, 330, 344, 750
		]
	},
	commonB: {
		solErda: [
			4, 1, 1, 1, 2, 2, 2, 3, 3, 9, 3, 3, 3, 3, 4, 4, 4, 4, 4, 14, 4, 5, 5, 5, 5, 5, 5, 5, 6, 18
		],
		fragments: [
			90, 25, 30, 35, 40, 45, 50, 55, 60, 180, 73, 81, 90, 98, 107, 115, 124, 132, 141, 315, 151,
			160, 170, 179, 189, 198, 208, 217, 227, 450
		]
	}
} as const satisfies Record<string, CostCurve>;

const scale = (curve: CostCurve, multiplier: number): CostCurve => ({
	solErda: curve.solErda.map((n) => Math.ceil(n * multiplier)),
	fragments: curve.fragments.map((n) => Math.ceil(n * multiplier))
});

/**
 * Per-node-type cost to reach each level. Index 0 is the cost to reach level 1.
 *
 * `Module:SolErdaCostTable` maps node types onto the base curves: Mastery is
 * `general` at **×0.5** and Enhancement is `general` at **×0.75**, both with a
 * per-cell `ceil`. Origin uses `general` with level 1 free, because 6th job
 * advancement grants it.
 */
export const HEXA_COST_CURVES: Record<HexaNodeType, CostCurve> = {
	origin: {
		solErda: [0, ...BASE_CURVES.general.solErda.slice(1)],
		fragments: [0, ...BASE_CURVES.general.fragments.slice(1)]
	},
	ascent: BASE_CURVES.general,
	mastery: scale(BASE_CURVES.general, 0.5),
	enhancement: scale(BASE_CURVES.general, 0.75),
	common: BASE_CURVES.commonA
};

/**
 * The KMS-only third Skill Node's curve, kept so the module is ready when GMS
 * gets it. Not reachable through {@link hexaCost} — see {@link HEXA_SKILL_3_LIVE_IN_GMS}.
 */
export const UNRELEASED_SKILL_3_COST_CURVE = BASE_CURVES.generalB;

/** The v271 third common core's curve (5th-job common-branch boost). */
export const HEXA_COMMON_3_COST_CURVE = BASE_CURVES.commonB;

export interface HexaCost {
	solErda: number;
	fragments: number;
}

/** Sol Erda and fragments to take one node from `from` to `to`. */
export function hexaCost(type: HexaNodeType, from: number, to: number): HexaCost {
	const spec = HEXA_NODE_TYPES[type];
	if (!spec) throw new Error(`Unknown HEXA node type "${type}".`);
	if (to <= from) return { solErda: 0, fragments: 0 };
	if (from < 0 || to > spec.maxLevel) {
		throw new Error(`${spec.label} levels run 0-${spec.maxLevel} (got ${from} → ${to}).`);
	}

	const curve = HEXA_COST_CURVES[type];
	let solErda = 0;
	let fragments = 0;
	for (let level = from; level < to; level += 1) {
		solErda += curve.solErda[level];
		fragments += curve.fragments[level];
	}
	return { solErda, fragments };
}

/** Cost to take one node from nothing to level 30. */
export function hexaCostToMax(type: HexaNodeType): HexaCost {
	return hexaCost(type, 0, HEXA_NODE_TYPES[type].maxLevel);
}

/**
 * Cost to take a whole class's skill matrix to level 30 — every Origin, Ascent,
 * Mastery, Enhancement and Common node.
 */
export function hexaMatrixCostToMax(): HexaCost {
	let solErda = 0;
	let fragments = 0;
	for (const spec of Object.values(HEXA_NODE_TYPES)) {
		const cost = hexaCostToMax(spec.type);
		solErda += cost.solErda * spec.count;
		fragments += cost.fragments * spec.count;
	}
	return { solErda, fragments };
}

/** The three levels where every curve spikes and every effect jumps. */
export const HEXA_MILESTONE_LEVELS = [10, 20, 30] as const;

/**
 * Cost to reach the next milestone level from `level`, and what it is worth in
 * Final Damage for an enhancement node.
 *
 * This exists because a one-level-ahead ranker is actively wrong here. Levels 9,
 * 19 and 29 look like +1% Final Damage for a spiked price; they are really the
 * last step of a +6 / +6 / +11 jump.
 */
export function costToNextMilestone(
	type: HexaNodeType,
	level: number
): { level: number; cost: HexaCost; finalDamageGained: number } | null {
	const next = HEXA_MILESTONE_LEVELS.find((milestone) => milestone > level);
	if (next === undefined) return null;
	return {
		level: next,
		cost: hexaCost(type, level, next),
		finalDamageGained: enhancementFinalDamage(next) - enhancementFinalDamage(level)
	};
}

/* -------------------------------------------------------------------------- */
/* Enhancement node effect                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Final Damage % an Enhancement (Boost) node grants at a level.
 *
 * `FD%(level) = 10 + level + 5·[level ≥ 10] + 5·[level ≥ 20] + 10·[level ≥ 30]`
 *
 * Giving 11 at Lv1, 25 at Lv10, 40 at Lv20 and 60 at Lv30. Recovered from the
 * `{{#expr:}}` in the raw wikitext of all five priority classes' skill pages;
 * the 11% figure is independently confirmed by Orange Mushroom's 6th-job
 * announcement (cores were buffed from 2% to 11% before release).
 *
 * ⚠️ The FD applies only to the ONE 5th-job skill the node names, and composes
 * multiplicatively with other Final Damage — never additively with %Damage or
 * %Boss Damage. Whether it multiplies with or adds to the underlying V skill's
 * own FD term is **UNVERIFIED**; treat it as multiplicative until tested.
 */
export function enhancementFinalDamage(level: number): number {
	if (level < 0 || level > 30) throw new Error(`HEXA node levels run 0-30 (got ${level}).`);
	if (level === 0) return 0;
	return 10 + level + (level >= 10 ? 5 : 0) + (level >= 20 ? 5 : 0) + (level >= 30 ? 10 : 0);
}

/**
 * Origin milestone bonuses, identical on every class. These are flat stat, not
 * skill-scoped, and are a large part of why Origin is levelled early.
 *
 * ⚠️ The IED is nominal and composes multiplicatively (`formulas.md` §1.8).
 */
export const ORIGIN_MILESTONES = [
	{ level: 10, ignoreDefensePercent: 20, bossDamagePercent: 0 },
	{ level: 20, ignoreDefensePercent: 20, bossDamagePercent: 20 },
	{ level: 30, ignoreDefensePercent: 50, bossDamagePercent: 50 }
] as const;

/** Cumulative Origin milestone bonuses at a level. */
export function originMilestoneBonus(level: number): {
	ignoreDefensePercent: number;
	bossDamagePercent: number;
} {
	if (level < 0 || level > 30) throw new Error(`HEXA node levels run 0-30 (got ${level}).`);
	let best = { ignoreDefensePercent: 0, bossDamagePercent: 0 };
	for (const milestone of ORIGIN_MILESTONES) {
		if (level >= milestone.level) {
			best = {
				ignoreDefensePercent: milestone.ignoreDefensePercent,
				bossDamagePercent: milestone.bossDamagePercent
			};
		}
	}
	return best;
}

/* -------------------------------------------------------------------------- */
/* HEXA Stat                                                                  */
/* -------------------------------------------------------------------------- */

export type HexaStatKey =
	'mainStat' | 'attack' | 'damage' | 'bossDamage' | 'ignoreDefense' | 'criticalDamage';

export interface HexaStatSpec {
	key: HexaStatKey;
	label: string;
	unit: 'flat' | 'percent';
	/** Value at line level 1. Every level is this base times a multiplier. */
	base: number;
}

/**
 * The stat pool. **The same six stats are available for Main and Additional** —
 * there is no separate main-only or additional-only list. You pick 3 distinct
 * stats and the first one is the Main.
 */
export const HEXA_STATS: Record<HexaStatKey, HexaStatSpec> = {
	mainStat: { key: 'mainStat', label: 'Main Stat', unit: 'flat', base: 100 },
	attack: { key: 'attack', label: 'Attack Power / Magic ATT', unit: 'flat', base: 5 },
	damage: { key: 'damage', label: 'Damage', unit: 'percent', base: 0.75 },
	bossDamage: { key: 'bossDamage', label: 'Damage to Boss Monsters', unit: 'percent', base: 1 },
	ignoreDefense: { key: 'ignoreDefense', label: 'Ignore Enemy Defense', unit: 'percent', base: 1 },
	criticalDamage: { key: 'criticalDamage', label: 'Critical Damage', unit: 'percent', base: 0.35 }
};

export const HEXA_STAT_KEYS = Object.keys(HEXA_STATS) as HexaStatKey[];

/**
 * Class exceptions on the Main Stat line. Xenon takes All Stats at 0.48x the
 * normal figure; Demon Avenger takes Max HP at 21x.
 */
export const HEXA_MAIN_STAT_OVERRIDES: Record<string, { label: string; multiplier: number }> = {
	xenon: { label: 'All Stats', multiplier: 0.48 },
	'demon-avenger': { label: 'Max HP', multiplier: 21 }
};

/** HEXA Stat cores a character can hold, and the gates on each. */
export const HEXA_STAT_CORES = [
	{ index: 1, characterLevel: 260, solErda: 5, fragments: 10, requiresPreviousAtLevel: 0 },
	{ index: 2, characterLevel: 265, solErda: 10, fragments: 200, requiresPreviousAtLevel: 20 },
	{ index: 3, characterLevel: 270, solErda: 15, fragments: 350, requiresPreviousAtLevel: 20 }
] as const;

/** A stat core's displayed level is the SUM of its three line levels, capped at 20. */
export const HEXA_STAT_NODE_MAX_LEVEL = 20;
/** Each individual line caps at 10. */
export const HEXA_STAT_LINE_MAX_LEVEL = 10;

/**
 * Value multipliers per line level. Index 0 is level 1.
 *
 * The Main line accelerates — 1,2,3,4,6,8,10,13,16,20 — while an Additional line
 * is plain linear. So a Main line at 10 is worth twice an Additional line at 10,
 * and the gap is what makes a high Main roll valuable.
 *
 * From `calMainStatValue` / `calAdditionalStatValue` in the community planner's
 * source; reproduces the wiki's table cell-for-cell.
 */
export const HEXA_MAIN_MULTIPLIER = [1, 2, 3, 4, 6, 8, 10, 13, 16, 20] as const;
export const HEXA_ADDITIONAL_MULTIPLIER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** Value of one HEXA Stat line at a level. */
export function hexaStatValue(
	key: HexaStatKey,
	level: number,
	line: 'main' | 'additional'
): number {
	const spec = HEXA_STATS[key];
	if (!spec) throw new Error(`Unknown HEXA stat "${key}".`);
	if (level < 0 || level > HEXA_STAT_LINE_MAX_LEVEL) {
		throw new Error(`HEXA stat lines run 0-10 (got ${level}).`);
	}
	if (level === 0) return 0;
	const multiplier =
		line === 'main' ? HEXA_MAIN_MULTIPLIER[level - 1] : HEXA_ADDITIONAL_MULTIPLIER[level - 1];
	// Round to 2dp so 0.35 * 8 lands on 2.8 rather than 2.8000000000000003.
	return Math.round(spec.base * multiplier * 100) / 100;
}

/** One HEXA Stat core: a Main line and two Additional lines. */
export interface HexaStatCore {
	main: { key: HexaStatKey; level: number };
	additional: [{ key: HexaStatKey; level: number }, { key: HexaStatKey; level: number }];
}

/** A core's displayed level — the sum of its three line levels. */
export function hexaStatCoreLevel(core: HexaStatCore): number {
	return core.main.level + core.additional[0].level + core.additional[1].level;
}

/** Total contribution of a set of HEXA Stat cores, per stat. Cores sum linearly. */
export function hexaStatTotals(
	cores: readonly HexaStatCore[]
): Partial<Record<HexaStatKey, number>> {
	const totals: Partial<Record<HexaStatKey, number>> = {};
	const add = (key: HexaStatKey, value: number) => {
		totals[key] = Math.round(((totals[key] ?? 0) + value) * 100) / 100;
	};
	for (const core of cores) {
		add(core.main.key, hexaStatValue(core.main.key, core.main.level, 'main'));
		for (const line of core.additional) {
			add(line.key, hexaStatValue(line.key, line.level, 'additional'));
		}
	}
	return totals;
}

/** Whether a core is a legal configuration. */
export function validateHexaStatCore(core: HexaStatCore): { ok: boolean; reason?: string } {
	const lines = [core.main, ...core.additional];
	for (const line of lines) {
		if (!HEXA_STATS[line.key]) return { ok: false, reason: `unknown stat "${line.key}"` };
		if (line.level < 0 || line.level > HEXA_STAT_LINE_MAX_LEVEL) {
			return { ok: false, reason: `${line.key} is level ${line.level}; lines cap at 10` };
		}
	}
	const keys = new Set(lines.map((line) => line.key));
	if (keys.size !== 3) return { ok: false, reason: 'the three lines must be distinct stats' };

	const level = hexaStatCoreLevel(core);
	if (level > HEXA_STAT_NODE_MAX_LEVEL) {
		return { ok: false, reason: `lines sum to ${level}; a core caps at 20` };
	}
	return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* The enhancement roll                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Chance the MAIN line is the one that levels on the next enhancement, keyed by
 * the main line's CURRENT level. Index 0 is main level 0.
 *
 * ⚠️ This is not a gauge. Every enhancement always levels *some* line by 1; the
 * displayed percentage is only which line. The whole distribution is a function
 * of the main line's level alone — nothing about the additional lines moves it,
 * except that a capped line is skipped.
 */
export const HEXA_MAIN_LINE_CHANCE = [35, 35, 35, 20, 20, 20, 20, 15, 10, 5, 0] as const;

/**
 * Fragments the next enhancement costs, keyed by the main line's current level.
 *
 * ⚠️ **CONFLICT at main level 8.** The wiki and the Korean simulator both say
 * **40**; Whackybeanz and an Inven summary say 30. 40 is encoded — two
 * independent primary-ish sources beat one calculator page, and Whackybeanz's
 * table is offset by one row throughout (it indexes the level being reached,
 * the wiki indexes the level you are at), which explains the slip.
 */
export const HEXA_ENHANCE_FRAGMENT_COST = [10, 10, 10, 20, 20, 20, 20, 30, 40, 50, 50] as const;

/** Chance each line has of being the one that levels, given a core's state. */
export function enhancementChances(core: HexaStatCore): {
	main: number;
	additional: [number, number];
} {
	const mainLevel = core.main.level;
	if (mainLevel < 0 || mainLevel > HEXA_STAT_LINE_MAX_LEVEL) {
		throw new Error(`HEXA stat lines run 0-10 (got ${mainLevel}).`);
	}
	const main = HEXA_MAIN_LINE_CHANCE[mainLevel];
	const rest = 100 - main;
	const [a1, a2] = core.additional;

	// A capped line is skipped and its share goes to the other one.
	if (a1.level >= HEXA_STAT_LINE_MAX_LEVEL && a2.level < HEXA_STAT_LINE_MAX_LEVEL) {
		return { main, additional: [0, rest] };
	}
	if (a2.level >= HEXA_STAT_LINE_MAX_LEVEL && a1.level < HEXA_STAT_LINE_MAX_LEVEL) {
		return { main, additional: [rest, 0] };
	}
	return { main, additional: [rest / 2, rest / 2] };
}

/** Fragments the next enhancement of this core costs. */
export function enhancementCost(core: HexaStatCore): number {
	return HEXA_ENHANCE_FRAGMENT_COST[core.main.level];
}

/**
 * Expected fragments to take one stat core from 0 to 20.
 *
 * ⚠️ **DERIVED, not sourced** — an exact DP over `(main, add1, add2)` computed
 * for the research document. Because every enhancement's price is set by the
 * main line's level and the main line is the one you cannot steer, the total is
 * a random variable: the floor is 200 (main never levels), the practical worst
 * case is 730, and the expectation is ~323. A Korean community guide's "about
 * 350 is enough" corroborates it with a safety margin.
 */
export const EXPECTED_FRAGMENTS_PER_STAT_CORE = 323;

/** Expected main-line level after a full 0 → 20 run. P(main ≥ 7) is about 21%. */
export const EXPECTED_MAIN_LINE_LEVEL = 5.24;

/* -------------------------------------------------------------------------- */
/* Currencies                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Sol Erda held at once. The captured Ren reads "Sol Erda 01/20", which is this
 * cap — not a progress bar.
 */
export const SOL_ERDA_CAP = 20;

/**
 * ⚠️ **Erda Conversion is not an EXP conversion.** It converts Sol Erda you
 * ALREADY HOLD into 30 Faint Sol Erda Energy (worth 300 energy — a 70% loss) or
 * into 1 HEXA Booster. It is a mule-transfer escape valve, never income. Do not
 * model it as a source of anything.
 */
export const ERDA_CONVERSION_IS_INCOME = false;
export const ERDA_CONVERSION_LOSS_PERCENT = 70;
