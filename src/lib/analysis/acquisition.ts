// Acquisition candidates — "your next step in this slot is to OBTAIN X".
//
// design §14.2 item 3: "Every generator today only improves an equipped item.
// The path requires the tool to say 'your next step is to obtain X', which no
// kind can express. `set` is the closest and it is too vague to act on — it
// says 'equip 2 more pieces' without naming the piece or where it drops."
//
// This is that generator. It is the only one that reads the item CATALOGUE for
// stats rather than the character's own tooltips, because the whole point is to
// value a piece you do not own and therefore cannot have captured.
//
// ---------------------------------------------------------------------------
// TWO RULES DECIDE EVERYTHING HERE
// ---------------------------------------------------------------------------
//
// 1. AN ACQUISITION IS OBTAIN **PLUS INVEST**, NEVER OBTAIN ALONE.
//
//    A freshly farmed AbsoLab shoulder is 0★ with no potential and no flame. On
//    a character wearing a 12★ Royal Black Metal Shoulder that is a straight
//    DOWNGRADE, so a bare-swap candidate scores negative — and `rank.ts` drops
//    everything at or below zero, which means the single most important action
//    on the whole progression path would vanish from the board without a word.
//
//    So the unit of advice is the piece taken to the stage's PRESCRIBED STOPPING
//    POINT: N★, the planned potential grade, the planned flame band. That is a
//    real, bounded action with a real price, and it is what the guides actually
//    tell you to do. The interim dip is reported in `notes`, not hidden.
//
// 2. SET EFFECTS MOVE IN BOTH DIRECTIONS.
//
//    Replacing a Dominator Pendant with a Superior Gollux Pendant does not just
//    add a Gollux piece — it REMOVES a Boss Accessory piece, and if that drops
//    the count under a threshold the character loses the whole effect. That loss
//    is invisible in every per-item view and it is frequently larger than the
//    stat gain on the piece itself. `sets.setChangesForSwap` computes both ends
//    and both are folded into the delta.
//
// ---------------------------------------------------------------------------
// WHAT THIS DELIBERATELY DOES NOT DO
// ---------------------------------------------------------------------------
//  * It never proposes Pitched or Brilliant gear (`stage.outOfScope`). design
//    §14.3: "don't you dare start putting pitched in the list of upgrades".
//  * It never proposes filling an EMPTY slot with a concrete stage, because the
//    ladder is ordered by tier and nothing in the data says which rung a bare
//    slot should start at. Empty slots get a note naming the path instead.
//  * It never invents a stopping point. Everything comes from
//    `gear-progression.ts`, which is research-owned.

import { getClass, type ClassDef } from '$lib/data/classes';
import * as flames from '$lib/data/flames';
import * as gearProgression from '$lib/data/gear-progression';
import {
	CATALOGUE,
	capabilities,
	catalogueSlot,
	resolveByName,
	type CatalogueEntry,
	type CatalogueSlot
} from '$lib/data/items';
import * as potential from '$lib/data/potential';
import * as potentialLines from '$lib/data/potential-lines';
import * as starforce from '$lib/data/starforce';
import type { Delta } from '$lib/calc/types';
import type { Character, Item, ItemCategory } from '$lib/schema';

import {
	addLine,
	addStatBlock,
	contributionOf,
	deltaBetween,
	emptyContribution,
	mainStatOf,
	usefulContribution,
	type Contribution
} from './contribution';
import {
	describeSetChange,
	mergeDelta,
	setChangesForSwap,
	setChangesToDelta,
	setCounts,
	type SetCountChange
} from './sets';
import { getSet, nextThreshold } from '$lib/data/sets';
import type { Confidence, UpgradeCost } from './types';

/* -------------------------------------------------------------------------- */
/* Transfer Hammer                                                             */
/*                                                                             */
/* The single biggest cost lever on this whole generator, and the reason the    */
/* ladder prescribes Epic potential on stepping-stone gear at all.              */
/*                                                                             */
/* Rules, quoted from the MapleSEA official wiki entry for Todd's Hammer        */
/* (https://www.maplesea.com/wiki/Equipment/ToddsHammer):                       */
/*   * level: "the Receiving Equipment must be in the level range of 1 to 10 of */
/*     the Base Equipment" for equipment over level 100; 1 to 20 when the       */
/*     extracting equipment is level 99 and below;                              */
/*   * stars: "Star Force Enhancement level decreases by 1 upon transfer";      */
/*   * potential: "Epic and lower grade Potentials ... will be retained, while  */
/*     higher grades will be decreased to their Epic rank equivalents";         */
/*   * category: "Only the same equipment category can be transferred."         */
/*                                                                             */
/* ⚠️ SOURCES DISAGREE on the low-level exception: a StrategyWiki summary says  */
/* the 1-to-20 band applies at level 119 and below rather than 99. Every item   */
/* on this tracker's ladder is level 120+, where both readings agree on 1-to-10,*/
/* so the tracker uses the stricter MapleSEA text and the disagreement cannot   */
/* change an answer.                                                            */
/*                                                                             */
/* This rule is what makes the model reproduce the guides on its own: CRA (150) */
/* -> AbsoLab (160) and Dominator (140) -> Superior Gollux (150) are both a gap */
/* of exactly 10 and hammer through, while AbsoLab (160) -> Arcane Umbra (200)  */
/* is a gap of 40 and does not. That is precisely why the research says AbsoLab */
/* is "replaced" and Gollux is "transfer-hammered into".                        */
/* -------------------------------------------------------------------------- */

/** design note: over level 100 the receiving item must be 1-10 levels above. */
export const TRANSFER_HAMMER = {
	maxLevelGap: 10,
	maxLevelGapBelow100: 20,
	lowLevelThreshold: 99,
	starsLost: 1,
	potentialCappedAt: 'epic',
	source: 'https://www.maplesea.com/wiki/Equipment/ToddsHammer'
} as const;

export interface TransferVerdict {
	eligible: boolean;
	/** Stars the receiving item starts at. Only meaningful when `eligible`. */
	stars: number;
	why: string;
}

/**
 * Can the currently equipped item be hammered into the next stage's item?
 *
 * `undefined` stars on the source is NOT treated as zero — an uncaptured star
 * count means unknown, and an unknown source cannot be assumed hammerable.
 */
export function transferVerdict(from: Item, to: CatalogueEntry): TransferVerdict {
	const no = (why: string): TransferVerdict => ({ eligible: false, stars: 0, why });

	if (from.itemLevel === undefined) return no('the current item has no captured item level');
	if (from.starforce === undefined) return no('the current item has no captured star count');
	if (from.starforce < 1) return no('transfer needs at least 1★ on the extracting item');
	if (!to.canStarforce) return no(`${to.name} cannot take star force`);

	const gap = to.itemLevel - from.itemLevel;
	const allowed =
		from.itemLevel <= TRANSFER_HAMMER.lowLevelThreshold
			? TRANSFER_HAMMER.maxLevelGapBelow100
			: TRANSFER_HAMMER.maxLevelGap;
	if (gap < 1 || gap > allowed) {
		return no(
			`${to.name} is level ${to.itemLevel} and ${from.name} is level ${from.itemLevel} — ` +
				`a transfer needs the receiving item 1 to ${allowed} levels above, and this gap is ${gap}`
		);
	}

	return {
		eligible: true,
		stars: Math.max(from.starforce - TRANSFER_HAMMER.starsLost, 0),
		why:
			`${from.name} (${from.starforce}★) can be transfer-hammered into ${to.name}, which ` +
			`arrives at ${from.starforce - TRANSFER_HAMMER.starsLost}★`
	};
}

/* -------------------------------------------------------------------------- */
/* Stage -> concrete item                                                      */
/* -------------------------------------------------------------------------- */

/**
 * WZ job bitmask, from `CatalogueEntry.reqJob`.
 *
 * Xenon is `thief-pirate` because it can equip either branch; it is given both
 * bits so a Xenon acquisition is not silently starved of candidates.
 */
const JOB_BIT: Record<string, number> = {
	warrior: 1,
	magician: 2,
	bowman: 4,
	thief: 8,
	pirate: 16,
	'thief-pirate': 8 | 16
};

/** The `(Warrior)` / `(Magician)` suffix the catalogue puts on branch sets. */
const BRANCH_SUFFIX: Record<string, string> = {
	warrior: 'Warrior',
	magician: 'Magician',
	bowman: 'Bowman',
	thief: 'Thief',
	pirate: 'Pirate',
	'thief-pirate': 'Thief'
};

/**
 * Narrow a weapon or secondary pool to the types this class actually holds.
 * Every other slot passes through untouched.
 */
function byWeaponType(
	entries: readonly CatalogueEntry[],
	slot: CatalogueSlot,
	cls: ClassDef
): CatalogueEntry[] {
	if (slot !== 'weapon' && slot !== 'secondary') return [...entries];

	const wanted =
		slot === 'weapon'
			? [...(cls.weapons?.catalogueWeaponTypes ?? []), cls.weapons?.weaponType, cls.weaponType]
			: [cls.weapons?.secondaryType, cls.secondaryType];
	const names = new Set(wanted.filter((n): n is string => Boolean(n)));
	// No known type for this class in this dump: skip the check, do not warn.
	if (names.size === 0) return [...entries];

	return entries.filter((e) => e.weaponType !== undefined && names.has(e.weaponType));
}

function jobFits(entry: CatalogueEntry, cls: ClassDef): boolean {
	if (entry.reqJob === undefined) return true;
	const bits = JOB_BIT[cls.jobType] ?? 0;
	return (entry.reqJob & bits) !== 0;
}

/** Anchored, word-boundary prefix match on a normalised name. */
function hasPrefix(name: string, prefix: string): boolean {
	const lowerName = name.toLowerCase();
	const lowerPrefix = prefix.toLowerCase();
	if (!lowerName.startsWith(lowerPrefix)) return false;
	const next = lowerName[lowerPrefix.length];
	return next === undefined || next === ' ' || next === "'" || next === '-';
}

export interface StageItemResolution {
	entry?: CatalogueEntry;
	/** Why nothing resolved, for a note. Absent on success. */
	why?: string;
	/** Other entries that matched equally well, for an ambiguity note. */
	alternatives: CatalogueEntry[];
}

/**
 * The concrete catalogue item a stage means FOR THIS CLASS.
 *
 * A stage is often a family — "AbsoLab Set" is five different armour pieces per
 * slot, one per job branch — so the branch has to be picked before the item has
 * any stats at all. `reqJob` is the authority; the `(Warrior)` set-name suffix
 * is the tie-breaker when several entries share the bitmask.
 *
 * An unresolvable stage returns `why` and is REPORTED, never silently skipped:
 * Ren, Mo Xuan, Sia Astelle and Erel Light all postdate the v270 dump, so their
 * weapons genuinely are not in the catalogue, and a user needs to be told that
 * rather than shown an empty slot row.
 */
export function resolveStageItem(
	stage: gearProgression.PathStage,
	slot: CatalogueSlot,
	cls: ClassDef
): StageItemResolution {
	const pool: CatalogueEntry[] = [];

	if (stage.nameKind === 'item') {
		const { entries } = resolveByName(stage.name, slot);
		pool.push(...entries.filter((e) => e.slot === slot));
	}

	if (pool.length === 0) {
		const names = new Set([stage.name, ...(stage.examples ?? [])].map((n) => n.toLowerCase()));
		const sets = stage.match?.sets ?? (stage.setName ? [stage.setName] : []);
		const prefixes = stage.match?.prefixes ?? [];

		for (const entry of CATALOGUE) {
			if (entry.slot !== slot) continue;
			if (stage.itemLevel !== undefined && entry.itemLevel !== stage.itemLevel) continue;
			const byName = names.has(entry.name.toLowerCase());
			const bySet = entry.setName !== undefined && sets.some((s) => entry.setName?.startsWith(s));
			const byPrefix = prefixes.some((p) => hasPrefix(entry.name, p));
			if (byName || bySet || byPrefix) pool.push(entry);
		}
	}

	if (pool.length === 0) {
		return {
			alternatives: [],
			why:
				`no ${slot} in the GMS v270 catalogue matches the "${stage.name}" stage. The dump ` +
				'predates Ren, Mo Xuan, Sia Astelle and Erel Light, so an absence here means ' +
				'UNKNOWN, not that the item does not exist.'
		};
	}

	const fitting = pool.filter((e) => jobFits(e, cls));
	if (fitting.length === 0) {
		return {
			alternatives: pool,
			why:
				`every catalogue match for the "${stage.name}" stage in ${slot} requires a job ` +
				`branch ${cls.name} cannot equip.`
		};
	}

	// WEAPON AND SECONDARY NEED THE TYPE, NOT JUST THE BRANCH.
	//
	// The job bitmask is far too coarse here. Every explorer-archer Princess No
	// secondary carries `reqJob: 4`, so a Wind Archer — a bowman who holds a
	// JEWEL — matched "Princess No's Accursed Arrow" (a Magic Arrow) and was told
	// to obtain an item it cannot equip. The catalogue's `weaponType` is the
	// discriminator, and `CLASS_WEAPONS.catalogueWeaponTypes` exists precisely
	// because those labels differ from the in-game names.
	//
	// A class whose type list is EMPTY postdates the v270 dump (Ren, Mo Xuan, Sia
	// Astelle, Erel Light), and `classes.ts` says consumers "must skip the check
	// rather than warn" — so an empty list means no filtering, not no match.
	const typed = byWeaponType(fitting, slot, cls);
	if (typed.length === 0) {
		const held = slot === 'secondary' ? cls.secondaryType : cls.weaponType;
		return {
			alternatives: fitting,
			why:
				`no ${slot} on the "${stage.name}" stage is a ${held ?? 'known type'}, which is what ` +
				`${cls.name} holds. Offering one it cannot equip would be worse than offering nothing.`
		};
	}

	// Prefer the entry whose set name names this class's branch — that is what
	// separates "AbsoLab Set (Warrior)" from "(Magician)" when both carry the
	// same permissive bitmask.
	const suffix = BRANCH_SUFFIX[cls.jobType];
	const branded = typed.filter((e) => e.setName?.includes(`(${suffix})`));
	const ranked = (branded.length > 0 ? branded : typed)
		.slice()
		.sort((a, b) => b.itemLevel - a.itemLevel || a.id - b.id);

	return { entry: ranked[0], alternatives: ranked.slice(1) };
}

/* -------------------------------------------------------------------------- */
/* What the acquired item would be worth                                       */
/* -------------------------------------------------------------------------- */

function starForceKind(slot: string, category: ItemCategory): starforce.StarForceKind {
	if (category === 'weapon') return 'weapon';
	if (category === 'badge') return 'badge';
	if (slot === 'gloves') return 'glove';
	return 'armor';
}

/**
 * The flame band a stopping point prescribes, as a flame SCORE.
 *
 * formulas.md §3.2: "gaining 1 Flame score represents the same increase in
 * output as gaining 1 Main Stat", which is how `generateFlame` already values a
 * flame, so the same conversion is used here.
 *
 * `invest` maps to the `average` band (≈95th percentile) rather than the
 * min-max one: `invest` in the ladder means "worth farming Powerful Rebirth
 * Flames for", not "worth a jackpot". `opportunistic` maps to `starters`
 * (≈80th), which is what spare flames actually produce.
 */
function plannedFlameScore(
	stop: gearProgression.StopPoint,
	entry: CatalogueEntry,
	cls: ClassDef
): { score: number; band: string } | null {
	if (stop.flames === 'not-applicable' || stop.flames === 'none') return null;
	if (!entry.canFlame) return null;
	const advantaged = isFlameAdvantaged(entry);
	const benchmark = flames.flameBenchmark(entry.itemLevel, advantaged, cls.flags?.xenon === true);
	if (!benchmark) return null;
	const band = stop.flames === 'invest' ? 'average' : 'starters';
	return { score: benchmark[band as 'average' | 'starters'], band };
}

function isFlameAdvantaged(entry: CatalogueEntry): boolean {
	const haystack = `${entry.name} ${entry.setName ?? ''}`.toLowerCase();
	return ['eternal', 'arcane umbra', 'absolab', 'fafnir', 'dawn', 'pitched', 'dark boss'].some(
		(needle) => haystack.includes(needle)
	);
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

/**
 * What the plan's potential target is worth on the acquired item.
 *
 * Two shapes, in the ladder's own order of specificity:
 *  * the stage names a main-stat percentage ("Epic 6%") — that is a TOTAL
 *    across the lines, exactly as `slotGoals` treats it, so it is credited once;
 *  * otherwise the grade's best useful lines, capped at `stop.usefulLines`.
 *
 * The first shape UNDERSTATES: a 6% Epic roll usually carries two other lines
 * this does not credit. Understating an acquisition is the safe direction.
 */
function plannedPotential(
	stop: gearProgression.StopPoint,
	entry: CatalogueEntry,
	slot: string,
	category: potential.PotentialCategory,
	cls: ClassDef
): { contribution: Contribution; description: string } | null {
	if (stop.potential === 'none' || !entry.canPotential) return null;
	const grade = stop.potential as potential.PotentialGrade;

	if (stop.mainStatPct !== undefined) {
		const out = emptyContribution();
		addLine(out, 'stat_pct', stop.mainStatPct, mainStatOf(cls), cls);
		return {
			contribution: out,
			description: `${grade} potential at ${stop.mainStatPct}% main stat`
		};
	}

	const { contribution, kinds } = usefulContribution(
		category,
		grade,
		entry.itemLevel,
		slot,
		cls,
		stop.usefulLines ?? 3
	);
	if (kinds.length === 0) return null;
	return {
		contribution,
		description: `${grade} potential (${kinds.length} useful ${kinds.length === 1 ? 'line' : 'lines'})`
	};
}

/* -------------------------------------------------------------------------- */
/* Cost                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Expected mesos to cube a fresh item up to `grade`.
 *
 * Two components. The RANK-UP chain (rare -> epic -> ... -> grade) is priced off
 * `UNVERIFIED_GMS_RANK_UP_RATES`, which the data module flags as predating the
 * v239 cube rework — any candidate that uses it is downgraded to `speculative`.
 * A transfer-hammered item skips the chain entirely, because the hammer delivers
 * Epic for free, which is exactly why the ladder stops stepping-stone gear at
 * Epic.
 *
 * The LINE component prices actually hitting the prescribed main-stat total at
 * that grade, via the real pools in `potential-lines.ts`.
 */
function cubeCostTo(
	from: potential.PotentialGrade,
	stop: gearProgression.StopPoint,
	entry: CatalogueEntry,
	slot: string
): { mesos: number; usedRankUpRates: boolean; note: string } | null {
	if (stop.potential === 'none') return null;
	const target = stop.potential as potential.PotentialGrade;
	const order: potential.PotentialGrade[] = ['rare', 'epic', 'unique', 'legendary'];
	const start = order.indexOf(from);
	const end = order.indexOf(target);
	if (end < 0 || start < 0) return null;

	let mesos = 0;
	let usedRankUpRates = false;
	const parts: string[] = [];

	const RANK_UP_KEY = {
		rare: 'rareToEpic',
		epic: 'epicToUnique',
		unique: 'uniqueToLegendary'
	} as const;

	for (let i = start; i < end; i++) {
		const key = RANK_UP_KEY[order[i] as 'rare' | 'epic' | 'unique'];
		const rate = potential.UNVERIFIED_GMS_RANK_UP_RATES.bright[key];
		if (!rate) return null;
		const cubes = Math.ceil(1 / rate);
		mesos += cubes * potential.HEROIC_CUBE_PRICES.bright;
		usedRankUpRates = true;
		parts.push(`${cubes} Bright cubes ${order[i]}→${order[i + 1]}`);
	}

	// Hitting the prescribed line target at the final grade.
	const group = potentialLines.poolGroupForSlot(slot);
	if (group && stop.mainStatPct !== undefined && target !== 'rare') {
		try {
			const cost = potentialLines.cheapestCubeFor(
				{ group, itemLevel: entry.itemLevel, grade: target as potentialLines.PoolGrade },
				[{ kind: ['stat_pct', 'all_stat_pct'], totalValue: stop.mainStatPct, anyStat: true }]
			);
			if (cost.expectedMesos !== null && Number.isFinite(cost.expectedMesos)) {
				mesos += cost.expectedMesos;
				parts.push(`${cost.expectedCubes.toFixed(0)} ${cost.cube} cubes for ${stop.mainStatPct}%`);
			}
		} catch {
			// The pools are only published above a per-group item level; the module
			// throws rather than extrapolating, and so do we.
			parts.push(`no published pool for ${slot} at item level ${entry.itemLevel}`);
		}
	}

	if (mesos === 0) return null;
	return { mesos, usedRankUpRates, note: parts.join(' + ') };
}

/* -------------------------------------------------------------------------- */
/* The generator                                                               */
/* -------------------------------------------------------------------------- */

/** Shape shared with `candidates.ts` — kept structural to avoid a cycle. */
export interface AcquisitionCandidate {
	id: string;
	kind: 'acquisition';
	label: string;
	detail?: string;
	slot?: string;
	itemName?: string;
	delta: Delta;
	cost: UpgradeCost;
	confidence: Confidence;
	feasibility?: 'routine' | 'grind' | 'ceiling';
	notes?: string[];
}

export interface AcquisitionResult {
	candidates: AcquisitionCandidate[];
	notes: string[];
}

export function generateAcquisitions(character: Character): AcquisitionResult {
	const cls = getClass(character.classId);
	const candidates: AcquisitionCandidate[] = [];
	const notes: string[] = [];
	const counts = setCounts(character);
	const worn = new Set(
		Object.values(character.equipment ?? {})
			.filter((i): i is NonNullable<typeof i> => Boolean(i))
			.map((i) => i.name.toLowerCase())
	);

	for (const [slot, item] of Object.entries(character.equipment ?? {})) {
		if (!item) continue;

		const gearSlot = catalogueSlot(slot);
		if (!gearSlot) continue;

		const stage = gearProgression.stageForItem(item.name, gearSlot);
		if (!stage) {
			notes.push(
				`${slot} (${item.name}): not on any progression path we know, so no acquisition was ` +
					'offered. Unknown is not the same as finished — the ladder may simply not name it.'
			);
			continue;
		}

		// Walk FORWARD past any stage the character is already wearing elsewhere.
		//
		// Without this, a Ren wearing a Daybreak Pendant in `pendant1` is told to
		// obtain a Daybreak Pendant for `pendant2` — the ladder is per slot family
		// and does not know the other slot is already taken. You cannot wear two,
		// so the honest next step is the stage AFTER it, or nothing.
		let next = gearProgression.nextRecommendedStage(stage.id);
		let resolution: StageItemResolution | undefined;
		const skippedAsWorn: string[] = [];
		while (next) {
			resolution = resolveStageItem(next, gearSlot, cls);
			if (!resolution.entry) break;
			if (!worn.has(resolution.entry.name.toLowerCase())) break;
			skippedAsWorn.push(resolution.entry.name);
			next = gearProgression.nextRecommendedStage(next.id);
			resolution = undefined;
		}
		if (!next) {
			if (skippedAsWorn.length > 0) {
				notes.push(
					`${slot} (${item.name}): the next stage on this path is ${skippedAsWorn.join(', ')}, ` +
						'which this character already wears in another slot, and there is nothing after ' +
						'it on the path.'
				);
			}
			continue;
		}
		if (!resolution?.entry) {
			notes.push(
				`${slot}: cannot price the "${next.name}" stage — ${resolution?.why ?? 'no match'}`
			);
			continue;
		}
		const entry = resolution.entry;

		// The current item must be fully captured or the comparison is a fiction.
		// A missing tooltip block is UNKNOWN, never zero: treating it as zero would
		// value the swap as though the character were wearing nothing.
		if (!item.total) {
			notes.push(
				`${slot} (${item.name}): no tooltip totals captured, so "${entry.name}" cannot be ` +
					'compared against it. Capture the item first — an uncaptured item is not an empty slot.'
			);
			continue;
		}

		const stop = next.stop;
		const category = item.category;
		const caps = capabilities({ name: entry.name, slot: gearSlot, itemLevel: entry.itemLevel });

		/* ---------------------------------------------------------------- after */
		const after = emptyContribution();
		addStatBlock(after, entry.base, cls);
		if (!entry.base) {
			notes.push(
				`${slot}: the catalogue has no base stats for ${entry.name}, so its acquisition ` +
					'was not offered. Regenerate the catalogue if this is unexpected.'
			);
			continue;
		}

		const transfer = transferVerdict(item, entry);
		const fromStars = transfer.eligible ? transfer.stars : 0;
		const targetStars = Math.min(
			stop.stars ?? 0,
			caps.maxStarforce ?? starforce.maxStars(entry.itemLevel, entry.superior === true)
		);

		const starNotes: string[] = [];
		if (targetStars > 0 && caps.canStarforce) {
			const starKind = starForceKind(slot, category);
			const stats = starforce.cumulativeStarStats({
				itemLevel: entry.itemLevel,
				kind: starKind,
				stars: targetStars,
				baseAttack: entry.base.att,
				baseMagicAttack: entry.base.matt
			});
			// The wiki's "Class Stats" column grants the amount to STR/DEX/INT/LUK
			// each, so main and secondary both move.
			const stat = stats.stat + stats.allStat;
			after.mainFlat += stat;
			after.subFlat += stat;
			after.att += cls.usesMagicAttack ? stats.matt : stats.att;
		}

		const flame = plannedFlameScore(stop, entry, cls);
		if (flame) after.mainFlat += flame.score;

		const potentialCategory = POTENTIAL_CATEGORIES[category];
		const planned = potentialCategory
			? plannedPotential(stop, entry, slot, potentialCategory, cls)
			: null;
		if (planned) {
			after.mainPct += planned.contribution.mainPct;
			after.subPct += planned.contribution.subPct;
			after.allStatPct += planned.contribution.allStatPct;
			after.attPct += planned.contribution.attPct;
			after.dmg += planned.contribution.dmg;
			after.boss += planned.contribution.boss;
			after.critDmg += planned.contribution.critDmg;
			after.critRate += planned.contribution.critRate;
			after.att += planned.contribution.att;
			after.mainFlat += planned.contribution.mainFlat;
			after.subFlat += planned.contribution.subFlat;
			after.ied.push(...planned.contribution.ied);
		}

		/* --------------------------------------------------------------- before */
		// `item.total` is the WHOLE printed tooltip — base plus scrolls plus stars
		// plus flame — so nothing on the current side needs reconstructing. Only
		// potential is separate, because potential lines are not in the block.
		const before = emptyContribution();
		addStatBlock(before, item.total, cls);
		if (item.potential) {
			const pot = contributionOf(item.potential.lines, cls);
			before.mainPct += pot.mainPct;
			before.subPct += pot.subPct;
			before.allStatPct += pot.allStatPct;
			before.attPct += pot.attPct;
			before.dmg += pot.dmg;
			before.boss += pot.boss;
			before.critDmg += pot.critDmg;
			before.critRate += pot.critRate;
			before.att += pot.att;
			before.mainFlat += pot.mainFlat;
			before.subFlat += pot.subFlat;
			before.ied.push(...pot.ied);
		}

		/* ---------------------------------------------------------------- delta */
		const delta = deltaBetween(before, after);

		const setChanges: SetCountChange[] = setChangesForSwap(counts, item.setName, entry.setName);
		mergeDelta(delta, setChangesToDelta(setChanges, cls));

		/* ----------------------------------------------------------------- cost */
		const cost: UpgradeCost = {};
		const costParts: string[] = [];
		let confidence: Confidence = 'estimated';

		let mesos = 0;
		if (targetStars > fromStars && caps.canStarforce) {
			mesos += starforce.expectedCostToReach(entry.itemLevel, fromStars, targetStars, {
				safeguard: true
			});
			costParts.push(`${fromStars}★ → ${targetStars}★ star force`);
		}

		const cubes = cubeCostTo(transfer.eligible ? 'epic' : 'rare', stop, entry, slot);
		if (cubes) {
			mesos += cubes.mesos;
			costParts.push(cubes.note);
			if (cubes.usedRankUpRates) confidence = 'speculative';
		}

		if (flame) {
			const count =
				flames.FLAME_SCORE_BENCHMARKS.flamesToReachPowerful[flame.band as 'average' | 'starters'];
			if (count) {
				mesos += count * flames.FLAME_SOURCES_HEROIC.powerfulRebirthFlameMesoPrice;
				costParts.push(`~${count} Powerful Rebirth Flames for the ${flame.band} band`);
			}
		}

		if (mesos > 0) cost.mesos = Math.round(mesos);
		cost.note =
			`The piece itself is not meso-priced — ${next.obtainedFrom}. ` +
			`Priced here: ${costParts.length > 0 ? costParts.join('; ') : 'nothing beyond the drop'}.`;

		/* -------------------------------------------------------------- assembly */
		const investment = [
			targetStars > 0 ? `${targetStars}★` : null,
			planned?.description ?? null,
			flame ? `${flame.band} flames` : null
		].filter((x): x is string => x !== null);

		const candidateNotes: string[] = [
			// Rule 1, said out loud on every row.
			`This row is OBTAIN PLUS INVEST: a freshly farmed ${entry.name} arrives at 0★ with no ` +
				'potential, which is a downgrade until it is brought to the stopping point above. ' +
				'The gain shown is for the finished piece, not the drop.',
			stop.why
		];
		if (transfer.eligible) {
			candidateNotes.push(
				`${transfer.why}. That skips the 0★ climb AND delivers Epic potential, which is why ` +
					'the ladder stops the outgoing piece at Epic. It CONSUMES the outgoing item, so ' +
					'keep a spare, and the receiving item must be fully scrolled first ' +
					`(${TRANSFER_HAMMER.source}).`
			);
		} else if (item.starforce !== undefined && item.starforce > 0) {
			candidateNotes.push(`No transfer hammer route: ${transfer.why}.`);
		}
		if (skippedAsWorn.length > 0) {
			candidateNotes.push(
				`Skipped past ${skippedAsWorn.join(', ')} on this path — already worn in another slot.`
			);
		}
		if (confidence === 'speculative') {
			candidateNotes.push(
				'Priced through UNVERIFIED_GMS_RANK_UP_RATES, which predate the v239 cube rework, so ' +
					'the cube half of this price is a guess with a citation rather than a table.'
			);
		}
		for (const change of setChanges) candidateNotes.push(describeSetChange(change));

		// Candidates are scored INDEPENDENTLY (rank.ts), so a set that needs three
		// more pieces before it pays never shows its payoff on any single row. The
		// Superior Gollux 4-set is +30% Boss Damage and +30% IED and is the single
		// largest accessory jump on the path; a user reading only per-row gains
		// would rank the first Gollux piece as barely worth having.
		for (const change of setChanges) {
			if (change.to <= change.from || change.crossed || change.unknown) continue;
			const set = getSet(change.name);
			const ahead = set ? nextThreshold(set, change.to) : undefined;
			if (ahead === undefined) continue;
			candidateNotes.push(
				`This is piece ${change.to} of ${change.name}; its next effect unlocks at ${ahead}. ` +
					'Rows are scored one change at a time, so that payoff is NOT in the gain above — ' +
					'evaluate the remaining pieces together with what-if.'
			);
		}

		// The v270 dump carries no All Stat % or Damage % field on any equip, so a
		// current-client tooltip that prints one has nothing to compare against and
		// the incoming piece looks worse than it is. Say so rather than quietly
		// dropping the term.
		const uncomparable = (['allStatPct', 'dmgPct'] as const).filter((key) => item.total?.[key]);
		if (uncomparable.length > 0) {
			candidateNotes.push(
				`${item.name}'s tooltip carries ${uncomparable.join(' and ')}, which the GMS v270 item ` +
					`manifest has no field for on ANY equip. If ${entry.name} prints the same line in ` +
					'the current client, this row UNDERSTATES it by that much.'
			);
		}

		if (setChanges.some((c) => c.partial && c.crossed)) {
			candidateNotes.push(
				'At least one set effect above came only from the item manifest, which omits boss ' +
					'damage and ignore-enemy-defence — those rows UNDERSTATE themselves.'
			);
		}
		if (flame) {
			candidateNotes.push(
				`Flames are valued as flame SCORE converted 1:1 to main stat (formulas.md §3.2). The ` +
					`outgoing item's real flame is inside its captured tooltip, so the two sides are ` +
					'scored slightly differently; the difference is small and favours neither side ' +
					'systematically.'
			);
		}
		if (resolution.alternatives.length > 0) {
			candidateNotes.push(
				`${resolution.alternatives.length} other catalogue ${
					resolution.alternatives.length === 1 ? 'item' : 'items'
				} also match this stage (e.g. ${resolution.alternatives[0].name}); the highest ` +
					'item level for this class branch was used.'
			);
		}

		const setHeadline = setChanges
			.filter((c) => c.crossed)
			.map((c) => (c.to > c.from ? `+${c.name}` : `-${c.name}`))
			.join(', ');

		candidates.push({
			id: `acquisition:${slot}:${next.id}`,
			kind: 'acquisition',
			label: `Obtain ${entry.name}${investment.length > 0 ? ` → ${investment.join(', ')}` : ''}`,
			detail:
				`Replace ${item.name} in ${slot} with ${entry.name} (item level ${entry.itemLevel}), ` +
				`taken to this stage's stopping point.` +
				(setHeadline ? ` Set effects change: ${setHeadline}.` : '') +
				(next.movesOnWhen ? ` You leave this stage when: ${next.movesOnWhen}` : ''),
			slot,
			itemName: entry.name,
			delta,
			cost,
			confidence,
			// Never `routine`: this is a boss-drop or coin grind measured in weeks,
			// not a bounded repeatable action. Never `ceiling` either — it IS an
			// action with a knowable cost, so it belongs on the board.
			feasibility: 'grind',
			notes: candidateNotes.filter((n) => n.length > 0)
		});
	}

	/* ------------------------------------------------------------ empty slots */
	// One note for all of them. An empty slot is worth saying out loud, but the
	// ladder cannot say which RUNG a bare slot starts at — that depends on boss
	// access, which lives in the boss board, not here — so these are reported
	// rather than ranked, and a per-slot paragraph each would drown the rest.
	const empty: string[] = [];
	for (const path of gearProgression.SLOT_PATHS) {
		if (path.kind === 'alternative') continue;
		if (empty.includes(path.slot)) continue;
		const filled = Object.entries(character.equipment ?? {}).some(
			([slot, equipped]) => equipped && catalogueSlot(slot) === path.slot
		);
		if (!filled) empty.push(path.slot);
	}
	if (empty.length > 0) {
		notes.push(
			`Nothing equipped in: ${empty.join(', ')}. No acquisition was ranked for an empty slot — ` +
				'the ladder is ordered by tier and does not say which rung a bare slot should start ' +
				'at, because that depends on boss access.'
		);
	}

	if (candidates.length === 0) {
		notes.push(
			'No acquisition candidates: every equipped item is either at the end of its path, ' +
				'unrecognised, or uncaptured.'
		);
	}

	return { candidates, notes };
}
