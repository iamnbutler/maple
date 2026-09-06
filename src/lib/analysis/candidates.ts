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
import * as hyperstats from '$lib/data/hyperstats';
import * as potential from '$lib/data/potential';
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

import type { Confidence, NamedTarget, UpgradeCost, UpgradeKind } from './types';

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
	const breakpoints = opts.breakpoints ?? STAR_BREAKPOINTS;

	for (const [slot, item] of Object.entries(character.equipment ?? {})) {
		if (!item) continue;
		if (!STAR_FORCEABLE_CATEGORIES.includes(item.category)) continue;

		if (item.superior) {
			// starforce.ts: "Superior gear is out of scope here — it still loses a star on
			// failure and has Chance Time", so `expectedCostToReach` would be wrong.
			notes.push(
				`${slot} (${item.name}) is Superior/Tyrant gear: the star force cost chain does not ` +
					'model Chance Time or star loss on failure, so no star force candidates were ' +
					'generated for it.'
			);
			continue;
		}
		if (item.itemLevel === undefined || item.starforce === undefined) continue;

		const kind = starForceKind(slot, item.category);
		const max = starforce.maxStars(item.itemLevel, false);
		const from = item.starforce;
		if (from >= max) continue;

		const targets = new Set<number>([from + 1]);
		for (const breakpoint of breakpoints) if (breakpoint > from) targets.add(breakpoint);

		for (const to of [...targets].filter((t) => t <= max).sort((a, b) => a - b)) {
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

			const candidateNotes = ['Safeguard assumed on 15★-17★; Enhancement Mode 1; no MVP discount.'];
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

/** Slots the flame pool never touches (flames.FLAME_INELIGIBLE). */
function flameEligible(slot: string, item: Item): boolean {
	if (item.category === 'secondary' || item.category === 'emblem') return false;
	if (item.category === 'badge' || item.category === 'medal') return false;
	if (item.category === 'android' || item.category === 'totem') return false;
	if (item.category === 'heart' || item.category === 'pocket') return false;
	if (slot.startsWith('ring')) return false;
	if (slot === 'shoulder') return false;
	return true;
}

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
		if (!flameEligible(slot, item)) continue;
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
					: 'No flame block captured; the current score was treated as 0.'
			]
		});
	}

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

function generatePotential(character: Character, type: 'main' | 'bonus'): CandidateResult {
	const cls = getClass(character.classId);
	const candidates: UpgradeCandidate[] = [];
	const notes: string[] = [];

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
					'Assumes the new grade rolls the same line kinds, which is optimistic.'
				]
			});
		}

		// (b) reroll to three useful lines at the current grade.
		const useful = usefulContribution(category, source.grade, item.itemLevel, slot, cls);
		if (useful.kinds.length > 0) {
			const delta = deltaBetween(current, useful.contribution);
			const odds =
				source.grade === 'legendary'
					? potential.LEGENDARY_PRIME_ODDS.bright.triplePrime
					: undefined;
			const cubes = odds ? Math.ceil(1 / odds) : undefined;
			candidates.push({
				id: `${kind}:${slot}:useful-lines`,
				kind,
				label: `${item.name} → 3 useful ${source.grade} lines`,
				detail: `Reroll ${slot} to ${useful.kinds.join(' / ')} at ${source.grade}.`,
				slot,
				itemName: item.name,
				delta,
				cost: {
					mesos: cubes ? cubes * potential.HEROIC_CUBE_PRICES.bright : undefined,
					note: cubes
						? `${cubes} Bright cubes — a LOWER BOUND: it prices a triple prime, not a ` +
							'triple prime of the three specific lines you want.'
						: 'No published triple-prime odds below Legendary.'
				},
				confidence: 'estimated',
				notes: [
					'USEFUL_LINES is an editorial judgement call, not a sourced game table.',
					'The cube count is a lower bound on the real cost.'
				]
			});
		}
	}

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
	'hyper-stat'
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

	return { candidates, notes };
}
