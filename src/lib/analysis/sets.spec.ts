import { describe, expect, it } from 'vitest';

import { getClass } from '$lib/data/classes';
import type { Character, Item, Slot } from '$lib/schema';

import {
	describeSetChange,
	mergeDelta,
	setChangesForSwap,
	setChangesToDelta,
	setCounts,
	setEffectToDelta
} from './sets';

function item(slot: Slot, name: string, setName?: string): [Slot, Item] {
	return [slot, { slot, name, category: 'accessory', setName }];
}

const character = {
	id: 't',
	name: 'T',
	classId: 'ren',
	level: 272,
	equipment: Object.fromEntries([
		item('earrings', "Will o' the Wisps", 'Boss Accessory Set'),
		item('pendant2', 'Dominator Pendant', 'Boss Accessory Set'),
		item('shoulder', 'Royal Black Metal Shoulder', 'Boss Accessory Set'),
		item('ring1', 'Superior Gollux Ring', 'Superior Gollux Set')
	])
} as unknown as Character;

describe('setCounts', () => {
	it('counts equipped pieces per set name', () => {
		const counts = setCounts(character);
		expect(counts.get('Boss Accessory Set')).toBe(3);
		expect(counts.get('Superior Gollux Set')).toBe(1);
	});
});

describe('setChangesForSwap', () => {
	const counts = setCounts(character);

	it('moves both counts when the swap crosses set boundaries', () => {
		const changes = setChangesForSwap(counts, 'Boss Accessory Set', 'Superior Gollux Set');
		expect(changes.map((c) => [c.name, c.from, c.to])).toEqual([
			['Boss Accessory Set', 3, 2],
			['Superior Gollux Set', 1, 2]
		]);
	});

	it('returns nothing when the item stays inside the same set', () => {
		expect(setChangesForSwap(counts, 'Superior Gollux Set', 'Superior Gollux Set')).toEqual([]);
	});

	it('reports a LOSS as a negative effect once a threshold is uncrossed', () => {
		// Boss Accessory unlocks at 3, so dropping 3 -> 2 gives back that row.
		const [loss] = setChangesForSwap(counts, 'Boss Accessory Set', undefined);
		expect(loss.crossed).toBe(true);
		expect(loss.effect.allStat).toBeLessThan(0);
		expect(describeSetChange(loss)).toContain('Loses one Boss Accessory Set piece (3 → 2)');
	});

	it('flags a set it has no data for rather than assuming it is harmless', () => {
		const [unknown] = setChangesForSwap(counts, 'Not A Real Set', undefined);
		expect(unknown.unknown).toBe(true);
		expect(describeSetChange(unknown)).toContain('UNKNOWN');
	});
});

describe('setEffectToDelta', () => {
	const ren = getClass('ren');

	it('routes a LOST IED source to iedRemove, never to a negative iedAdd', () => {
		// IED composes multiplicatively, so losing a 30% source means dividing it
		// back out. A negative `iedAdd` would be arithmetically meaningless.
		const delta = setEffectToDelta({ iedPct: -30 }, ren);
		expect(delta.iedRemove).toEqual([30]);
		expect(delta.iedAdd).toBeUndefined();
	});

	it('routes a gained IED source to iedAdd', () => {
		expect(setEffectToDelta({ iedPct: 30 }, ren).iedAdd).toEqual([30]);
	});
});

describe('setChangesToDelta', () => {
	it('nets a simultaneous gain and loss into one delta', () => {
		const counts = setCounts(character);
		const changes = setChangesForSwap(counts, 'Boss Accessory Set', 'AbsoLab Set (Warrior)');
		const delta = setChangesToDelta(changes, getClass('ren'));
		// The Boss Accessory 3-set comes off; whatever AbsoLab grants at 1 piece
		// (nothing) does not go on. So the net is a loss, and it is present.
		expect(delta.mainFlat).toBeLessThan(0);
	});
});

describe('mergeDelta', () => {
	it('sums additive terms and concatenates IED source lists', () => {
		const into = mergeDelta({ mainFlat: 10, iedAdd: [30] }, { mainFlat: 5, iedAdd: [20] });
		expect(into.mainFlat).toBe(15);
		expect(into.iedAdd).toEqual([30, 20]);
	});

	it('keeps iedRemove separate from iedAdd', () => {
		const into = mergeDelta({ iedAdd: [30] }, { iedRemove: [10] });
		expect(into.iedAdd).toEqual([30]);
		expect(into.iedRemove).toEqual([10]);
	});
});
