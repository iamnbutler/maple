// Set progress.
//
// WHY THIS IS NOT ADDED TO THE BASELINE. The engine is top-down: the stat
// window already contains every active set effect, so composing them into the
// totals again would double-count. Sets matter here for one reason only —
// crossing a piece-count threshold is a real, sizeable, and completely
// invisible upgrade, and it is the one system where a gear change does NOT
// cancel out of a ratio comparison (design §2).
//
// So this module answers: which sets are you wearing, how close is the next
// threshold, what would it grant, and which pieces are missing.

import {
	getSet,
	deltaBetweenCounts,
	isCosmetic,
	nextThreshold,
	thresholds,
	type SetEffect
} from '$lib/data/sets';
import type { Character } from '$lib/schema';
import type { Delta } from '$lib/calc/types';
import type { ClassDef } from '$lib/data/classes';

export interface SetProgress {
	name: string;
	/** Pieces currently equipped that carry this set name. */
	count: number;
	/** Slots those pieces occupy, for the UI. */
	slots: string[];
	/** Every piece count that unlocks an effect. */
	thresholds: number[];
	/** The next count that unlocks something, if any. */
	next?: number;
	/** Pieces still needed to reach `next`. */
	missing?: number;
	/** What reaching `next` would grant, on top of what you already have. */
	nextEffect?: SetEffect;
	/**
	 * True when the effect data came only from the manifest, which omits boss
	 * damage and ignore-enemy-defence. Such a row understates itself.
	 */
	partial: boolean;
}

/** Count equipped pieces per set name. Items carry `setName` from the catalogue. */
export function setProgress(character: Character): SetProgress[] {
	const counts = new Map<string, string[]>();
	for (const [slot, item] of Object.entries(character.equipment ?? {})) {
		if (!item?.setName) continue;
		const slots = counts.get(item.setName) ?? [];
		slots.push(slot);
		counts.set(item.setName, slots);
	}

	const out: SetProgress[] = [];
	for (const [name, slots] of counts) {
		const set = getSet(name);
		if (!set) {
			// An unknown set name is still worth showing — the user can see they are
			// wearing pieces of something we have no effect data for.
			out.push({ name, count: slots.length, slots, thresholds: [], partial: true });
			continue;
		}
		const count = slots.length;
		const next = nextThreshold(set, count);
		out.push({
			name,
			count,
			slots,
			thresholds: thresholds(set),
			next,
			missing: next === undefined ? undefined : next - count,
			nextEffect: next === undefined ? undefined : deltaBetweenCounts(set, count, next),
			partial: set.partial
		});
	}

	// Closest to a threshold first — that is the actionable end of the list.
	out.sort((a, b) => (a.missing ?? 99) - (b.missing ?? 99) || b.count - a.count);
	return out;
}

/**
 * A set effect as a calc `Delta`.
 *
 * Set tables use FLAT All Stat, which lands on every stat at once, so it is
 * applied as flat main stat with the sub-stat share folded in via `subFlat`.
 * Set IED is a separate multiplicative source, so it goes in `iedAdd` — or in
 * `iedRemove` when the effect is NEGATIVE, which happens when a swap drops a
 * set below a threshold it had already crossed. A negative `iedAdd` would be
 * arithmetically wrong: IED is composed, not summed, so losing a 30% source
 * means dividing it back out, not adding -30.
 */
export function setEffectToDelta(effect: SetEffect, cls: ClassDef): Delta {
	const delta: Delta = {};
	// `primary`/`secondary` are arrays because a few classes scale off several
	// stats (Xenon). Flat All Stat lands on all of them at once, so the leading
	// entry is the right approximation and the rest is small.
	const mainKey = cls.primary[0];
	const subKey = cls.secondary[0];

	const mainFlat = (effect[mainKey as keyof SetEffect] ?? 0) + (effect.allStat ?? 0);
	if (mainFlat) delta.mainFlat = mainFlat;

	if (subKey) {
		const subFlat = (effect[subKey as keyof SetEffect] ?? 0) + (effect.allStat ?? 0);
		if (subFlat) delta.subFlat = subFlat;
	}

	const attack = cls.usesMagicAttack ? effect.matt : effect.att;
	if (attack) delta.att = attack;

	if (effect.bossDmgPct) delta.boss = effect.bossDmgPct;
	// Set IED is its own source and composes multiplicatively with everything
	// else, which is why it goes in `iedAdd` rather than being summed in.
	if (effect.iedPct && effect.iedPct > 0) delta.iedAdd = [effect.iedPct];
	if (effect.iedPct && effect.iedPct < 0) delta.iedRemove = [-effect.iedPct];
	if (effect.critRatePct) delta.critRate = effect.critRatePct;

	return delta;
}

/* -------------------------------------------------------------------------- */
/* What a gear SWAP does to your sets                                          */
/*                                                                            */
/* This is the half of set accounting `setProgress` cannot express. Replacing  */
/* a Dominator Pendant with a Superior Gollux Pendant is not "one accessory    */
/* upgrade": it drops Boss Accessory from 5 pieces to 4 — losing that whole    */
/* threshold — while adding a piece to Superior Gollux, whose 4-set is +30%    */
/* Boss Damage and +30% IED. Either half alone is a badly wrong number, and    */
/* the LOSS is the half a gear tracker forgets.                               */
/* -------------------------------------------------------------------------- */

/** One set's piece count moving, and what that is worth. */
export interface SetCountChange {
	name: string;
	from: number;
	to: number;
	/** Cumulative effects at `to` minus those at `from`. Negative when pieces are lost. */
	effect: SetEffect;
	/** True when the move crossed a threshold, i.e. `effect` is not empty. */
	crossed: boolean;
	/** True when we have no effect data for this set name at all. */
	unknown: boolean;
	/** True when the effect data came only from the manifest (no boss damage / IED). */
	partial: boolean;
}

/** Equipped pieces per set name. */
export function setCounts(character: Character): Map<string, number> {
	const counts = new Map<string, number>();
	for (const item of Object.values(character.equipment ?? {})) {
		if (!item?.setName) continue;
		counts.set(item.setName, (counts.get(item.setName) ?? 0) + 1);
	}
	return counts;
}

/**
 * What swapping one item for another does to the set counts.
 *
 * `removed` / `added` are set names — the set the outgoing item belonged to and
 * the set the incoming one belongs to. Either may be absent (an item in no
 * set), and they may be the SAME set, in which case nothing moves.
 */
export function setChangesForSwap(
	counts: ReadonlyMap<string, number>,
	removed: string | undefined,
	added: string | undefined
): SetCountChange[] {
	if (removed === added) return [];

	const moves: { name: string; from: number; to: number }[] = [];
	if (removed) {
		const from = counts.get(removed) ?? 0;
		moves.push({ name: removed, from, to: Math.max(from - 1, 0) });
	}
	if (added) {
		const from = counts.get(added) ?? 0;
		moves.push({ name: added, from, to: from + 1 });
	}

	return moves.map(({ name, from, to }) => {
		const set = getSet(name);
		if (!set) {
			// An unknown set name is reported, never assumed harmless: the piece
			// count really did move, we just cannot say what it was worth.
			return { name, from, to, effect: {}, crossed: false, unknown: true, partial: true };
		}
		const effect = deltaBetweenCounts(set, from, to);
		return {
			name,
			from,
			to,
			effect,
			crossed: !isCosmetic(effect),
			unknown: false,
			partial: set.partial
		};
	});
}

/** The combined `Delta` of a list of set count changes. */
export function setChangesToDelta(changes: readonly SetCountChange[], cls: ClassDef): Delta {
	const out: Delta = {};
	for (const change of changes) {
		if (!change.crossed) continue;
		mergeDelta(out, setEffectToDelta(change.effect, cls));
	}
	return out;
}

/**
 * Add `from` into `into`, in place.
 *
 * Additive terms sum. IED does not: `iedAdd` and `iedRemove` are lists of
 * independent sources and are concatenated, so composing them stays correct
 * (formulas.md §1.8).
 */
export function mergeDelta(into: Delta, from: Delta): Delta {
	for (const [key, value] of Object.entries(from)) {
		if (key === 'iedAdd' || key === 'iedRemove') {
			const list = (into[key] ??= []);
			list.push(...(value as number[]));
			continue;
		}
		const current = (into as Record<string, number | undefined>)[key] ?? 0;
		(into as Record<string, number>)[key] = current + (value as number);
	}
	return into;
}

/** Human sentence for one set count change, for a candidate's `detail`. */
export function describeSetChange(change: SetCountChange): string {
	const direction = change.to > change.from ? 'Gains' : 'Loses';
	const head = `${direction} one ${change.name} piece (${change.from} → ${change.to})`;
	if (change.unknown) return `${head}: no effect data for this set, so its worth is UNKNOWN.`;
	if (!change.crossed) return `${head}: no threshold crossed.`;
	const e = change.effect;
	const pct = (n: number): string => `${n > 0 ? '+' : ''}${n}%`;
	const flat = (n: number): string => `${n > 0 ? '+' : ''}${n}`;
	const parts: string[] = [];
	if (e.allStat) parts.push(`${flat(e.allStat)} all stat`);
	if (e.att) parts.push(`${flat(e.att)} ATT`);
	if (e.matt) parts.push(`${flat(e.matt)} magic ATT`);
	if (e.bossDmgPct) parts.push(`${pct(e.bossDmgPct)} boss damage`);
	if (e.iedPct) parts.push(`${pct(e.iedPct)} IED`);
	if (e.critRatePct) parts.push(`${pct(e.critRatePct)} crit rate`);
	const body =
		parts.length > 0 ? parts.join(', ') : 'an effect this tracker does not model as damage';
	return `${head}: ${body}.`;
}
