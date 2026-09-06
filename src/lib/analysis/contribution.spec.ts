import { describe, expect, it } from 'vitest';

import { getClass } from '$lib/data/classes';

import { contributionOf, deltaBetween, emptyContribution, fromStatBlock } from './contribution';

const ren = getClass('ren'); // STR main, DEX secondary, physical ATT
const bishop = getClass('bishop'); // INT main, magic ATT

describe('fromStatBlock', () => {
	it('splits a tooltip block into main and secondary flat stat', () => {
		const bag = fromStatBlock({ str: 14, dex: 14, int: 14, luk: 14, att: 10, matt: 10 }, ren);
		expect(bag.mainFlat).toBe(14);
		expect(bag.subFlat).toBe(14);
		// A physical class reads ATT and ignores the Magic ATT the item also prints.
		expect(bag.att).toBe(10);
	});

	it('reads Magic ATT for a magic class', () => {
		const bag = fromStatBlock({ att: 10, matt: 40 }, bishop);
		expect(bag.att).toBe(40);
	});

	it('keeps IED as a source list, never a sum', () => {
		const bag = fromStatBlock({ iedPct: 10 }, ren);
		expect(bag.ied).toEqual([10]);
	});

	it('treats an absent block as no contribution, not as zeroes to subtract', () => {
		expect(fromStatBlock(undefined, ren)).toEqual(emptyContribution());
	});
});

describe('contributionOf', () => {
	it('resolves stat lines against the class', () => {
		const bag = contributionOf(['STR : +12%', 'DEX : +9%', 'Boss Damage : +30%'], ren);
		expect(bag.mainPct).toBe(12);
		expect(bag.subPct).toBe(9);
		expect(bag.boss).toBe(30);
	});

	it('collects flat secondary stat, which the potential-only bag used to drop', () => {
		const bag = contributionOf(['DEX : +12', 'STR : +12', 'Max HP : +6%'], ren);
		expect(bag.mainFlat).toBe(12);
		expect(bag.subFlat).toBe(12);
	});
});

describe('deltaBetween', () => {
	it('subtracts additive terms and composes IED from both sides', () => {
		const before = fromStatBlock({ str: 100, att: 10, iedPct: 20 }, ren);
		const after = fromStatBlock({ str: 150, att: 25, iedPct: 30 }, ren);
		const delta = deltaBetween(before, after);
		expect(delta.mainFlat).toBe(50);
		expect(delta.att).toBe(15);
		// Never `iedAdd: 10` — the old source is divided out and the new one composed in.
		expect(delta.iedRemove).toEqual([20]);
		expect(delta.iedAdd).toEqual([30]);
	});

	it('omits terms that did not move', () => {
		const same = fromStatBlock({ str: 100 }, ren);
		expect(deltaBetween(same, same)).toEqual({});
	});

	it('reports a real regression as a negative term', () => {
		const before = fromStatBlock({ str: 200 }, ren);
		const after = fromStatBlock({ str: 100 }, ren);
		expect(deltaBetween(before, after).mainFlat).toBe(-100);
	});
});
