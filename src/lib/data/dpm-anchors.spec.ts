import { describe, expect, it } from 'vitest';

import { damageIndex } from '../calc/damage';
import { getClass } from './classes';
import {
	ANCHOR_FRAME,
	ANCHOR_FRAME_CONFIDENCE,
	ANCHOR_FRAME_SPEC,
	ANCHOR_PRIORITY_CLASSES,
	ANCHOR_TARGET,
	CLASS_ANCHORS,
	anchorFrameFor,
	getAnchorDpm,
	getAnchorFrame,
	hasAnyAnchor
} from './dpm-anchors';

describe('the 8.8 Challenge dummy', () => {
	it('is Level 1, 380% defence, and carries no force requirement (bosses.md §5.6)', () => {
		expect(ANCHOR_TARGET.level).toBe(1);
		expect(ANCHOR_TARGET.pdr).toBe(3.8);
		expect(ANCHOR_TARGET.arcaneReq).toBeUndefined();
		expect(ANCHOR_TARGET.sacredReq).toBeUndefined();
	});

	it('exposes the dummy alongside the frame', () => {
		expect(ANCHOR_FRAME.target).toBe(ANCHOR_TARGET);
		expect(ANCHOR_FRAME.confidence).toBe('speculative');
		expect(ANCHOR_FRAME_CONFIDENCE).toBe('speculative');
	});
});

describe('anchor frame', () => {
	it('sits in the 8.8 rule band of 87,000-89,000 converted main stat', () => {
		expect(ANCHOR_FRAME_SPEC.mainStat).toBeGreaterThanOrEqual(87_000);
		expect(ANCHOR_FRAME_SPEC.mainStat).toBeLessThanOrEqual(89_000);
	});

	it.each([
		['hero', 'str', 'dex'],
		['ren', 'str', 'dex'],
		['wind-archer', 'dex', 'str'],
		['night-walker', 'luk', 'dex'],
		['battle-mage', 'int', 'luk']
	])('puts the main stat on %s’s primary stat', (classId, primary, secondary) => {
		const frame = anchorFrameFor(classId);
		expect(frame.classId).toBe(classId);
		expect(frame.stats[primary as 'str'].base).toBe(ANCHOR_FRAME_SPEC.mainStat);
		expect(frame.stats[secondary as 'str'].base).toBe(ANCHOR_FRAME_SPEC.secondaryStat);
	});

	it('routes ATT to Magic ATT for magicians only', () => {
		const bam = anchorFrameFor('battle-mage');
		expect(getClass('battle-mage').usesMagicAttack).toBe(true);
		expect(bam.magicAttack.base).toBe(ANCHOR_FRAME_SPEC.attack);
		expect(bam.attack.base).toBe(0);

		const hero = anchorFrameFor('hero');
		expect(hero.attack.base).toBe(ANCHOR_FRAME_SPEC.attack);
		expect(hero.magicAttack.base).toBe(0);
	});

	it('produces a usable (non-zero, finite) damage index against the dummy', () => {
		for (const classId of ANCHOR_PRIORITY_CLASSES) {
			const value = damageIndex(anchorFrameFor(classId), ANCHOR_TARGET);
			expect(value).toBeGreaterThan(0);
			expect(Number.isFinite(value)).toBe(true);
		}
	});

	it('getAnchorFrame falls back to the shared frame when an anchor has no override', () => {
		expect(getAnchorFrame('wind-archer')).toEqual(anchorFrameFor('wind-archer'));
	});
});

describe('per-class anchors', () => {
	it("covers the user's five classes", () => {
		expect(ANCHOR_PRIORITY_CLASSES).toEqual([
			'ren',
			'hero',
			'wind-archer',
			'battle-mage',
			'night-walker'
		]);
		for (const classId of ANCHOR_PRIORITY_CLASSES) {
			expect(CLASS_ANCHORS[classId]).toBeDefined();
			// Every priority class must also be a real class id.
			expect(getClass(classId).id).toBe(classId);
		}
	});

	it('is UNCALIBRATED: no trustworthy per-class 8.8 DPM figure has been sourced', () => {
		// bosses.md §5.6 names the chart publishers but transcribes no numbers,
		// and formulas.md is explicit that absolute DPM must not be claimed. If
		// this test starts failing, a real anchor landed — update the board's
		// documentation to match.
		for (const classId of ANCHOR_PRIORITY_CLASSES) {
			expect(getAnchorDpm(classId)).toBeNull();
		}
		expect(hasAnyAnchor()).toBe(false);
	});

	it('returns null rather than throwing for a class with no entry', () => {
		expect(getAnchorDpm('bishop')).toBeNull();
		expect(getAnchorDpm('not-a-class')).toBeNull();
	});
});
