// One item's damage-relevant contribution, as a bag of additive terms.
//
// EXTRACTED FROM candidates.ts, unchanged in behaviour except for the two
// additions noted below. It lived there as long as the only thing that produced
// a `Contribution` was a potential reroll: "what these three lines are worth,
// minus what the current three lines are worth". `acquisition.ts` needs the
// same arithmetic over a WHOLE ITEM — base stats, star force, flame and
// potential together — so the bag and its `Delta` diff now live on their own.
//
// WHY A BAG AND NOT A `Delta` DIRECTLY. A `Delta` is a change; a `Contribution`
// is a level. You cannot subtract two `Delta`s meaningfully (IED does not
// subtract — it composes), and building one requires accumulating many lines
// before you know the total. So: accumulate into a `Contribution`, diff two of
// them into a `Delta` exactly once, at the end.
//
// THE TWO ADDITIONS
//   * `subFlat` — potential lines only ever grant flat stat to the main stat,
//     so the bag never needed it. Item BASE stats grant flat stat to every stat
//     at once (an AbsoLab shoulder is +14 to all four), and a class whose
//     secondary stat is real loses that if the bag cannot carry it.
//   * `fromStatBlock` — turns a captured or catalogue `StatBlock` into a bag.

import * as calc from '$lib/calc';
import type { Delta } from '$lib/calc/types';
import type { ClassDef } from '$lib/data/classes';
import * as potential from '$lib/data/potential';
import type { StatBlock } from '$lib/schema';

export type FourStat = 'str' | 'dex' | 'int' | 'luk';

/** The class's main stat, or `undefined` for an HP-scaling class (Demon Avenger). */
export function mainStatOf(cls: ClassDef): FourStat | undefined {
	const key = cls.primary[0];
	return key && key !== 'hp' ? key : undefined;
}

/** The class's secondary stat, or `undefined` when it has none. */
export function subStatOf(cls: ClassDef): FourStat | undefined {
	const key = cls.secondary[0];
	return key && key !== 'hp' ? key : undefined;
}

/**
 * Everything one source (an item, a set effect, three potential lines) adds,
 * resolved against a specific class so that "STR +12%" is already known to be
 * main-stat or not.
 *
 * `ied` is a LIST and is never summed: IED composes multiplicatively
 * (formulas.md §1.8), so `30 + 30 != 60`.
 */
export interface Contribution {
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
	subFlat: number;
	ied: number[];
}

export function emptyContribution(): Contribution {
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
		subFlat: 0,
		ied: []
	};
}

/** Fold one parsed line kind + value into a contribution bag. */
export function addLine(
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
			else if (stat && stat === sub) into.subFlat += value;
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
export const PARSED_TO_DATA: Record<calc.PotentialKind, potential.PotentialLineKind | null> = {
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

/** What three raw tooltip potential lines are worth to this class. */
export function contributionOf(lines: readonly string[], cls: ClassDef): Contribution {
	const out = emptyContribution();
	for (const line of calc.parsePotentialLines(lines)) {
		const kind = PARSED_TO_DATA[line.kind];
		if (!kind) continue;
		const stat = line.stat && line.stat !== 'hp' ? line.stat : undefined;
		addLine(out, kind, line.value, stat, cls);
	}
	return out;
}

/**
 * Fold a `StatBlock` — a captured tooltip block, or a catalogue `base` block —
 * into an existing bag.
 *
 * The flat stat keys are read PER STAT rather than as "all stat", because a
 * tooltip block is already resolved: an AbsoLab shoulder prints `+14 STR` and
 * `+14 DEX` separately, and a flame that rolled DEX-heavy on a STR class prints
 * exactly that. Summing them into an "all stat" number would launder a bad
 * flame into a good one.
 *
 * `att` vs `matt` follows the class, never the tooltip: a magic class reads
 * Magic ATT and a physical class reads ATT, and every item prints both.
 */
export function addStatBlock(
	into: Contribution,
	block: StatBlock | undefined,
	cls: ClassDef
): void {
	if (!block) return;
	const main = mainStatOf(cls);
	const sub = subStatOf(cls);
	if (main) into.mainFlat += block[main] ?? 0;
	if (sub) into.subFlat += block[sub] ?? 0;
	into.att += (cls.usesMagicAttack ? block.matt : block.att) ?? 0;
	into.allStatPct += block.allStatPct ?? 0;
	into.boss += block.bossDmgPct ?? 0;
	into.dmg += block.dmgPct ?? 0;
	// A tooltip's flat IED is one source, exactly like a potential line.
	if (block.iedPct) into.ied.push(block.iedPct);
}

/** Convenience: a bag holding just this block. */
export function fromStatBlock(block: StatBlock | undefined, cls: ClassDef): Contribution {
	const out = emptyContribution();
	addStatBlock(out, block, cls);
	return out;
}

/**
 * `next - current`, as a `Delta` the calc engine can apply.
 *
 * Every additive term subtracts. IED does NOT: each source is composed
 * separately, so the current sources are handed to `iedRemove` (divided back
 * out) and the next ones to `iedAdd`.
 */
export function deltaBetween(current: Contribution, next: Contribution): Delta {
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
	set('subFlat', next.subFlat - current.subFlat);
	if (current.ied.length) delta.iedRemove = [...current.ied];
	if (next.ied.length) delta.iedAdd = [...next.ied];
	return delta;
}

/**
 * The best "useful" lines a category rolls at a grade (`potential.USEFUL_LINES`).
 *
 * This is a CEILING for a reroll and a PLAN for an acquisition: it is what the
 * item would carry once cubed to that grade, not what one cube buys. Callers
 * must price it accordingly.
 */
export function usefulContribution(
	category: potential.PotentialCategory,
	grade: potential.PotentialGrade,
	itemLevel: number,
	slot: string,
	cls: ClassDef,
	maxLines = 3
): { contribution: Contribution; kinds: potential.PotentialLineKind[] } {
	const out = emptyContribution();
	const kinds: potential.PotentialLineKind[] = [];
	const main = mainStatOf(cls);
	const slotOpt = { slot: slot as potential.PotentialSlot };

	for (const kind of potential.USEFUL_LINES[category]) {
		if (kinds.length >= maxLines) break;
		if (kind === 'matt_pct' && !cls.usesMagicAttack) continue;
		if (kind === 'att_pct' && cls.usesMagicAttack) continue;
		const value = potential.lineValue(grade, itemLevel, category, kind, slotOpt);
		if (value === null || value === 0) continue;
		kinds.push(kind);
		addLine(out, kind, value, main, cls);
	}
	return { contribution: out, kinds };
}
