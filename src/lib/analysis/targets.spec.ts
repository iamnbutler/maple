import { describe, expect, it } from 'vitest';

import { getBoss } from '$lib/data/bosses';

import { AnalysisError } from './errors';
import { listTargets, PRESET_TARGETS, resolveTarget } from './targets';

describe('resolveTarget', () => {
	it('defaults to grandis', () => {
		expect(resolveTarget(undefined)).toEqual(PRESET_TARGETS.grandis);
		expect(resolveTarget(null).id).toBe('grandis');
	});

	it('knows the two design §4 presets', () => {
		expect(resolveTarget('arcane')).toMatchObject({ pdr: 3.0, level: 255, kind: 'preset' });
		expect(resolveTarget('grandis')).toMatchObject({ pdr: 3.8, level: 285, kind: 'preset' });
	});

	it('converts a boss PDR from whole percent to the decimal Target wants', () => {
		const boss = getBoss('hard-lucid')!;
		expect(boss.pdr).toBeGreaterThan(10); // stored as a whole percent

		const target = resolveTarget('hard-lucid');
		expect(target.kind).toBe('boss');
		expect(target.pdr).toBeCloseTo(boss.pdr! / 100, 10);
		expect(target.pdr).toBeLessThan(5);
		expect(target.level).toBe(boss.level);
	});

	it('carries the force requirement onto the right axis', () => {
		const arcaneBoss = resolveTarget('hard-lucid');
		expect(arcaneBoss.arcaneReq).toBe(getBoss('hard-lucid')!.force.required);
		expect(arcaneBoss.sacredReq).toBeUndefined();

		const sacred = listTargets().find((t) => t.sacredReq !== undefined);
		expect(sacred).toBeDefined();
		expect(sacred!.arcaneReq).toBeUndefined();
	});

	it('throws a 400 for an unknown id', () => {
		try {
			resolveTarget('not-a-boss');
			expect.unreachable('should have thrown');
		} catch (error) {
			expect(error).toBeInstanceOf(AnalysisError);
			expect((error as AnalysisError).status).toBe(400);
		}
	});
});

describe('listTargets', () => {
	it('lists both presets first, then every boss', () => {
		const targets = listTargets();
		expect(targets[0].id).toBe('arcane');
		expect(targets[1].id).toBe('grandis');
		expect(targets.length).toBeGreaterThan(50);
		expect(new Set(targets.map((t) => t.id)).size).toBe(targets.length);
	});
});
