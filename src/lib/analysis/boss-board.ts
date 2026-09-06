// The boss board: "which bosses should I be fighting right now?" (design §9).
//
// Three axes per boss+difficulty:
//   * solo    — the whole HP bar inside the time limit;
//   * party   — your share of it, `HP / partySize`;
//   * carried — the 5% of TOTAL HP you must personally deal to get loot
//               (bosses.md §2.2, the blue dot).
//
// The board is deliberately two-layered, because its two layers have wildly
// different confidence:
//
//   1. HARD GATES — entry level, Arcane/Sacred Force multiplier, the 5% carry
//      number, the ChinaMS Combat Power floors. These are real game data or
//      pure arithmetic over it, and they are computed unconditionally.
//   2. THE DPM MODEL — everything with a `ratio` or a `clearMinutes`. This runs
//      off the per-class KMS 연무장 fits in src/lib/data/dpm-anchors.ts:
//
//        dpmDummy = k_class * combatPower ** alpha_class
//        dpmBoss  = dpmDummy
//                 * damageIndex(you, boss) / damageIndex(you, DUMMY_TARGET)
//                 * uptime
//
//      The single `damageIndex` ratio carries the PDR difference, the
//      level-difference coefficient and the Arcane/Sacred force coefficient
//      between the dummy and the boss — which is why `gates.forceMultiplier`
//      below is reported but NEVER multiplied into the DPM again. It also means
//      the transfer respects YOUR IED / %boss / crit rather than the measured
//      population's average.
//
//      It needs a Combat Power (see `resolveAnchorCombatPower`) and a class the
//      dataset covers. Without either, every DPM-derived verdict stays
//      `uncalibrated` and `BossBoard.calibrated` is false — the same escape
//      hatch as before, now hit far less often.
//
//      Even at its best this layer is `estimated`: the data is KMS, it is a
//      dummy with no mechanics, and it decays ~2%/month (dpm-anchors.md §6).

import {
	BOSSES,
	BOSS_ORDER,
	CP_PARTY_SIZE_RATIOS,
	fivePercentHp,
	getBoss,
	type Boss
} from '../data/bosses';
import {
	ANCHOR_MEASURED_AT,
	ANCHOR_REGION,
	ANCHOR_SOURCE_URL,
	DUMMY_TARGET,
	getAnchorDpm,
	getAnchorFrame,
	getDpmFit,
	type DpmFitOptions
} from '../data/dpm-anchors';
import { arcaneMultiplier, sacredMultiplier } from '../calc/force';
import { damageIndex } from '../calc/damage';
import type { CalcInput, Target } from '../calc/types';
import type { BossAxis, BossBoard, BossRow, BossTier, BossVerdict, Sourced } from './types';

/* -------------------------------------------------------------------------- */
/* Options and the shapes we accept                                            */
/* -------------------------------------------------------------------------- */

/**
 * `BossBoard` with `tierCounts` narrowed to required — this builder always
 * reports them.
 *
 * On the tier boundary itself: the user asked for a floor at "hard zak", and
 * GMS Zakum has no Hard (its difficulties are Easy / Normal / Chaos), so this
 * reads it as **Chaos Zakum**. If that reading is wrong the fix is one id in
 * {@link EARLY_BOSS_IDS}.
 */
export interface BossBoardResult extends BossBoard {
	rows: BossRow[];
	/** Roster-wide counts, so the UI can say "N early bosses hidden". */
	tierCounts: Record<BossTier, number>;
}

/**
 * The parts of the character document the board reads. A full
 * `schema.Character` satisfies this structurally.
 */
export interface BossBoardCharacter {
	level?: number;
	classId?: string;
	/**
	 * The stat-window capture. Only `displayed.combatPower` is read, and it is
	 * the PREFERRED Combat Power for the DPM anchor — see
	 * {@link resolveAnchorCombatPower}.
	 */
	statWindow?: { displayed?: { combatPower?: number } };
	/** Symbol levels, for the maxed-Sacred-Symbol regional bonus (bosses.md §5.5). */
	symbols?: {
		arcane?: Record<string, number | undefined>;
		sacred?: Record<string, number | undefined>;
		grandis?: Record<string, number | undefined>;
	};
}

export interface BossBoardOptions {
	/**
	 * Party size for the `party` axis. Defaults to the boss's `partyMax` capped
	 * at 3 — most real parties are trios, and every 2026 Grandis boss caps at 3
	 * anyway (existing-tools.md §1371).
	 */
	partySize?: number;
	/**
	 * Drop rows far above or below the character's range. Default true.
	 * Mirrors MapleScouter's own filter: solo ratio > 10 is filler, and a boss
	 * whose *carry* axis is out of reach is not a plan.
	 */
	relevantOnly?: boolean;
	/** Include `early`-tier rows (Chaos Zakum .. below Normal Lotus). Default false. */
	includeEarlyBosses?: boolean;
	/**
	 * Fraction of the fight actually spent attacking, on the solo and party axes
	 * — downtime, i-frames, phase transitions, movement, mechanics
	 * (bosses.md §5.5 `uptime_factor`, dpm-anchors.md §7.3).
	 *
	 * **This is the honest fudge factor.** Nothing in any public dataset measures
	 * it: 연무장 is a stationary dummy with no mechanics, so the fitted DPM is an
	 * upper bound and this number is what turns it into a clear time. It is the
	 * first thing to tune when the board disagrees with your own clear times.
	 *
	 * Defaults to {@link DEFAULT_UPTIME} (0.65) against a fitted anchor, and to
	 * 1.0 against a caller-supplied {@link BossBoardOptions.anchorDpm}, which is
	 * assumed to already be whatever DPM the caller wants used.
	 */
	uptimeFactor?: number;
	/**
	 * Uptime for the `carried` axis, which defaults HIGHER
	 * ({@link DEFAULT_CARRIED_UPTIME}, 0.9) than the solo one: a blue dot is
	 * contributing damage for a slice of the fight, not executing a full clear,
	 * so far less of its time goes to mechanics and phase transitions.
	 *
	 * Falls back to {@link BossBoardOptions.uptimeFactor} when that was set
	 * explicitly, so a caller who sets one uptime gets it everywhere.
	 */
	carriedUptimeFactor?: number;
	/**
	 * Combat Power computed by this tool (`analysis.summary.combatPower`).
	 *
	 * Two jobs: the advisory ChinaMS entry gate (bosses.md §3.1), and the
	 * FALLBACK regressor for the DPM anchor. It is only a fallback because
	 * `computeCombatPower` needs the weapon's base and star ATT for the bow
	 * normalisation and usually cannot derive them, and an approximate CP raised
	 * to ~1.14 is a materially wrong DPM. See {@link resolveAnchorCombatPower}.
	 */
	combatPower?: number;
	/**
	 * The Combat Power the game itself displays. PREFERRED over
	 * {@link BossBoardOptions.combatPower} for the DPM anchor. Normally read from
	 * `character.statWindow.displayed.combatPower`; this option exists for
	 * callers that hold the number but not the document.
	 */
	displayedCombatPower?: number;
	/** `per-class` (default) or `shared` exponent; see {@link DpmFitOptions}. */
	alphaMode?: DpmFitOptions['alphaMode'];
	/**
	 * Bypass the fitted anchor with a DPM measured some other way — the
	 * self-calibration route of dpm-anchors.md §7.1, where the user records
	 * their own Training Room run. Interpreted as a DPM produced by
	 * {@link BossBoardOptions.anchorFrame} (default: the 8.8 frame) and scaled by
	 * `damageIndex(you, boss) / damageIndex(frame, boss)`; uptime then defaults
	 * to 1.0. `null` forces the uncalibrated path.
	 */
	anchorDpm?: Sourced<number> | number | null;
	/** Override the stat window a supplied `anchorDpm` was measured on. */
	anchorFrame?: CalcInput;
}

/**
 * Default attacking uptime on the solo and party axes.
 *
 * dpm-anchors.md §7.3 gives "0.5-0.7 for a first solo clear, 0.75-0.9 for a
 * farmed weekly" and says the number should be exposed rather than hidden. 0.65
 * is the top of the first-clear band: the board's job is "can I do this yet?",
 * which is a first clear.
 */
export const DEFAULT_UPTIME = 0.65;

/**
 * Default attacking uptime on the `carried` axis — the blue dot. Higher than
 * {@link DEFAULT_UPTIME} because 5% of the bar is a burst window inside someone
 * else's clear, not a full fight.
 */
export const DEFAULT_CARRIED_UPTIME = 0.9;

/* -------------------------------------------------------------------------- */
/* Tiering                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Boss families from Normal Lotus onwards — the Black Heaven / Arcane River /
 * Grandis eras. Everything here is `current` at every difficulty, including the
 * Destiny and Champion mode variants.
 */
const CURRENT_FAMILIES: ReadonlySet<string> = new Set([
	'lotus',
	'damien',
	'guardian-angel-slime',
	'lucid',
	'will',
	'gloom',
	'verus-hilla',
	'darknell',
	'black-mage',
	'chosen-seren',
	'kalos',
	'first-adversary',
	'kaling',
	'malefic-star',
	'limbo',
	'baldrix',
	'jupiter'
]);

/**
 * `early`: Chaos Zakum up to but NOT including Normal Lotus.
 *
 * This has to be an explicit list rather than a rule. No single field separates
 * it: HP does not (Normal Cygnus 63B is `early`, Princess No 500B is not), the
 * CP gate does not (Chaos Zakum and Easy Cygnus both read 300,000), and "top
 * difficulty of the family" does not (Ursus and Princess No are top-difficulty
 * and still filler). It is the top rung of each pre-Arcane boss family, and it
 * is short enough to just write down.
 *
 * `normal-arkarium` is here because Arkarium has no Hard in GMS — Normal is its
 * top rung. `normal-akechi-mitsuhide` (level 210, 701B, 300% PDR) sits between
 * Chaos Papulatus and Normal Lotus, so it lands here too.
 */
const EARLY_BOSS_IDS: ReadonlySet<string> = new Set([
	'chaos-zakum',
	'hard-hilla',
	'chaos-pink-bean',
	'normal-cygnus',
	'chaos-pierre',
	'chaos-von-bon',
	'chaos-crimson-queen',
	'chaos-vellum',
	'hard-magnus',
	'chaos-papulatus',
	'hard-mori-ranmaru',
	'normal-gollux',
	'hard-gollux',
	'hard-von-leon',
	'chaos-horntail',
	'normal-arkarium',
	'normal-akechi-mitsuhide'
]);

/** Roster tier of one entry. Everything not `current` or `early` is `trivial`. */
export function bossTier(boss: Boss): BossTier {
	if (CURRENT_FAMILIES.has(boss.boss)) return 'current';
	if (EARLY_BOSS_IDS.has(boss.id)) return 'early';
	return 'trivial';
}

/* -------------------------------------------------------------------------- */
/* Effective HP corrections (bosses.md §5.5)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Mechanics that make effective HP diverge from the listed value.
 *
 * Only effects the source calls **permanent or near-permanent** are folded into
 * the DPM (`dpmMultiplier`); everything conditional or duration-dependent is
 * surfaced as a note and left out of the arithmetic, because guessing a duty
 * cycle would be inventing data. Every row says which it is, and applied rows
 * always add their own note — nothing is baked in silently.
 */
interface HpCorrection {
	/** Multiplier applied to estimated DPM. Absent = recorded but not applied. */
	dpmMultiplier?: number;
	note: string;
}

/** Shared across all four First Adversary difficulties. */
const FIRST_ADVERSARY_NOTE =
	'Gains +20% final damage while the Order gauge is at or above 800 (bosses.md §5.5). NOT applied — the gauge is a phase mechanic, not a permanent buff, so the ratio below is conservative.';

const HP_CORRECTIONS: Readonly<Record<string, HpCorrection>> = Object.freeze({
	'chaos-gloom': {
		note: 'Takes 90% reduced damage while its eye is closed (bosses.md §5.5). NOT applied — the fraction of the fight the eye spends closed is not sourced, so the ratio below is optimistic.'
	},
	'chaos-guardian-angel-slime': {
		dpmMultiplier: 0.85,
		note: 'APPLIED: permanent 15% damage reduction, ×0.85 DPM (bosses.md §5.5). Also recovers 1% HP every 30 s and takes no force boost — the regen is NOT applied (it compounds with clear time).'
	},
	'normal-guardian-angel-slime': {
		note: 'Recovers 1% HP every 30 s and takes no force boost (bosses.md §5.5). NOT applied.'
	},
	'normal-malefic-star': {
		dpmMultiplier: 1.3,
		note: 'APPLIED: +30% final damage near-permanently under the standard 테토 build, ×1.30 DPM (bosses.md §5.5).'
	},
	'hard-malefic-star': {
		dpmMultiplier: 1.3,
		note: 'APPLIED: +30% final damage near-permanently under the standard 테토 build, ×1.30 DPM (bosses.md §5.5).'
	},
	'easy-first-adversary': { note: FIRST_ADVERSARY_NOTE },
	'normal-first-adversary': { note: FIRST_ADVERSARY_NOTE },
	'hard-first-adversary': { note: FIRST_ADVERSARY_NOTE },
	'extreme-first-adversary': { note: FIRST_ADVERSARY_NOTE },
	'hard-chosen-seren': {
		note: 'Heals by the remaining shield amount on the dawn→noon transition (bosses.md §5.5) — a slower fight is strictly worse, so a ratio near 1.0 overstates your odds. NOT applied.'
	},
	'hard-lucid': {
		note: 'Phase 3 is a hard DPS check: 12.8T damage within 40 seconds (bosses.md §5.5).'
	},
	'extreme-lotus': {
		note: 'Cannot receive the +20% gimmick final damage nor the +25% Sacred boost, and phase 1 carries a shield (bosses.md §5.5). NOT applied.'
	},
	'hard-black-mage': {
		note: 'Arcane boost caps at ~110% (150% is unreachable), shields refresh frequently, and phase 1 carries +750B per shield (bosses.md §5.5). NOT applied.'
	},
	'extreme-black-mage': {
		note: 'Arcane boost caps at ~110% — 150% is unreachable — and shields refresh frequently (bosses.md §5.5). NOT applied.'
	}
});

/** Hard Lucid phase 3: 12.8T within 40 s (bosses.md §5.5). */
const HARD_LUCID_P3_DAMAGE = 12.8e12;
const HARD_LUCID_P3_SECONDS = 40;

/* -------------------------------------------------------------------------- */
/* Maxed Sacred Symbol regional bonus (bosses.md §5.5)                         */
/* -------------------------------------------------------------------------- */

/**
 * Since Dec 2025 a maxed Sacred Symbol grants **+20% damage** against its
 * region's matching boss. Keys are every spelling the two symbol vocabularies
 * use — `schema/character.ts` (`hotelArcus`, `shangrila`) and
 * `data/symbols.ts` (`arcus`, `shangri_la`, `geardock`) disagree, and
 * `Character.symbols.grandis` is a free-form record on top of that.
 */
const SYMBOL_BONUS_BOSSES: Readonly<Record<string, readonly string[]>> = Object.freeze({
	'chosen-seren': ['cernium'],
	kalos: ['hotelArcus', 'arcus', 'hotel-arcus', 'hotel_arcus'],
	'first-adversary': ['odium'],
	kaling: ['shangrila', 'shangri_la', 'shangri-la', 'shangriLa'],
	'malefic-star': ['arteria'],
	limbo: ['carcion'],
	baldrix: ['tallahart'],
	jupiter: ['geardock', 'gearlock']
});

/** Sacred and Grand Sacred symbols both max at level 11 (data/symbols.ts). */
const SACRED_SYMBOL_MAX_LEVEL = 11;
const SACRED_SYMBOL_BONUS = 0.2;

function hasMaxedRegionSymbol(character: BossBoardCharacter, boss: Boss): boolean {
	const keys = SYMBOL_BONUS_BOSSES[boss.boss];
	if (!keys) return false;
	const pools = [character.symbols?.sacred, character.symbols?.grandis];
	for (const pool of pools) {
		if (!pool) continue;
		for (const key of keys) {
			if ((pool[key] ?? 0) >= SACRED_SYMBOL_MAX_LEVEL) return true;
		}
	}
	return false;
}

/* -------------------------------------------------------------------------- */
/* Verdict bands                                                               */
/* -------------------------------------------------------------------------- */

/**
 * MapleScouter's solo ladder (kms-tools.md §2.3) is 여유컷 2.00 / 가능 1.10 /
 * 최소컷 0.90. We keep 2.00 and 0.90 and raise the middle rung to **1.20**,
 * because the same site's own guidance says the printed 1.10 is not actually a
 * clear: "100% is not 'can clear'; 120-130% is the realistic minimum, ~140%
 * comfortable, >=200% 여유컷". Using 1.10 would label a fight `possible` that
 * the people who set the cuts say is not.
 */
export const VERDICT_BANDS: ReadonlyArray<{ min: number; verdict: BossVerdict }> = Object.freeze([
	{ min: 2.0, verdict: 'comfortable' },
	{ min: 1.2, verdict: 'possible' },
	{ min: 0.9, verdict: 'minimum' }
]);

/** Band a clear ratio. Below the lowest band is `out-of-reach`. */
export function verdictFor(ratio: number): BossVerdict {
	for (const band of VERDICT_BANDS) {
		if (ratio >= band.min) return band.verdict;
	}
	return 'out-of-reach';
}

/* -------------------------------------------------------------------------- */
/* Force gates                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Below this Arcane ratio (percent) the fight is pointless: MapleScouter drops
 * to a 70% damage coefficient under 70% ratio, and our own force table pays
 * 0.7x or worse (bosses.md §4.1, kms-tools.md §2.2, design §9).
 */
export const ARCANE_BLOCK_RATIO_PERCENT = 70;
/**
 * More than 20 Sacred short is crippling: MapleScouter's coefficient falls to
 * 70% below −20 (kms-tools.md §2.2), matching design §9's "Sacred >= −20".
 */
export const SACRED_BLOCK_DEFICIT = -20;

/* -------------------------------------------------------------------------- */
/* Combat Power floors                                                         */
/* -------------------------------------------------------------------------- */

/** Published per-member floor for a party size, else the §3.3 ratio model. */
function cpFloor(boss: Boss, partySize: number): number | undefined {
	const solo = boss.cpGate?.solo;
	if (solo == null) return undefined;
	if (partySize <= 1) return solo;
	const published = boss.cpGate?.perMember?.[String(partySize) as '2' | '3' | '4' | '5' | '6'];
	if (published != null) return published;
	const ratio = CP_PARTY_SIZE_RATIOS[partySize];
	return ratio == null ? undefined : solo * ratio;
}

/* -------------------------------------------------------------------------- */
/* buildBossBoard                                                              */
/* -------------------------------------------------------------------------- */

function toSourced(v: Sourced<number> | number | null | undefined): Sourced<number> | null {
	if (v == null) return null;
	return typeof v === 'number' ? { value: v, confidence: 'estimated' } : v;
}

/** The `Target` the damage index is evaluated against for one boss entry. */
export function bossTarget(boss: Boss): Target {
	return {
		id: boss.id,
		// data/bosses.ts: `pdr` is a percentage (380), the formula wants 3.8.
		pdr: (boss.pdr ?? 300) / 100,
		level: boss.level ?? boss.entryLevel ?? 0,
		arcaneReq: boss.force.type === 'arcane' ? boss.force.required : undefined,
		sacredReq: boss.force.type === 'sacred' ? boss.force.required : undefined
	};
}

function axis(verdict: BossVerdict, reason?: string): BossAxis {
	return reason == null ? { verdict } : { verdict, reason };
}

/* -------------------------------------------------------------------------- */
/* Combat Power for the DPM anchor                                             */
/* -------------------------------------------------------------------------- */

/** Where the Combat Power fed to the DPM curve came from. */
export type AnchorCombatPowerSource = 'displayed' | 'computed';

export interface AnchorCombatPower {
	value: number;
	source: AnchorCombatPowerSource;
}

/**
 * Pick the Combat Power the DPM curve is evaluated at.
 *
 * **Displayed wins.** `calc.computeCombatPower` needs the equipped weapon's own
 * base ATT and Star Force ATT to do the bow normalisation (formulas.md §2.2),
 * and GMS classic merges scroll and star ATT in the tooltip, so those are
 * usually underivable and the function returns an un-normalised `approx` value
 * that reads LOW for every non-bow class. Feeding that into `CP ** 1.14`
 * compounds the error, so the number the game prints in the stat window —
 * which the agent guide already collects — is preferred whenever it exists.
 *
 * The computed value is still used when there is no displayed one, because a
 * degraded estimate beats no board at all; it is labelled and its confidence is
 * knocked down a step by {@link degradeForComputedCp}.
 */
export function resolveAnchorCombatPower(
	character: BossBoardCharacter,
	options: BossBoardOptions
): AnchorCombatPower | null {
	const displayed = options.displayedCombatPower ?? character.statWindow?.displayed?.combatPower;
	if (displayed != null && Number.isFinite(displayed) && displayed > 0) {
		return { value: displayed, source: 'displayed' };
	}
	const computed = options.combatPower;
	if (computed != null && Number.isFinite(computed) && computed > 0) {
		return { value: computed, source: 'computed' };
	}
	return null;
}

/** Drop a computed-CP anchor one confidence step and say why. */
function degradeForComputedCp(anchor: Sourced<number>): Sourced<number> {
	return {
		value: anchor.value,
		confidence: 'speculative',
		note:
			`${anchor.note ?? ''} Combat Power was COMPUTED, not read from the stat window: ` +
			"without the weapon's base and star ATT the bow normalisation is skipped " +
			'(formulas.md §2.2), so the CP — and this DPM — read low. Capture the Combat ' +
			'Power shown in-game to fix it.'
	};
}

export function buildBossBoard(
	input: CalcInput,
	character: BossBoardCharacter = {},
	options: BossBoardOptions = {}
): BossBoardResult {
	const relevantOnly = options.relevantOnly ?? true;
	const includeEarly = options.includeEarlyBosses ?? false;
	const characterLevel = character.level ?? input.level;
	const classId = character.classId ?? input.classId;

	/* ---- which anchor, and what it is a DPM *against* --------------------- */

	// Two calibration routes, and they divide by different things:
	//
	//   supplied  — `options.anchorDpm` is a DPM measured on `anchorFrame` (a
	//               DIFFERENT character), so the frame is re-evaluated against
	//               each boss and everything the two characters share cancels.
	//               `anchorFrameTarget` stays undefined to mean "the boss".
	//   fitted    — `getAnchorDpm` is a DPM for THIS character at THIS Combat
	//               Power on the 연무장 dummy, so the character is its own frame
	//               and the denominator is fixed at DUMMY_TARGET. That ratio
	//               carries PDR, level gap and force from dummy to boss, and is
	//               the reason `forceMult` below is never multiplied in again.
	const supplied = options.anchorDpm !== undefined;
	const combatPower = supplied ? null : resolveAnchorCombatPower(character, options);
	const fit = supplied ? null : getDpmFit(classId);

	let anchor: Sourced<number> | null;
	let anchorFrame: CalcInput;
	let anchorFrameTarget: Target | undefined;
	if (supplied) {
		anchor = toSourced(options.anchorDpm);
		anchorFrame = options.anchorFrame ?? getAnchorFrame(classId);
		anchorFrameTarget = undefined;
	} else {
		const fitted = combatPower ? getAnchorDpm(classId, combatPower.value, options) : null;
		anchor = fitted && combatPower?.source === 'computed' ? degradeForComputedCp(fitted) : fitted;
		anchorFrame = input;
		anchorFrameTarget = DUMMY_TARGET;
	}
	const calibrated = anchor !== null;

	// A fitted anchor is a stationary-dummy DPM and needs the uptime haircut; a
	// supplied one is whatever the caller measured, so it is taken at face value.
	const uptimeFactor = options.uptimeFactor ?? (supplied ? 1 : DEFAULT_UPTIME);
	const carriedUptimeFactor =
		options.carriedUptimeFactor ?? options.uptimeFactor ?? (supplied ? 1 : DEFAULT_CARRIED_UPTIME);

	const uncalibratedReason = supplied
		? 'No DPM anchor was supplied — clear time cannot be estimated.'
		: !fit
			? `The KMS 연무장 ${ANCHOR_MEASURED_AT} dataset has no records for "${classId}", so there is no DPM anchor for it.`
			: 'No Combat Power for this character — the DPM anchor is a curve in Combat Power, so clear time cannot be estimated.';

	const tierCounts: Record<BossTier, number> = { trivial: 0, early: 0, current: 0 };
	for (const boss of BOSSES) tierCounts[bossTier(boss)]++;

	const rows: BossRow[] = [];

	for (const id of BOSS_ORDER) {
		const boss = getBoss(id);
		if (!boss) continue;

		const tier = bossTier(boss);
		// `trivial` is never shown, under any option.
		if (tier === 'trivial') continue;
		if (tier === 'early' && !includeEarly) continue;

		const notes: string[] = [];

		/* ---- hard gates -------------------------------------------------- */

		const entryLevel = boss.entryLevel ?? 0;
		const levelOk = characterLevel >= entryLevel;

		const forceType = boss.force.type;
		const forceRequired = boss.force.required;
		const forceHave =
			forceType === 'arcane'
				? (input.arcaneForce ?? 0)
				: forceType === 'sacred'
					? (input.sacredForce ?? 0)
					: undefined;

		let forceMult = 1;
		let forceBlocked = false;
		let forceReason: string | undefined;
		if (forceType === 'arcane' && forceRequired) {
			forceMult = arcaneMultiplier(forceRequired, forceHave);
			// Same float guard `arcaneMultiplier` uses, so the gate and the
			// multiplier never disagree on a boundary like 511/730 = 70%.
			const ratioPercent = Math.floor(
				Number((((forceHave ?? 0) / forceRequired) * 100).toFixed(10))
			);
			if (ratioPercent < ARCANE_BLOCK_RATIO_PERCENT) {
				forceBlocked = true;
				forceReason = `Arcane Power ${forceHave ?? 0}/${forceRequired} = ${ratioPercent}% of the requirement; below ${ARCANE_BLOCK_RATIO_PERCENT}% the damage penalty makes the fight pointless (bosses.md §4.1).`;
			}
		} else if (forceType === 'sacred' && forceRequired) {
			forceMult = sacredMultiplier(forceRequired, forceHave);
			const gap = (forceHave ?? 0) - forceRequired;
			if (gap < SACRED_BLOCK_DEFICIT) {
				forceBlocked = true;
				forceReason = `Sacred Power ${forceHave ?? 0}/${forceRequired}, ${-gap} short; more than ${-SACRED_BLOCK_DEFICIT} short costs over 20% damage (bosses.md §4.2).`;
			}
		}

		if (forceType !== 'none' && forceRequired && !forceBlocked && forceMult !== 1) {
			notes.push(
				`Force multiplier ×${forceMult.toFixed(2)} at ${forceHave ?? 0}/${forceRequired} ${forceType === 'arcane' ? 'Arcane' : 'Sacred'} Power.`
			);
		}

		const partyMax = boss.partyMax ?? 6;
		const partySize = Math.max(1, Math.min(options.partySize ?? Math.min(partyMax, 3), partyMax));

		// Advisory only. bosses.md §3.1: the numbers are ChinaMS client data and
		// GMS enforcement is unconfirmed, so this NEVER produces `blocked`.
		const entryFloor = cpFloor(boss, partyMax);
		const combatPowerOk =
			options.combatPower == null || entryFloor == null
				? undefined
				: options.combatPower >= entryFloor;
		if (combatPowerOk === false) {
			notes.push(
				`Advisory: ChinaMS lists a ${Math.round(entryFloor!).toLocaleString('en-US')} Combat Power floor even at ${partyMax}-player entry (bosses.md §3.2/§3.3); GMS enforcement is unconfirmed.`
			);
		}

		/* ---- effective damage -------------------------------------------- */

		const totalHp = boss.hp?.total;
		const timeLimitMin = boss.timeLimitMin;
		const carryDamageRequired = fivePercentHp(boss) ?? undefined;

		const correction = HP_CORRECTIONS[boss.id];
		if (correction) notes.push(correction.note);

		const symbolBonus = hasMaxedRegionSymbol(character, boss);
		if (symbolBonus) {
			notes.push(
				`APPLIED: maxed Sacred Symbol for this boss's region, ×${(1 + SACRED_SYMBOL_BONUS).toFixed(2)} damage (bosses.md §5.5).`
			);
		}

		// DPM before uptime — the axes apply their own, because the blue dot and a
		// full clear do not spend the same fraction of the fight attacking.
		let baseDpm: number | undefined;
		if (anchor && totalHp != null) {
			const target = bossTarget(boss);
			const frameIndex = damageIndex(anchorFrame, anchorFrameTarget ?? target);
			if (frameIndex > 0) {
				const transferred = (anchor.value * damageIndex(input, target)) / frameIndex;
				baseDpm =
					transferred *
					(symbolBonus ? 1 + SACRED_SYMBOL_BONUS : 1) *
					(correction?.dpmMultiplier ?? 1);
			}
		}

		const effectiveDpm = baseDpm == null ? undefined : baseDpm * uptimeFactor;

		if (boss.id === 'hard-lucid' && effectiveDpm != null) {
			const p3 = (effectiveDpm * HARD_LUCID_P3_SECONDS) / 60;
			notes.push(
				`Phase 3 check: you would deal ~${formatDamage(p3)} in 40 s against the required ${formatDamage(HARD_LUCID_P3_DAMAGE)} — ${p3 >= HARD_LUCID_P3_DAMAGE ? 'passes' : 'FAILS'}.`
			);
		}

		/* ---- axes --------------------------------------------------------- */

		const blockedReason = !levelOk
			? `Entry level ${entryLevel}; you are ${characterLevel}.`
			: forceBlocked
				? forceReason
				: undefined;

		const makeAxis = (
			requiredDamage: number | undefined,
			label: string,
			uptime: number
		): BossAxis => {
			if (blockedReason) return axis('blocked', blockedReason);
			if (!calibrated) return axis('uncalibrated', uncalibratedReason);
			if (requiredDamage == null || timeLimitMin == null || baseDpm == null) {
				return axis('uncalibrated', `No HP or time-limit data for this entry (${label}).`);
			}
			const dpm = baseDpm * uptime;
			if (dpm <= 0) return axis('out-of-reach', 'Estimated DPM is zero.');
			const ratio = (dpm * timeLimitMin) / requiredDamage;
			return {
				verdict: verdictFor(ratio),
				ratio,
				clearMinutes: requiredDamage / dpm
			};
		};

		const solo = makeAxis(totalHp, 'solo', uptimeFactor);
		const party = makeAxis(
			totalHp == null ? undefined : totalHp / partySize,
			'party',
			uptimeFactor
		);
		const carried = makeAxis(carryDamageRequired, 'carried', carriedUptimeFactor);

		if (carried.ratio != null && carriedUptimeFactor !== uptimeFactor) {
			carried.reason = `5% of the bar at ${Math.round(carriedUptimeFactor * 100)}% uptime — a blue dot contributes damage inside someone else's clear rather than executing one, so it loses less time to mechanics than the ${Math.round(uptimeFactor * 100)}% used above.`;
		}

		if (partySize <= 1) {
			party.reason = `${boss.bossName} is solo-only (party max ${partyMax}); the party axis repeats the solo axis.`;
		} else if (party.verdict !== 'blocked' && party.verdict !== 'uncalibrated') {
			party.reason = `Your share at ${partySize} players.`;
		}

		// Advisory CP notes on the axes that have their own published floor.
		if (options.combatPower != null) {
			const soloFloor = boss.cpGate?.solo;
			if (soloFloor != null && options.combatPower < soloFloor) {
				notes.push(
					`Advisory: solo Combat Power floor is ${soloFloor.toLocaleString('en-US')} (ChinaMS, bosses.md §3.2).`
				);
			}
			const memberFloor = cpFloor(boss, partySize);
			if (memberFloor != null && options.combatPower < memberFloor) {
				notes.push(
					`Advisory: ${partySize}-player per-member Combat Power floor is ~${Math.round(memberFloor).toLocaleString('en-US')} (bosses.md §3.3).`
				);
			}
		}

		rows.push({
			bossId: boss.id,
			bossName: boss.bossName,
			difficulty: boss.difficulty,
			level: boss.level ?? boss.entryLevel ?? 0,
			entryLevel,
			totalHp,
			tier,
			gates: {
				levelOk,
				forceMultiplier: forceMult,
				forceType,
				forceRequired,
				forceHave,
				combatPowerOk
			},
			carryDamageRequired,
			solo,
			party,
			carried,
			crystalMesos: boss.crystal?.solo,
			notes: notes.length ? notes : undefined
		});
	}

	const kept = relevantOnly ? rows.filter((row) => isRelevant(row, characterLevel)) : rows;

	return {
		rows: kept,
		calibrated,
		tierCounts,
		note: boardNote({
			anchor,
			supplied,
			fit,
			combatPower,
			classId,
			uptimeFactor,
			carriedUptimeFactor,
			uncalibratedReason
		})
	};
}

/** Percent, for copy: `0.65` -> `65`. */
function pct(fraction: number): string {
	return `${Math.round(fraction * 1000) / 10}%`;
}

/**
 * The one sentence the UI banner shows. It has to be honest about three things
 * at once: the numbers are KMS, the transfer is a model, and the uptime is a
 * guess the user can change (dpm-anchors.md §6, §7.3). Never claim precision.
 */
function boardNote(args: {
	anchor: Sourced<number> | null;
	supplied: boolean;
	fit: ReturnType<typeof getDpmFit>;
	combatPower: AnchorCombatPower | null;
	classId: string;
	uptimeFactor: number;
	carriedUptimeFactor: number;
	uncalibratedReason: string;
}): string {
	const { anchor, supplied, fit, combatPower, uptimeFactor, carriedUptimeFactor } = args;

	const uptimeSentence =
		uptimeFactor === carriedUptimeFactor
			? `Attacking uptime ${pct(uptimeFactor)} — an assumption, not a measurement, and the first thing to change if these times are wrong.`
			: `Attacking uptime ${pct(uptimeFactor)} solo and party, ${pct(carriedUptimeFactor)} carried — assumptions, not measurements, and the first thing to change if these times are wrong.`;
	const bands = `Bands are MapleScouter's ladder with the 120% realistic-minimum floor (kms-tools.md §2.3).`;

	if (!anchor) {
		return `Uncalibrated: ${args.uncalibratedReason} Only the hard gates, the 5% carry number and the Combat Power advisories are meaningful; every DPM-derived verdict reads \`uncalibrated\`. ${bands}`;
	}

	if (supplied || !fit || !combatPower) {
		return `Clear times are estimates: supplied anchor DPM ${anchor.value.toLocaleString('en-US')} (${anchor.confidence}) scaled by the boss-damage index. ${uptimeSentence} ${bands}`;
	}

	const cpLabel =
		combatPower.source === 'displayed'
			? 'Combat Power as displayed in-game'
			: 'Combat Power computed by this tool (approximate — capture the displayed value for a better estimate)';

	return (
		`Clear times are estimates, not measurements. Basis: ${ANCHOR_REGION} 연무장 (Practice Arena) ` +
		`records, ${ANCHOR_MEASURED_AT} (${ANCHOR_SOURCE_URL}) — ${args.classId} fitted as ` +
		`DPM = k x CP^${fit.alpha.toFixed(2)} over ${fit.sampleSize} trusted record${fit.sampleSize === 1 ? '' : 's'}, ` +
		`then transferred to each boss by your own damage index, which carries the defence, ` +
		`level-gap and force differences. ${cpLabel}: ` +
		`${Math.round(combatPower.value).toLocaleString('en-US')}. ${uptimeSentence} ` +
		`This is KMS data — GMS differs (attack-speed cap, patch lag) and anchors decay about ` +
		`2%/month — so treat every number here as a rough estimate (confidence: ${anchor.confidence}). ${bands}`
	);
}

/**
 * How far above the character's level an entry gate can sit and still be worth
 * showing. A heuristic, like MapleScouter's own ratio cutoffs: within ~10 levels
 * "come back at 290" is a plan, beyond it the row is just noise.
 */
export const LEVEL_RELEVANCE_WINDOW = 10;

/**
 * MapleScouter-style relevance filter.
 *
 * Drops (a) entries with no HP data at all — the Destiny and Champion mode rows,
 * which the dataset carries as CP-gate stubs; (b) fights whose entry level is
 * more than {@link LEVEL_RELEVANCE_WINDOW} above you; (c) fights so far below you
 * that the solo ratio exceeds 10; (d) fights where even the carry axis is out of
 * reach. Force-`blocked` rows and near-miss level gates are KEPT — both are
 * actionable, and both are exactly what the board is for.
 */
function isRelevant(row: BossRow, characterLevel: number): boolean {
	if (row.totalHp == null) return false;
	if (row.entryLevel - characterLevel > LEVEL_RELEVANCE_WINDOW) return false;
	if (row.solo.ratio != null && row.solo.ratio > 10) return false;
	if (row.carried.verdict === 'out-of-reach') return false;
	return true;
}

/** Compact damage formatter for notes: 12.8T, 604.6T, 1.02Q. */
function formatDamage(value: number): string {
	const units: [number, string][] = [
		[1e15, 'Q'],
		[1e12, 'T'],
		[1e9, 'B'],
		[1e6, 'M']
	];
	for (const [scale, suffix] of units) {
		if (value >= scale) return `${(value / scale).toFixed(2)}${suffix}`;
	}
	return String(Math.round(value));
}
