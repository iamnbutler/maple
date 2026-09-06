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
 * Set IED is a separate multiplicative source, so it goes in `iedAdd`.
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
	if (effect.iedPct) delta.iedAdd = [effect.iedPct];
	if (effect.critRatePct) delta.critRate = effect.critRatePct;

	return delta;
}
