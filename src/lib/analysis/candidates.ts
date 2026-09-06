// Candidate upgrade generation (design §5).
//
// Every candidate is a `Delta` plus a cost plus a confidence. Nothing here
// scores anything — `rank.ts` does that, so that the generators stay pure
// table-lookups and can be tested in isolation.
//
// WORLD SCOPE is Heroic (design §2): 30★ star force, Heroic cube prices
// (12M/22M), Powerful Rebirth Flames at 9.5M from the general store, and NO
// bonus potential at all.

import * as calc from '$lib/calc';
import type { CalcInput, Delta } from '$lib/calc/types';
import { getClass, type ClassDef } from '$lib/data/classes';
import * as flames from '$lib/data/flames';
import { capabilities, type ItemCapabilities } from '$lib/data/items';
import * as hyperstats from '$lib/data/hyperstats';
import * as potential from '$lib/data/potential';
import * as potentialLines from '$lib/data/potential-lines';
import * as gearProgression from '$lib/data/gear-progression';
import * as starforce from '$lib/data/starforce';
import * as symbols from '$lib/data/symbols';
import {
	STAR_FORCEABLE_CATEGORIES,
	type ArcaneRegion,
	type Character,
	type HyperStatKey,
	type Item,
	type ItemCategory,
	type SacredRegion
} from '$lib/schema';

import { CATEGORY_BY_SLOT } from '$lib/schema/item';
import { setEffectToDelta, setProgress } from './sets';
import type { Confidence, Feasibility, NamedTarget, UpgradeCost, UpgradeKind } from './types';

/** A scored-in-`rank.ts` proposal. */
export interface UpgradeCandidate {
	id: string;
	kind: UpgradeKind;
	label: string;
	detail?: string;
	slot?: string;
	itemName?: string;
	delta: Delta;
	cost: UpgradeCost;
	confidence: Confidence;
	/** How attainable this is. Defaults to `routine` when absent. */
	feasibility?: Feasibility;
	notes?: string[];
}

export interface CandidateResult {
	candidates: UpgradeCandidate[];
	/** Why something was NOT generated, plus data problems found on the way. */
	notes: string[];
}

export interface CandidateOptions {
	/** Restrict the generators. Defaults to all. */
	kinds?: UpgradeKind[];
	/** Star force breakpoints to offer, beyond `current + 1`. */
	breakpoints?: readonly number[];
}

/** design §5: "current stars → +1, and → next breakpoint". */
export const STAR_BREAKPOINTS = [17, 18, 19, 20, 21, 22, 23, 25, 30] as const;

/* -------------------------------------------------------------------------- */
/* Small shared helpers                                                        */
/* -------------------------------------------------------------------------- */

/** The weakest of a set of confidences — a candidate is only as good as its worst input. */
const CONFIDENCE_ORDER: Confidence[] = ['exact', 'sourced', 'estimated', 'speculative'];
export function weakest(...values: Confidence[]): Confidence {
	let worst = 0;
	for (const value of values) worst = Math.max(worst, CONFIDENCE_ORDER.indexOf(value));
	return CONFIDENCE_ORDER[worst];
}

type FourStat = 'str' | 'dex' | 'int' | 'luk';

/**
 * Goal kinds whose lines only add up when they all carry the SAME stat, and so
 * must name one. Non-stat goals (boss, IED, %ATT, crit damage) are unambiguous.
 */
const STAT_BEARING_GOAL_KINDS = new Set<potentialLines.PoolLineKind>(['stat_pct', 'stat_flat']);

function mainStatOf(cls: ClassDef): FourStat | undefined {
	const key = cls.primary[0];
	return key && key !== 'hp' ? key : undefined;
}

function subStatOf(cls: ClassDef): FourStat | undefined {
	const key = cls.secondary[0];
	return key && key !== 'hp' ? key : undefined;
}

/** Categories that can carry regular potential (formulas.md §4A §3.1). */
const POTENTIAL_CATEGORIES: Record<string, potential.PotentialCategory | undefined> = {
	weapon: 'weapon',
	secondary: 'secondary',
	emblem: 'emblem',
	armor: 'armor',
	accessory: 'accessory',
	heart: 'heart',
	badge: 'badge'
};

/* -------------------------------------------------------------------------- */
/* Capability gate                                                             */
/*                                                                             */
/* The catalogue (src/lib/data/items) is the ground truth for "can this item    */
/* even receive this upgrade". Before this gate existed the generators trusted  */
/* whatever an agent PUT at them and proposed impossible upgrades — star        */
/* forcing a Ring of Restraint, star forcing a Genesis weapon, flaming a ring.  */
/*                                                                             */
/* A suppressed candidate is NEVER dropped silently: every suppression lands    */
/* in `CandidateResult.notes` so the UI can distinguish "we have no suggestion  */
/* for this item" from "this upgrade is impossible for this item".              */
/* -------------------------------------------------------------------------- */

/** One "we did not generate X for Y, because Z" record, before formatting. */
interface Suppression {
	slot: string;
	itemName: string;
	reason: string;
}

/** Group suppressions by reason so 8 flame-ineligible items make 1 note, not 8. */
function formatSuppressions(kind: string, list: readonly Suppression[]): string[] {
	const byReason = new Map<string, string[]>();
	for (const entry of list) {
		const where = `${entry.slot} (${entry.itemName})`;
		const bucket = byReason.get(entry.reason);
		if (bucket) bucket.push(where);
		else byReason.set(entry.reason, [where]);
	}
	return [...byReason].map(
		([reason, where]) => `No ${kind} candidate for ${where.join(', ')}: ${reason}`
	);
}

/** Why one specific capability was denied, as one sentence. */
function capabilityReasons(
	caps: ItemCapabilities,
	which: 'starforce' | 'flame' | 'potential' | 'bonusPotential'
): string {
	const reasons = caps.blockedBy[which].map((id) => caps.reasons[id]).filter(Boolean);
	return reasons.length > 0 ? reasons.join(' ') : 'the item catalogue does not allow it.';
}

/** The subset of `Item` the catalogue needs to resolve capabilities. */
function capsFor(slot: string, item: Item): ItemCapabilities {
	return capabilities({
		name: item.name,
		slot,
		category: item.category,
		itemLevel: item.itemLevel,
		superior: item.superior
	});
}

/** A candidate note flagging a name the catalogue could not match exactly. */
function unknownItemNote(caps: ItemCapabilities): string[] {
	if (caps.matchQuality === 'exact') return [];
	const id = caps.known ? 'approximate-name-match' : 'unknown-item';
	return [caps.reasons[id] ?? 'Item name could not be matched in the catalogue.'];
}

/* -------------------------------------------------------------------------- */
/* Star force                                                                  */
/* -------------------------------------------------------------------------- */

function starForceKind(slot: string, category: ItemCategory): starforce.StarForceKind {
	if (category === 'weapon') return 'weapon';
	if (category === 'badge') return 'badge';
	if (slot === 'gloves') return 'glove';
	return 'armor';
}

function starDelta(
	cls: ClassDef,
	item: Item,
	from: number,
	to: number,
	kind: starforce.StarForceKind
): Delta {
	const itemLevel = item.itemLevel as number;
	const args = {
		itemLevel,
		kind,
		baseAttack: item.base?.att,
		baseMagicAttack: item.base?.matt,
		allowUnverifiedWeapon26to30: to > 25
	};
	const before = starforce.cumulativeStarStats({ ...args, stars: from });
	const after = starforce.cumulativeStarStats({ ...args, stars: to });

	// The wiki's "Class Stats" column grants the amount to STR/DEX/INT/LUK each,
	// so main and secondary both move. Star force stat is "% applied" (base).
	const stat = after.stat - before.stat + (after.allStat - before.allStat);
	const att = cls.usesMagicAttack ? after.matt - before.matt : after.att - before.att;

	const delta: Delta = {};
	if (stat) {
		delta.mainFlat = stat;
		delta.subFlat = stat;
	}
	if (att) delta.att = att;
	return delta;
}

function generateStarforce(character: Character, opts: CandidateOptions): CandidateResult {
	const cls = getClass(character.classId);
	const candidates: UpgradeCandidate[] = [];
	const notes: string[] = [];
	const suppressed: Suppression[] = [];
	const breakpoints = opts.breakpoints ?? STAR_BREAKPOINTS;

	for (const [slot, item] of Object.entries(character.equipment ?? {})) {
		if (!item) continue;
		if (!STAR_FORCEABLE_CATEGORIES.includes(item.category)) continue;

		// The catalogue gate. Genesis / Destiny weapons, Ring of Restraint and
		// everything else with no upgrade slots stops here.
		const caps = capsFor(slot, item);
		if (!caps.canStarforce) {
			const fixed =
				caps.fixedStarforce !== undefined ? ` It is fixed at ${caps.fixedStarforce}★.` : '';
			suppressed.push({
				slot,
				itemName: item.name,
				reason: `${capabilityReasons(caps, 'starforce')}${fixed}`
			});
			continue;
		}

		if (item.superior || caps.superior) {
			// starforce.ts: "Superior gear is out of scope here — it still loses a star on
			// failure and has Chance Time", so `expectedCostToReach` would be wrong.
			// `caps.superior` catches Tyrant / Nova / Elite Heliseum gear even when the
			// capture forgot to set the flag.
			notes.push(
				`${slot} (${item.name}) is Superior/Tyrant gear: the star force cost chain does not ` +
					'model Chance Time or star loss on failure, so no star force candidates were ' +
					'generated for it.'
			);
			continue;
		}
		if (item.itemLevel === undefined || item.starforce === undefined) continue;

		const kind = starForceKind(slot, item.category);
		// The catalogue knows the per-item caps (Sweetwater 15★, the two
		// star-forceable badges 22★, Superior tables); fall back to the level
		// table only when it does not.
		const max = caps.maxStarforce ?? starforce.maxStars(item.itemLevel, false);
		const from = item.starforce;
		if (from >= max) continue;

		// Pitched and Brilliant gear is out of scope for ranking entirely: the drop
		// wait is measured in months-to-years, so an upgrade path through it is not
		// a plan. gear-progression.md SS "Pitched exclusion" carries the reasoning.
		if (gearProgression.isOutOfScope(item.name)) continue;

		const targets = new Set<number>([from + 1]);
		for (const breakpoint of breakpoints) if (breakpoint > from) targets.add(breakpoint);

		// The mechanical cap is not the plan. Stars 23-30 grant NO class stat
		// (gear-progression `LAST_STAT_STAR`), and 22 -> 30 costs ~2.4e7 attempts
		// and ~1.1e6 destroyed copies. Offering it is how this board came to show
		// "Fafnir Soaring Sword 14* -> 30*" at 2,275 TRILLION mesos.
		//
		// A target past the stopping point is DROPPED WITH A REASON, never silently:
		// a missing row is indistinguishable from a bug, and the user has to be able
		// to disagree with the prescription. `unknown` means the item is not in the
		// ladder — those still generate, because unknown is not the same as wrong.
		const overInvested: string[] = [];
		const wanted: number[] = [];
		for (const to of [...targets].filter((t) => t <= max).sort((a, b) => a - b)) {
			const verdict = gearProgression.starTargetVerdict(item.name, to);
			if (verdict.verdict === 'over-invested' || verdict.verdict === 'impossible') {
				overInvested.push(`${to}★`);
				continue;
			}
			wanted.push(to);
		}
		if (overInvested.length > 0) {
			const v = gearProgression.starTargetVerdict(item.name, Math.max(...targets));
			notes.push(
				`${slot} (${item.name}): did not offer ${overInvested.join(', ')} — ` +
					`${v.why ?? 'past the stopping point for this stage.'}` +
					(v.prescribed !== undefined
						? ` The plan stops at ${v.prescribed}★${
								v.onEvent !== undefined ? ` (${v.onEvent}★ on a Star Force event)` : ''
							}.`
						: '')
			);
		}

		for (const to of wanted) {
			let delta: Delta;
			let mesos: number;
			try {
				delta = starDelta(cls, item, from, to, kind);
				// Heroic assumptions: Enhancement Mode 1, no MVP discount, no star catch,
				// safeguard on wherever the game allows it (15★-17★ only).
				mesos = starforce.expectedCostToReach(item.itemLevel, from, to, { safeguard: true });
			} catch (error) {
				notes.push(
					`${slot} (${item.name}) ${from}★ → ${to}★ could not be modelled: ` +
						`${(error as Error).message}`
				);
				continue;
			}

			const starVerdict = gearProgression.starTargetVerdict(item.name, to);
			const candidateNotes = [
				'Safeguard assumed on 15★-17★; Enhancement Mode 1; no MVP discount.',
				...(starVerdict.verdict === 'event-only' && starVerdict.why ? [starVerdict.why] : []),
				...unknownItemNote(caps)
			];
			let confidence: Confidence = 'estimated';
			if (kind === 'weapon' && to > 25) {
				confidence = 'speculative';
				candidateNotes.push('Weapon ATT above 25★ uses the UNVERIFIED_WEAPON_26_30 extrapolation.');
			}
			if (from < 15 && kind === 'weapon' && item.base?.att === undefined) {
				candidateNotes.push('Weapon has no base ATT captured, so sub-15★ ATT is undercounted.');
				confidence = weakest(confidence, 'speculative');
			}

			candidates.push({
				id: `starforce:${slot}:${from}-${to}`,
				kind: 'starforce',
				label: `${item.name} ${from}★ → ${to}★`,
				detail: `Star force ${slot} from ${from} to ${to} stars (item level ${item.itemLevel}).`,
				slot,
				itemName: item.name,
				delta,
				cost: {
					mesos: Math.round(mesos),
					note: `expected cost incl. boom replacement at 0; ${starforce
						.expectedBooms(from, to, { safeguard: true })
						.toFixed(2)} expected booms`
				},
				confidence,
				notes: candidateNotes
			});
		}
	}

	notes.push(...formatSuppressions('star force', suppressed));
	return { candidates, notes };
}

/* -------------------------------------------------------------------------- */
/* Flames                                                                      */
/* -------------------------------------------------------------------------- */

const FLAME_BANDS = ['starters', 'average', 'aboveAverage', 'minmax'] as const;
type FlameBand = (typeof FLAME_BANDS)[number];

const FLAME_BAND_LABELS: Record<FlameBand, string> = {
	starters: 'starter',
	average: 'average',
	aboveAverage: 'above-average',
	minmax: 'min-maxed'
};

// Flame eligibility used to be a hand-rolled slot list here. It now comes from
// the item catalogue (src/lib/data/items), which encodes flames.FLAME_INELIGIBLE
// plus its three named exceptions (Immortal Legacy, Scarlet Shoulder, Ancient
// Slate Replica) per item rather than per slot.

function flameAdvantaged(item: Item): boolean {
	const haystack = `${item.name} ${item.setName ?? ''}`.toLowerCase();
	return ['eternal', 'arcane umbra', 'absolab', 'fafnir', 'dawn', 'pitched', 'dark boss'].some(
		(needle) => haystack.includes(needle)
	);
}

function generateFlame(character: Character): CandidateResult {
	const cls = getClass(character.classId);
	const main = mainStatOf(cls);
	const candidates: UpgradeCandidate[] = [];
	const notes: string[] = [];
	const suppressed: Suppression[] = [];

	if (!main) {
		return {
			candidates,
			notes: [`${cls.name} has no STR/DEX/INT/LUK main stat, so flame score does not apply.`]
		};
	}

	// The published benchmarks use the StrategyWiki convention, so score against
	// that one (flames.ts FLAME_SCORE_BENCHMARKS).
	const weights = flames.FLAME_SCORE_CONVENTIONS.strategywiki;
	const xenon = cls.flags?.xenon === true;

	for (const [slot, item] of Object.entries(character.equipment ?? {})) {
		if (!item) continue;

		const caps = capsFor(slot, item);
		if (!caps.canFlame) {
			suppressed.push({ slot, itemName: item.name, reason: capabilityReasons(caps, 'flame') });
			continue;
		}
		if (item.itemLevel === undefined) continue;

		if (item.category === 'weapon') {
			notes.push(
				`${slot} (${item.name}): weapon flames are a percentage of base ATT, not a flat ` +
					'roll, so flame score is meaningless there (flames.ts) and no flame candidate ' +
					'was generated.'
			);
			continue;
		}

		const advantaged = flameAdvantaged(item);
		const benchmark = flames.flameBenchmark(item.itemLevel, advantaged, xenon);
		if (!benchmark) continue;

		const block: flames.FlameBlock = item.flame ?? {};
		const current = flames.flameScore(
			block,
			xenon ? { main, secondary: ['str', 'dex', 'luk'] } : main,
			weights
		);

		const band = FLAME_BANDS.find((b) => benchmark[b] > current + 1);
		if (!band) continue;

		const gain = benchmark[band] - current;
		// formulas.md §3.2: "gaining 1 Flame score represents the same increase in
		// output as gaining 1 Main Stat" — and a flame is a "% applied" gear stat.
		const delta: Delta = { mainFlat: gain };

		const flameCount = flames.FLAME_SCORE_BENCHMARKS.flamesToReachPowerful[band];
		const cost: UpgradeCost =
			flameCount === null
				? {
						note:
							'Reaching the min-max band needs Eternal Rebirth Flames, which are boss-drop ' +
							'only in Heroic — no meso price exists.'
					}
				: {
						mesos: flameCount * flames.FLAME_SOURCES_HEROIC.powerfulRebirthFlameMesoPrice,
						note: `${flameCount} Powerful Rebirth Flames at 9.5M each`
					};

		candidates.push({
			id: `flame:${slot}:${band}`,
			kind: 'flame',
			label: `${item.name} flame ${current.toFixed(0)} → ${benchmark[band]} (${FLAME_BAND_LABELS[band]})`,
			detail:
				`Reroll ${slot} flames from a score of ${current.toFixed(1)} to the ` +
				`${FLAME_BAND_LABELS[band]} benchmark for a level ${item.itemLevel} ` +
				`${advantaged ? 'flame-advantaged' : 'normal'} item.`,
			slot,
			itemName: item.name,
			delta,
			cost,
			confidence: 'estimated',
			notes: [
				'Flame score is a community convention, not a game table; scored with the ' +
					'StrategyWiki weights the benchmarks were published under.',
				item.flame
					? 'Current flames read from the item breakdown.'
					: 'No flame block captured; the current score was treated as 0.',
				...unknownItemNote(caps)
			]
		});
	}

	notes.push(...formatSuppressions('flame', suppressed));
	return { candidates, notes };
}

/* -------------------------------------------------------------------------- */
/* Potential                                                                   */
/* -------------------------------------------------------------------------- */

interface Contribution {
	mainPct: number;
	subPct: number;
	allStatPct: number;
	attPct: number;
	dmg: number;
	boss: number;
	critDmg: number;
	critRate: number;
	att: number;
	mainFlat: number;
	ied: number[];
}

function emptyContribution(): Contribution {
	return {
		mainPct: 0,
		subPct: 0,
		allStatPct: 0,
		attPct: 0,
		dmg: 0,
		boss: 0,
		critDmg: 0,
		critRate: 0,
		att: 0,
		mainFlat: 0,
		ied: []
	};
}

/** Fold one parsed line kind + value into a contribution bag. */
function addLine(
	into: Contribution,
	kind: potential.PotentialLineKind,
	value: number,
	stat: FourStat | undefined,
	cls: ClassDef
): void {
	const main = mainStatOf(cls);
	const sub = subStatOf(cls);
	switch (kind) {
		case 'stat_pct':
			if (stat && stat === main) into.mainPct += value;
			else if (stat && stat === sub) into.subPct += value;
			break;
		case 'stat_flat':
			if (stat && stat === main) into.mainFlat += value;
			break;
		case 'all_stat_pct':
			into.allStatPct += value;
			break;
		case 'att_pct':
		case 'matt_pct':
			into.attPct += value;
			break;
		case 'att_flat':
		case 'matt_flat':
			into.att += value;
			break;
		case 'boss':
			into.boss += value;
			break;
		case 'ied':
			into.ied.push(value);
			break;
		case 'damage_pct':
			into.dmg += value;
			break;
		case 'crit_rate':
			into.critRate += value;
			break;
		case 'crit_dmg':
			into.critDmg += value;
			break;
		default:
			break;
	}
}

/** `calc.parsePotentialLine` kinds -> the data module's line kinds. */
const PARSED_TO_DATA: Record<calc.PotentialKind, potential.PotentialLineKind | null> = {
	stat_pct: 'stat_pct',
	stat_flat: 'stat_flat',
	all_stat_pct: 'all_stat_pct',
	att: 'att_flat',
	att_pct: 'att_pct',
	matt: 'matt_flat',
	matt_pct: 'matt_pct',
	boss: 'boss',
	ied: 'ied',
	dmg: 'damage_pct',
	crit_rate: 'crit_rate',
	crit_dmg: 'crit_dmg',
	hp_pct: 'hp_pct',
	cooldown: 'cooldown',
	drop: 'drop',
	meso: 'meso',
	other: null
};

function contributionOf(lines: readonly string[], cls: ClassDef): Contribution {
	const out = emptyContribution();
	for (const line of calc.parsePotentialLines(lines)) {
		const kind = PARSED_TO_DATA[line.kind];
		if (!kind) continue;
		const stat = line.stat && line.stat !== 'hp' ? line.stat : undefined;
		addLine(out, kind, line.value, stat, cls);
	}
	return out;
}

function deltaBetween(current: Contribution, next: Contribution): Delta {
	const delta: Delta = {};
	const set = (key: keyof Delta, value: number): void => {
		if (Math.abs(value) > 1e-9) (delta as Record<string, unknown>)[key] = value;
	};
	set('mainPct', next.mainPct - current.mainPct);
	set('subPct', next.subPct - current.subPct);
	set('allStatPct', next.allStatPct - current.allStatPct);
	set('attPct', next.attPct - current.attPct);
	set('dmg', next.dmg - current.dmg);
	set('boss', next.boss - current.boss);
	set('critDmg', next.critDmg - current.critDmg);
	set('critRate', next.critRate - current.critRate);
	set('att', next.att - current.att);
	set('mainFlat', next.mainFlat - current.mainFlat);
	if (current.ied.length) delta.iedRemove = [...current.ied];
	if (next.ied.length) delta.iedAdd = [...next.ied];
	return delta;
}

function rankAbove(grade: potential.PotentialGrade): potential.PotentialGrade | null {
	switch (grade) {
		case 'rare':
			return 'epic';
		case 'epic':
			return 'unique';
		case 'unique':
			return 'legendary';
		case 'legendary':
			return null;
	}
}

const RANK_UP_KEY = {
	rare: 'rareToEpic',
	epic: 'epicToUnique',
	unique: 'uniqueToLegendary'
} as const;

/**
 * What is worth cubing for IN THIS SLOT.
 *
 * Keyed by the real per-slot line pool, because the pools genuinely differ:
 * gloves are the only armour that rolls Critical Damage, hats are the only slot
 * that rolls Skill Cooldown, and an emblem cannot roll Boss Damage at all. The
 * old category-keyed `potential.USEFUL_LINES` could not express any of that.
 *
 * Each goal is a target the probability model can price, plus the line kinds to
 * value it with. Two per slot where it makes sense: the result people actually
 * settle for, and the perfect one, so the ranker can show both and let the cost
 * model sort them out.
 */
interface SlotGoal {
	id: string;
	/** `{value}` is substituted with the per-line value once it is known. */
	label: string;
	/** How many lines of `kind` the goal asks for. */
	lines: number;
	/** Our valuation vocabulary. */
	kind: potential.PotentialLineKind;
	/** The pool's vocabulary for the same line, for the probability model. */
	poolKind: potentialLines.PoolLineKind | readonly potentialLines.PoolLineKind[];
	/**
	 * When set, the goal accepts any value and is valued at the WEAKEST rollable
	 * value rather than the prime. Used for goals like "3 boss-or-IED lines"
	 * where any of them is worth having.
	 */
	anyValue?: boolean;
	/**
	 * For a mixed goal, the kinds to value the lines as, in order. "3 boss-or-IED
	 * lines" is priced as three lines from {boss, ied} but valued as boss/boss/IED,
	 * because IED composes multiplicatively and stacking three of it is worth far
	 * less than two boss plus one IED.
	 */
	valueKinds?: potential.PotentialLineKind[];
	/**
	 * A SUMMED percentage across `lines` lines, which is how the community and
	 * every calculator state these goals ("21%+", "30%", "33%") — never as a
	 * per-line minimum. `minValue: 12` x3 is the 36% "double prime" target that
	 * cubing-strategy.md says nobody rolls for; the real rung is 33% = 12/12/9,
	 * which a per-line minimum cannot express at all.
	 *
	 * Stat goals summed this way count %All Stat lines, which is what makes a
	 * "fake 3L" a 30%: see `potentialLines.mainStatPercent`.
	 */
	totalPercent?: number;
}

/**
 * COST AND GAIN MUST DESCRIBE THE SAME OUTCOME.
 *
 * The first version of this asked the probability model for "3 stat lines of
 * ANY value" — which a 3% line satisfies, ~14 cubes — while valuing the result
 * at the PRIME value as though all three had rolled 12%. It then reported a
 * +28.84% gain for 159M mesos, which a user immediately (and correctly) called
 * impossible; the real cost of three prime stat lines is tens of billions.
 *
 * So a goal now carries one value that feeds BOTH sides: `minValue` on the
 * requirement the probability model prices, and the same number through
 * `addLine` when the contribution is valued. They cannot drift apart.
 */
function goalLineValue(
	goal: SlotGoal,
	grade: potential.PotentialGrade,
	itemLevel: number,
	category: potential.PotentialCategory,
	slot: string
): number | null {
	const value = potential.lineValue(grade, itemLevel, category, goal.kind, {
		slot: slot as potential.PotentialSlot
	});
	if (value === null || value === 0) return null;
	return value;
}

function slotGoals(
	group: potentialLines.PotentialPoolGroup,
	cls: ClassDef,
	itemLevel: number
): SlotGoal[] {
	const attKind: potential.PotentialLineKind = cls.usesMagicAttack ? 'matt_pct' : 'att_pct';
	const attPool: potentialLines.PoolLineKind = cls.usesMagicAttack ? 'matt_pct' : 'att_pct';
	const attWord = cls.usesMagicAttack ? '%magic attack' : '%attack';

	// cubing-strategy.md SS6: "`%` figures are for item level 151+ (all current
	// Heroic endgame gear); subtract 3 for lv 71-150 gear."
	const rung = (at151: number): number => (itemLevel >= 151 ? at151 : at151 - 3);

	const stat = (id: string, total: number, lines: number, note: string): SlotGoal => ({
		id,
		label: `${rung(total)}%+ main stat (${note})`,
		lines,
		kind: 'stat_pct',
		poolKind: 'stat_pct',
		totalPercent: rung(total)
	});

	// The armour/accessory ladder, in the order the community climbs it.
	// SS6 "Default target set": default 21%+, next rung 30% ("fake 3L"),
	// terminal 33% ("real 3L") and only on gear you will not replace.
	const statLadder = (): SlotGoal[] => [
		stat('stat21', 21, 2, '2 lines'),
		stat('stat30', 30, 3, 'fake 3L'),
		stat('stat33', 33, 3, 'real 3L')
	];

	const att = (id: string, total: number, lines: number, note: string): SlotGoal => ({
		id,
		label: `${rung(total)}%+ ${attWord} (${note})`,
		lines,
		kind: attKind,
		poolKind: attPool,
		totalPercent: rung(total)
	});

	switch (group) {
		// WSE. SS6: default is 2L ATT, NOT three prime lines.
		//
		// NOTE: the researched next rung is a MIXED goal — "2 ATT + 1 Boss" — which
		// this shape cannot express (one `poolKind` per goal). Tracked as a gap;
		// the whole-WSE 9-line budget in SS4.1 needs the same conjunction support.
		case 'weapon':
		case 'secondary':
		case 'shieldSoulRing':
			return [
				att('att2', 23, 2, '2L ATT'),
				att('att3', 33, 3, '3L ATT'),
				// Boss and IED are HARD-CAPPED at 2 lines per item (StrategyWiki,
				// quoted in cubing-strategy.md SS1): three of either is impossible,
				// and we used to offer it.
				{
					id: 'bossied2',
					label: '2 lines of boss damage or IED',
					lines: 2,
					kind: 'boss',
					poolKind: ['boss', 'ied'],
					anyValue: true,
					valueKinds: ['boss', 'ied']
				}
			];
		// An emblem's pool has NO boss-damage line at any rank (five independent
		// confirmations, cubing-strategy.md SS1).
		case 'emblem':
			return [
				att('att2', 23, 2, '2L ATT'),
				att('att3', 33, 3, '3L ATT — cheapest 3L-ATT slot'),
				{ id: 'ied2', label: '2 lines of {value}% IED', lines: 2, kind: 'ied', poolKind: 'ied' }
			];
		// Gloves are the only armour slot whose pool contains Critical Damage.
		// 3L crit damage is deliberately ABSENT: 133,100 cubes ~ 2.9T mesos, the
		// target Nate described as "maybe 5 people in all of maple story history".
		case 'gloves':
			return [
				{
					id: 'critdmg2',
					label: '2 lines of {value}% critical damage',
					lines: 2,
					kind: 'crit_dmg',
					poolKind: 'crit_dmg'
				},
				...statLadder()
			];
		// Hats are the only slot whose pool contains Skill Cooldown.
		//
		// WARNING: the cooldown goal is generated and priced, but it SCORES ZERO
		// and the ranker drops it, because cooldown buys rotation uptime and the
		// damage index models a single hit with no notion of a rotation. For a
		// cooldown-gated class (Ren notably) that understates the line badly.
		// Modelling it needs a skill rotation, which this tracker does not have.
		case 'hat':
			return [
				{
					id: 'cd2',
					label: '2 cooldown-reduction lines',
					lines: 2,
					kind: 'cooldown',
					poolKind: 'cooldown',
					anyValue: true
				},
				...statLadder()
			];
		default:
			return statLadder();
	}
}

/**
 * The potential the item would END UP with, not just the goal's lines.
 *
 * A reroll replaces all three lines, so valuing only the two or three the goal
 * names credits the item for lines it would have lost. The model here is: the
 * goal's lines at the SAME value the cost was priced at, then the item's own
 * best surviving lines of other kinds fill the remaining slots. That last part
 * is optimistic — the untargeted slots are random in reality — so the gain is
 * an upper estimate and is labelled as such.
 */
function goalContribution(
	goal: SlotGoal,
	lineValueForGoal: number,
	source: { grade: potential.PotentialGrade; lines: readonly string[] },
	cls: ClassDef,
	perKindValue?: (kind: potential.PotentialLineKind) => number | null
): Contribution | null {
	const out = emptyContribution();
	const main = mainStatOf(cls);
	let placed = 0;

	// A summed goal names a TOTAL, not a per-line value. Damage only cares about
	// the total for the additive kinds these goals use (%stat, %ATT), so credit it
	// once and mark the lines it consumed. Never route a multiplicative kind (IED)
	// through here — stacking is not summation for those.
	if (goal.totalPercent !== undefined) {
		addLine(out, goal.kind, goal.totalPercent, main, cls);
		placed = Math.min(goal.lines, 3);
	}

	for (let i = placed; i < goal.lines && placed < 3; i++) {
		const kind = goal.valueKinds?.[i] ?? goal.kind;
		const value =
			kind === goal.kind ? lineValueForGoal : (perKindValue?.(kind) ?? lineValueForGoal);
		if (value === 0) continue;
		addLine(out, kind, value, main, cls);
		placed += 1;
	}
	if (placed === 0) return null;

	// Fill the untargeted slots with the item's own best current lines that the
	// goal did not already ask for, so a reroll is never credited with keeping
	// everything AND gaining the target.
	const survivors = calc
		.parsePotentialLines(source.lines)
		.map((line) => ({ line, dataKind: PARSED_TO_DATA[line.kind] }))
		.filter(
			(entry) =>
				entry.dataKind && entry.dataKind !== goal.kind && !goal.valueKinds?.includes(entry.dataKind)
		)
		.sort((a, b) => b.line.value - a.line.value);

	for (const { line, dataKind } of survivors) {
		if (placed >= 3) break;
		const stat = line.stat && line.stat !== 'hp' ? line.stat : undefined;
		addLine(out, dataKind as potential.PotentialLineKind, line.value, stat, cls);
		placed += 1;
	}

	return out;
}

/** Three "useful" lines for a category at a grade (potential.USEFUL_LINES). */
function usefulContribution(
	category: potential.PotentialCategory,
	grade: potential.PotentialGrade,
	itemLevel: number,
	slot: string,
	cls: ClassDef
): { contribution: Contribution; kinds: potential.PotentialLineKind[] } {
	const out = emptyContribution();
	const kinds: potential.PotentialLineKind[] = [];
	const main = mainStatOf(cls);
	const slotOpt = { slot: slot as potential.PotentialSlot };

	for (const kind of potential.USEFUL_LINES[category]) {
		if (kinds.length >= 3) break;
		if (kind === 'matt_pct' && !cls.usesMagicAttack) continue;
		if (kind === 'att_pct' && cls.usesMagicAttack) continue;
		const value = potential.lineValue(grade, itemLevel, category, kind, slotOpt);
		if (value === null || value === 0) continue;
		kinds.push(kind);
		addLine(out, kind, value, main, cls);
	}
	return { contribution: out, kinds };
}

/**
 * Crossing a set threshold.
 *
 * This is the one gear system whose effect does NOT cancel out of a ratio
 * comparison, and it is invisible in every per-item view: two more Boss
 * Accessory pieces are worth a flat Boss Damage +10% no matter what those
 * pieces individually roll. The delta is real and sourced; the COST is not
 * modelled, because acquiring a specific boss drop is a farming problem rather
 * than a meso price, so these rank on gain alone.
 */
function generateSetCompletion(character: Character): CandidateResult {
	const cls = getClass(character.classId);
	const candidates: UpgradeCandidate[] = [];
	const notes: string[] = [];

	for (const progress of setProgress(character)) {
		if (progress.next === undefined || !progress.nextEffect) continue;
		const delta = setEffectToDelta(progress.nextEffect, cls);
		if (Object.keys(delta).length === 0) continue;

		const missing = progress.missing ?? 0;
		candidates.push({
			id: `set:${progress.name}:${progress.next}`,
			kind: 'set',
			label: `${progress.name} ${progress.count} → ${progress.next} pieces`,
			detail:
				`Equip ${missing} more ${missing === 1 ? 'piece' : 'pieces'} of the ${progress.name} ` +
				`to unlock its ${progress.next}-set effect.`,
			delta,
			cost: {
				note:
					`${missing} more ${missing === 1 ? 'piece' : 'pieces'}. Not meso-priced: these are ` +
					'boss drops, so the cost is farming time rather than a purchase.'
			},
			confidence: progress.partial ? 'speculative' : 'sourced',
			feasibility: 'grind',
			notes: progress.partial
				? [
						`Set effects for ${progress.name} came only from the item manifest, which omits ` +
							'boss damage and ignore-enemy-defence — this UNDERSTATES the real gain.'
					]
				: undefined
		});
	}

	if (candidates.length === 0) {
		notes.push('No set is one threshold away, or no set effect data covers the sets worn.');
	}
	return { candidates, notes };
}

function generatePotential(character: Character, type: 'main' | 'bonus'): CandidateResult {
	const cls = getClass(character.classId);
	const candidates: UpgradeCandidate[] = [];
	const notes: string[] = [];
	const suppressed: Suppression[] = [];

	if (type === 'bonus' && !potential.BONUS_POTENTIAL_AVAILABLE_IN_HEROIC) {
		return {
			candidates,
			notes: [
				'Bonus potential candidates were skipped: potential.ts sets ' +
					'BONUS_POTENTIAL_AVAILABLE_IN_HEROIC = false — bonus potential does not exist in ' +
					'Heroic/Reboot worlds, which is the only world scope this tracker models (design §2).'
			]
		};
	}

	for (const [slot, item] of Object.entries(character.equipment ?? {})) {
		if (!item) continue;
		const category = POTENTIAL_CATEGORIES[item.category];
		if (!category) continue;

		// The catalogue gate: medals, most badges, pocket items, androids and
		// totems never take potential, and neither do a handful of named rings.
		const caps = capsFor(slot, item);
		if (!caps.canPotential) {
			suppressed.push({
				slot,
				itemName: item.name,
				reason: capabilityReasons(caps, type === 'main' ? 'potential' : 'bonusPotential')
			});
			continue;
		}

		const source = type === 'main' ? item.potential : item.bonusPotential;
		if (!source || item.itemLevel === undefined) continue;

		const current = contributionOf(source.lines, cls);
		const kind: UpgradeKind = type === 'main' ? 'potential' : 'bonus-potential';

		// (a) rank up, keeping the same line kinds at the higher grade's values.
		const next = rankAbove(source.grade);
		if (next) {
			const upgraded = emptyContribution();
			for (const line of calc.parsePotentialLines(source.lines)) {
				const dataKind = PARSED_TO_DATA[line.kind];
				if (!dataKind) continue;
				const stat = line.stat && line.stat !== 'hp' ? line.stat : undefined;
				const value =
					potential.lineValue(next, item.itemLevel, category, dataKind, {
						slot: slot as potential.PotentialSlot
					}) ?? line.value;
				addLine(upgraded, dataKind, Math.max(value, line.value), stat, cls);
			}
			const rateKey = source.grade === 'legendary' ? undefined : RANK_UP_KEY[source.grade];
			const rate = rateKey ? potential.UNVERIFIED_GMS_RANK_UP_RATES.bright[rateKey] : null;
			const cubes = rate ? Math.ceil(1 / rate) : undefined;
			candidates.push({
				id: `${kind}:${slot}:rank-up`,
				kind,
				label: `${item.name} potential ${source.grade} → ${next}`,
				detail: `Rank ${slot} up to ${next}, keeping the same line kinds at the higher tier.`,
				slot,
				itemName: item.name,
				delta: deltaBetween(current, upgraded),
				cost: {
					mesos: cubes ? cubes * potential.HEROIC_CUBE_PRICES.bright : undefined,
					note: cubes
						? `${cubes} Bright cubes at ${potential.HEROIC_CUBE_PRICES.bright / 1e6}M (1/rank-up rate)`
						: 'No published rank-up rate for this grade.'
				},
				confidence: 'speculative',
				notes: [
					'Rank-up rates are UNVERIFIED_GMS_RANK_UP_RATES — they predate the v239 cube rework.',
					'Assumes the new grade rolls the same line kinds, which is optimistic.',
					...unknownItemNote(caps)
				]
			});
		}

		// (b) reroll to the lines that are actually worth chasing IN THIS SLOT.
		//
		// Pools are per SLOT, not per broad category: gloves are the only armour
		// that rolls Critical Damage, hats are the only slot that rolls cooldown,
		// and an emblem CANNOT roll Boss Damage at all (p = 0). Cost comes from
		// the real pools in `potential-lines.ts`, not `1 / triplePrime` — that old
		// basis priced three specific crit-damage lines on gloves at 2.2B when the
		// true expectation is 2.9 TRILLION, a factor of 1,331.
		const group = potentialLines.poolGroupForSlot(slot);
		if (group && item.itemLevel !== undefined && source.grade !== 'rare') {
			for (const goal of slotGoals(group, cls, item.itemLevel)) {
				// ONE value drives both sides. `minValue` is what the probability
				// model prices, and the same number is what `goalContribution` credits
				// — so the cost can never describe a cheaper outcome than the gain.
				const summed = goal.totalPercent !== undefined;
				const value =
					goal.anyValue || summed
						? undefined
						: goalLineValue(goal, source.grade, item.itemLevel, category, slot);
				if (!goal.anyValue && !summed && value === null) continue;

				// A multi-line STAT requirement must name the stat it wants. Without
				// it, STR/DEX/INT/LUK count interchangeably and a roll of
				// STR+12 / DEX+12 / LUK+9 would satisfy "3 stat lines" — worth
				// nothing to a real character, and ~40x too cheap. Xenon is the one
				// class where every stat genuinely counts, so it opts in instead.
				// (potential-lines.ts `LineRequirement.anyStat`.)
				const statScope = cls.flags?.xenon
					? { anyStat: true as const }
					: mainStatOf(cls)
						? { stat: mainStatOf(cls) as potentialLines.PoolStat }
						: { anyStat: true as const };
				const scope = STAT_BEARING_GOAL_KINDS.has(goal.poolKind as potentialLines.PoolLineKind)
					? statScope
					: {};

				// A summed goal is what the community actually states ("33%+"), and it
				// is a DIFFERENT requirement from three lines of >=11%: 12/12/9 clears
				// 33 but fails a per-line minimum. Built by the module so stat goals
				// pick up %All Stat, which is what makes a "fake 3L" add to 30.
				let requirement: potentialLines.LineRequirement;
				if (summed) {
					const total = goal.totalPercent as number;
					if (goal.kind === 'stat_pct') {
						const main = mainStatOf(cls);
						requirement =
							cls.flags?.xenon || !main
								? { kind: ['stat_pct', 'all_stat_pct'], totalValue: total, anyStat: true }
								: potentialLines.mainStatPercent(main as potentialLines.PoolStat, total);
					} else {
						requirement = potentialLines.attackPercent(total, cls.usesMagicAttack);
					}
				} else if (value === undefined || value === null) {
					requirement = { kind: goal.poolKind, lines: goal.lines, ...scope };
				} else {
					requirement = {
						kind: goal.poolKind,
						lines: goal.lines,
						minValue: Math.abs(value),
						...scope
					};
				}
				const target: potentialLines.PotentialTarget = [requirement];

				// Validate OUTSIDE the try below. An ambiguous target is a bug in
				// this file, not a missing pool, and the catch would otherwise turn
				// it into a silently absent candidate — which is exactly how every
				// stat goal once vanished from the board without a word.
				potentialLines.validateTarget(target);

				const contribution = goalContribution(
					goal,
					value ?? goalLineValue(goal, source.grade, item.itemLevel, category, slot) ?? 0,
					source,
					cls
				);
				if (!contribution) continue;

				let cost: potentialLines.CubeCost;
				try {
					cost = potentialLines.cheapestCubeFor(
						{ group, itemLevel: item.itemLevel, grade: source.grade as potentialLines.PoolGrade },
						target
					);
				} catch {
					// The pools are only published above a per-group item level; the
					// module throws rather than extrapolating, and so do we.
					continue;
				}
				if (!Number.isFinite(cost.expectedCubes)) continue;

				const label = `${item.name} → ${goal.label.replace('{value}', String(Math.abs(value ?? 0)))}`;

				candidates.push({
					id: `${kind}:${slot}:goal:${goal.id}`,
					kind,
					label,
					detail: `Cube ${slot} at ${source.grade}. ~${Math.round(
						cost.expectedCubes
					).toLocaleString()} ${cost.cube} cubes expected, median ${cost.medianCubes.toLocaleString()}.`,
					slot,
					itemName: item.name,
					delta: deltaBetween(current, contribution),
					cost: {
						mesos: cost.expectedMesos ?? undefined,
						note:
							`Expected cost from the ${group} line pool: 1 in ` +
							`${Math.round(1 / cost.probability).toLocaleString()} cubes. ` +
							`Median ${cost.medianCubes.toLocaleString()}, 95th percentile ` +
							`${cost.p95Cubes.toLocaleString()}.`
					},
					confidence: 'estimated',
					feasibility: cost.expectedCubes > 5000 ? 'ceiling' : 'grind',
					notes: [
						...(cost.expectedCubes > 5000
							? [
									'Priced but effectively unreachable — shown as a ceiling so it cannot ' +
										'outrank an achievable action.'
								]
							: []),
						'Gain is an UPPER estimate: the lines the goal does not name are random ' +
							'in reality, and are modelled as keeping your current best.',
						...unknownItemNote(caps)
					]
				});
			}
		}
	}

	notes.push(...formatSuppressions(type === 'main' ? 'potential' : 'bonus potential', suppressed));
	return { candidates, notes };
}

/* -------------------------------------------------------------------------- */
/* Symbols                                                                     */
/* -------------------------------------------------------------------------- */

/** Character-schema region ids -> data-module region ids. */
const ARCANE_REGION_MAP: Record<ArcaneRegion, symbols.ArcaneRegion> = {
	vanishingJourney: 'vanishing_journey',
	chuchu: 'chu_chu_island',
	lachelein: 'lachelein',
	arcana: 'arcana',
	morass: 'morass',
	esfera: 'esfera'
};

const SACRED_REGION_MAP: Record<SacredRegion, symbols.SacredRegion | null> = {
	cernium: 'cernium',
	hotelArcus: 'arcus',
	odium: 'odium',
	shangrila: 'shangri_la',
	arteria: 'arteria',
	carcion: 'carcion',
	// Tallahart is a GRAND Sacred symbol: EXP / meso / drop only, no main stat.
	tallahart: null
};

function generateSymbols(character: Character): CandidateResult {
	const cls = getClass(character.classId);
	const candidates: UpgradeCandidate[] = [];
	const notes: string[] = [];

	if (cls.flags?.demonAvenger) {
		return {
			candidates,
			notes: [
				'Demon Avenger symbols grant Max HP rather than main stat, and `Delta` has no HP ' +
					'channel, so no symbol candidates were generated.'
			]
		};
	}
	const xenon = cls.flags?.xenon === true;

	for (const [region, rawLevel] of Object.entries(character.symbols?.arcane ?? {})) {
		const dataRegion = ARCANE_REGION_MAP[region as ArcaneRegion];
		if (!dataRegion) continue;
		const from = rawLevel ?? 0;
		if (from >= symbols.ARCANE_MAX_LEVEL) continue;

		for (const to of new Set([from + 1, symbols.ARCANE_MAX_LEVEL])) {
			if (to <= from) continue;
			const stat = xenon
				? symbols.arcaneXenonStatEach(to) - symbols.arcaneXenonStatEach(from)
				: symbols.arcaneMainStat(to) - symbols.arcaneMainStat(from);
			const force = symbols.arcaneForce(to) - symbols.arcaneForce(from);
			candidates.push({
				id: `symbol:arcane:${region}:${from}-${to}`,
				kind: 'symbol',
				label: `${symbols.ARCANE_REGIONS[dataRegion].name} symbol Lv${from} → Lv${to}`,
				detail: `+${stat} main stat (final channel) and +${force} Arcane Force.`,
				// Symbols are "% not applied" final stat (formulas.md §1.2).
				delta: { mainFinal: stat, arcane: force },
				cost: {
					days: symbols.arcaneDaysToReach(dataRegion, from, to),
					mesos:
						symbols.arcaneMesoToReach(to, dataRegion) - symbols.arcaneMesoToReach(from, dataRegion),
					note: `daily quest "${symbols.ARCANE_REGIONS[dataRegion].dailyQuest}" at the ${symbols.DEFAULT_SYMBOL_RATE_SET} rate set`
				},
				confidence: 'sourced'
			});
		}
	}

	for (const [region, rawLevel] of Object.entries(character.symbols?.sacred ?? {})) {
		const dataRegion = SACRED_REGION_MAP[region as SacredRegion];
		if (!dataRegion) {
			notes.push(
				`${region} is a Grand Sacred symbol: it grants EXP / meso / drop rate, not main ` +
					'stat or force, so it contributes no boss damage.'
			);
			continue;
		}
		const from = rawLevel ?? 0;
		if (from >= symbols.SACRED_MAX_LEVEL) continue;

		for (const to of new Set([from + 1, symbols.SACRED_MAX_LEVEL])) {
			if (to <= from) continue;
			const stat = xenon
				? symbols.sacredXenonStatEach(to) - symbols.sacredXenonStatEach(from)
				: symbols.sacredMainStat(to) - symbols.sacredMainStat(from);
			const force = symbols.sacredForce(to) - symbols.sacredForce(from);
			candidates.push({
				id: `symbol:sacred:${region}:${from}-${to}`,
				kind: 'symbol',
				label: `${symbols.SACRED_REGIONS[dataRegion].name} symbol Lv${from} → Lv${to}`,
				detail: `+${stat} main stat (final channel) and +${force} Sacred Force.`,
				delta: { mainFinal: stat, sacred: force },
				cost: {
					days: symbols.sacredDaysToReach(dataRegion, from, to),
					mesos:
						symbols.sacredMesoToReach(to, dataRegion) - symbols.sacredMesoToReach(from, dataRegion),
					note: `daily quest at the ${symbols.DEFAULT_SYMBOL_RATE_SET} rate set`
				},
				confidence: 'sourced'
			});
		}
	}

	return { candidates, notes };
}

/* -------------------------------------------------------------------------- */
/* Hyper stats                                                                 */
/* -------------------------------------------------------------------------- */

/** Character-schema hyper keys -> data-module hyper keys, damage-relevant only. */
const HYPER_MAP: Partial<Record<HyperStatKey, hyperstats.HyperStatKey>> = {
	str: 'str',
	dex: 'dex',
	int: 'int',
	luk: 'luk',
	criticalRate: 'criticalRate',
	criticalDamage: 'criticalDamage',
	ignoreDefense: 'ignoreDefense',
	damage: 'damage',
	bossDamage: 'bossDamage',
	attMatt: 'attack',
	arcaneForce: 'arcaneForce'
};

function hyperDelta(
	key: hyperstats.HyperStatKey,
	amount: number,
	cls: ClassDef
): Delta | undefined {
	const main = mainStatOf(cls);
	const sub = subStatOf(cls);
	switch (key) {
		case 'str':
		case 'dex':
		case 'int':
		case 'luk':
			// Hyper stats are "final" stat — never multiplied by %stat (§1.2).
			if (key === main) return { mainFinal: amount };
			if (key === sub) return { subFinal: amount };
			return undefined;
		case 'criticalRate':
			return { critRate: amount };
		case 'criticalDamage':
			return { critDmg: amount };
		case 'ignoreDefense':
			// §1.8 — the hyper IED line is its own source and composes.
			return { iedAdd: [amount] };
		case 'damage':
			return { dmg: amount };
		case 'bossDamage':
			return { boss: amount };
		case 'attack':
			return { att: amount };
		case 'arcaneForce':
			return { arcane: amount };
		default:
			return undefined;
	}
}

function generateHyperStats(character: Character, target: NamedTarget): CandidateResult {
	const cls = getClass(character.classId);
	const candidates: UpgradeCandidate[] = [];
	const notes: string[] = [];

	if (character.level < hyperstats.HYPER_STAT_UNLOCK_LEVEL) {
		return {
			candidates,
			notes: [`Hyper stats unlock at level ${hyperstats.HYPER_STAT_UNLOCK_LEVEL}.`]
		};
	}

	for (const [schemaKey, dataKey] of Object.entries(HYPER_MAP) as [
		HyperStatKey,
		hyperstats.HyperStatKey
	][]) {
		if (dataKey === 'arcaneForce' && target.arcaneReq === undefined) continue;

		const from = character.hyperStats?.[schemaKey] ?? 0;
		const spec = hyperstats.HYPER_STATS[dataKey];
		if (from >= spec.maxLevel) continue;
		const to = from + 1;

		const amount = hyperstats.hyperEffectDelta(dataKey, from, to);
		const delta = hyperDelta(dataKey, amount, cls);
		if (!delta) continue;

		candidates.push({
			id: `hyper-stat:${schemaKey}:${from}-${to}`,
			kind: 'hyper-stat',
			label: `Hyper ${spec.label} Lv${from} → Lv${to}`,
			detail: `+${amount}${spec.unit === 'percent' ? '%' : ''} ${spec.label}.`,
			delta,
			cost: {
				points: hyperstats.hyperCost(from, to),
				note: `you have ${hyperstats.hyperPointsAt(character.level)} hyper stat points at level ${character.level}`
			},
			confidence: 'sourced'
		});
	}

	return { candidates, notes };
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                 */
/* -------------------------------------------------------------------------- */

const ALL_KINDS: UpgradeKind[] = [
	'starforce',
	'flame',
	'potential',
	'bonus-potential',
	'symbol',
	'hyper-stat',
	'set'
];

/**
 * Every candidate upgrade for a character, unscored.
 *
 * `_input` is not read today — the generators are pure table lookups — but it
 * is part of the signature so a generator that needs current totals (a "swap
 * this line for that one" candidate, say) does not force a call-site change.
 */
export function generateCandidates(
	character: Character,
	_input: CalcInput,
	target: NamedTarget,
	options: CandidateOptions = {}
): CandidateResult {
	const wanted = new Set(options.kinds ?? ALL_KINDS);
	const candidates: UpgradeCandidate[] = [];
	const notes: string[] = [];

	const run = (kind: UpgradeKind, fn: () => CandidateResult): void => {
		if (!wanted.has(kind)) return;
		const result = fn();
		candidates.push(...result.candidates);
		notes.push(...result.notes);
	};

	run('starforce', () => generateStarforce(character, options));
	run('flame', () => generateFlame(character));
	run('potential', () => generatePotential(character, 'main'));
	run('bonus-potential', () => generatePotential(character, 'bonus'));
	run('symbol', () => generateSymbols(character));
	run('hyper-stat', () => generateHyperStats(character, target));
	run('set', () => generateSetCompletion(character));

	return { candidates, notes };
}
