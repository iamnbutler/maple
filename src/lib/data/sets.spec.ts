import { describe, expect, it } from 'vitest';

import {
	SETS,
	SETS_META,
	deltaBetweenCounts,
	effectsAt,
	getSet,
	nextThreshold,
	thresholds
} from './sets';

describe('set data', () => {
	it('loaded a substantial number of sets', () => {
		expect(SETS.length).toBeGreaterThan(400);
		expect(SETS_META.gameVersion).toBe('270');
	});

	// The upstream manifest carries only simple stat fields and DROPS boss damage
	// and ignore-enemy-defence. These five were transcribed from in-game panels
	// (docs/capture/2026-09-06-lutoren.md) precisely because of that gap; if the
	// overlay ever stops being applied, these assertions fail rather than the
	// tracker quietly understating every boss set.
	it('keeps the screenshot-verified damage effects the manifest omits', () => {
		expect(getSet('Root Abyss Set (Warrior)')!.effects['4']).toEqual({ bossDmgPct: 30 });
		expect(getSet('Superior Gollux Set')!.effects['4']).toEqual({ bossDmgPct: 30, iedPct: 30 });
		expect(getSet('Boss Accessory Set')!.effects['9'].bossDmgPct).toBe(10);
		expect(getSet('Boss Accessory Set')!.effects['7'].iedPct).toBe(10);
		expect(getSet('Dawn Boss Set')!.effects['2'].bossDmgPct).toBe(10);
		expect(getSet('AbsoLab Set (Warrior)')!.effects['7'].iedPct).toBe(10);
	});

	it('marks verified sets complete and everything else partial', () => {
		for (const name of [
			'Root Abyss Set (Warrior)',
			'AbsoLab Set (Warrior)',
			'Boss Accessory Set',
			'Dawn Boss Set',
			'Superior Gollux Set'
		]) {
			expect(getSet(name)!.partial).toBe(false);
		}
		expect(SETS.filter((s) => s.partial).length).toBeGreaterThan(400);
	});

	it('accumulates effects across thresholds, as the in-game panel does', () => {
		const rootAbyss = getSet('Root Abyss Set (Warrior)')!;
		expect(thresholds(rootAbyss)).toEqual([2, 3, 4]);

		// Four pieces grants the 2-, 3- AND 4-set rows together.
		const full = effectsAt(rootAbyss, 4);
		expect(full.str).toBe(20);
		expect(full.att).toBe(50);
		expect(full.bossDmgPct).toBe(30);

		// Below the first threshold, nothing.
		expect(effectsAt(rootAbyss, 1)).toEqual({});
	});

	it('reports the delta of crossing a threshold, not the total', () => {
		const boss = getSet('Boss Accessory Set')!;
		expect(nextThreshold(boss, 7)).toBe(9);

		const delta = deltaBetweenCounts(boss, 7, 9);
		expect(delta.bossDmgPct).toBe(10);
		expect(delta.allStat).toBe(15);
		// The 7-set IED is ALREADY held at 7 pieces, so it must not appear again.
		expect(delta.iedPct).toBeUndefined();
	});

	it('returns nothing for a set that is already complete', () => {
		const rootAbyss = getSet('Root Abyss Set (Warrior)')!;
		expect(nextThreshold(rootAbyss, 4)).toBeUndefined();
		expect(deltaBetweenCounts(rootAbyss, 4, 4)).toEqual({});
	});
});
