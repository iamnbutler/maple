import { describe, expect, it } from 'vitest';

import { damageIndex } from '../calc/damage';
import { getClass } from './classes';
import {
	ANCHOR_FRAME,
	ANCHOR_FRAME_CONFIDENCE,
	ANCHOR_FRAME_SPEC,
	ANCHOR_MEASURED_AT,
	ANCHOR_PRIORITY_CLASSES,
	ANCHOR_REGION,
	ANCHOR_TARGET,
	CLASS_DPM_FITS,
	DUMMY_TARGET,
	MIN_FREE_ALPHA_SAMPLES,
	SHARED_ALPHA,
	anchorFrameFor,
	getAnchorDpm,
	getAnchorFrame,
	getDpmFit,
	hasAnyAnchor
} from './dpm-anchors';

/** dpm-anchors.md §4.2: fitted 전투력 at 헥사환산 110,000 over the 933 records. */
const CP_AT_HEXA_110K = 656_000_000;

/** Predicted dummy DPM, in 조 (1e12) per minute — the unit §3 and §4 print. */
function dpmJo(classId: string, combatPower: number, alphaMode?: 'per-class' | 'shared'): number {
	const anchor = getAnchorDpm(classId, combatPower, alphaMode ? { alphaMode } : {});
	if (!anchor) throw new Error(`no anchor for ${classId}`);
	return anchor.value / 1e12;
}

/* -------------------------------------------------------------------------- */
/* The 연무장 dummy                                                             */
/* -------------------------------------------------------------------------- */

describe('the 연무장 dummy the fits are measured on', () => {
	it('is Level 200, 380% defence, and carries no force requirement (dpm-anchors.md §1.1)', () => {
		expect(DUMMY_TARGET.level).toBe(200);
		expect(DUMMY_TARGET.pdr).toBe(3.8);
		expect(DUMMY_TARGET.arcaneReq).toBeUndefined();
		expect(DUMMY_TARGET.sacredReq).toBeUndefined();
	});

	it('is dated and attributed, because the numbers decay ~2%/month (§5.4)', () => {
		expect(ANCHOR_MEASURED_AT).toBe('2026-08');
		expect(ANCHOR_REGION).toBe('KMS');
	});
});

/* -------------------------------------------------------------------------- */
/* The fits themselves                                                         */
/* -------------------------------------------------------------------------- */

describe('per-class fits', () => {
	it('covers every class in the dataset and nothing else', () => {
		expect(Object.keys(CLASS_DPM_FITS)).toHaveLength(47);
		expect(hasAnyAnchor()).toBe(true);
		// Lethe is in the CSV but is KMS-only and absent from data/classes.ts.
		expect(getDpmFit('lethe')).toBeNull();
		// Classes with no 연무장 records stay uncalibrated rather than borrowing.
		for (const classId of ['kanna', 'hayato', 'lynn', 'mo-xuan', 'sia-astelle', 'erel-light']) {
			expect(getClass(classId).id).toBe(classId);
			expect(getDpmFit(classId)).toBeNull();
		}
	});

	it('maps every key to a real class id', () => {
		for (const classId of Object.keys(CLASS_DPM_FITS)) {
			expect(getClass(classId).id).toBe(classId);
		}
	});

	it('is a plausible power law everywhere: k > 0, alpha near-linear, R2 high', () => {
		for (const [classId, fit] of Object.entries(CLASS_DPM_FITS)) {
			expect(fit.k, classId).toBeGreaterThan(0);
			// dpm-anchors.md §4.2: alpha 1.03-1.30, Buccaneer an outlier at 1.49.
			expect(fit.alpha, classId).toBeGreaterThanOrEqual(1.0);
			expect(fit.alpha, classId).toBeLessThanOrEqual(1.5);
			expect(fit.r2, classId).toBeGreaterThan(0.9);
			expect(fit.spreadPercent, classId).toBeLessThan(10);
			expect(fit.sampleSize, classId).toBeGreaterThanOrEqual(5);
			expect(fit.cpRange[0], classId).toBeLessThan(fit.cpRange[1]);
			// The 연무장 entry gate is 전투력 >= 3억, so no sample is below it.
			expect(fit.cpRange[0], classId).toBeGreaterThanOrEqual(3e8);
		}
	});

	it('only fits its own exponent when the sample supports it', () => {
		for (const [classId, fit] of Object.entries(CLASS_DPM_FITS)) {
			if (fit.sampleSize >= MIN_FREE_ALPHA_SAMPLES) {
				expect(fit.alphaFitted, classId).toBe(true);
			} else {
				expect(fit.alphaFitted, classId).toBe(false);
				expect(fit.alpha, classId).toBe(SHARED_ALPHA);
				expect(fit.k, classId).toBe(fit.kAtSharedAlpha);
			}
		}
	});

	it('gives all five priority classes their own fitted exponent', () => {
		expect(ANCHOR_PRIORITY_CLASSES).toEqual([
			'ren',
			'hero',
			'wind-archer',
			'battle-mage',
			'night-walker'
		]);
		for (const classId of ANCHOR_PRIORITY_CLASSES) {
			const fit = getDpmFit(classId)!;
			expect(fit, classId).not.toBeNull();
			expect(fit.alphaFitted, classId).toBe(true);
			expect(fit.sampleSize, classId).toBeGreaterThanOrEqual(MIN_FREE_ALPHA_SAMPLES);
		}
	});
});

/* -------------------------------------------------------------------------- */
/* Reproducing the published tables                                            */
/* -------------------------------------------------------------------------- */

describe('reproduces dpm-anchors.md §3.1 (DPM at 헥사환산 110,000)', () => {
	// §3's per-class figure is the Q3 of that class's trusted records, while the
	// fit is a least-squares centre line, so exact agreement is not expected —
	// they are different statistics on the same sample. TOLERANCE: 12%.
	const TOLERANCE = 0.12;

	it.each([
		['ren', 269],
		['hero', 278],
		['wind-archer', 277],
		['battle-mage', 266],
		['night-walker', 279]
	])('%s: §3.1 lists %i 조/min', (classId, published) => {
		const predicted = dpmJo(classId, CP_AT_HEXA_110K);
		expect(Math.abs(predicted / published - 1)).toBeLessThan(TOLERANCE);
	});

	it('agrees with itself under the shared exponent, inside the fitted band', () => {
		for (const classId of ANCHOR_PRIORITY_CLASSES) {
			const free = dpmJo(classId, CP_AT_HEXA_110K);
			const shared = dpmJo(classId, CP_AT_HEXA_110K, 'shared');
			expect(Math.abs(free / shared - 1), classId).toBeLessThan(0.05);
		}
	});

	it('keeps the five classes in the narrow band §3 reports (Cadena top, spread ~1.4x)', () => {
		// §3.1 gives two shares per class: 80.7%-84.6% of Cadena on the 환산 axis,
		// and 72.6%-85.5% on the DPS÷전투력 axis. This fit IS the 전투력 axis, so
		// the wider band is the one it has to land inside — Battle Mage is the
		// laggard there (§3.1: "little innate IED, so it needs more of its 전투력
		// spent on 방무") and comes out at ~74%.
		const cadena = dpmJo('cadena', CP_AT_HEXA_110K);
		for (const classId of ANCHOR_PRIORITY_CLASSES) {
			const share = dpmJo(classId, CP_AT_HEXA_110K) / cadena;
			expect(share, classId).toBeGreaterThan(0.7);
			expect(share, classId).toBeLessThan(0.95);
		}
		expect(dpmJo('battle-mage', CP_AT_HEXA_110K) / cadena).toBeLessThan(
			dpmJo('night-walker', CP_AT_HEXA_110K) / cadena
		);
	});
});

describe('reproduces the individual anchor records of dpm-anchors.md §4.1', () => {
	// Each row is `[class, 전투력, DPM in 조/min]`, transcribed from §4.1.
	// These are single records, not the fitted centre line, so the tolerance has
	// to cover the class's own residual spread. TOLERANCE: 12%.
	it.each([
		['ren', 1_280_814_012, 537.8],
		['ren', 1_097_136_682, 464.5],
		['ren', 1_079_895_267, 453.7],
		['hero', 966_219_936, 413.6],
		['hero', 860_690_512, 365.8],
		['hero', 820_179_595, 354.0],
		['wind-archer', 914_025_557, 415.2],
		['wind-archer', 696_698_459, 330.1],
		['wind-archer', 690_143_108, 313.2],
		['battle-mage', 1_116_056_741, 408.6],
		['battle-mage', 858_138_916, 333.3],
		['battle-mage', 703_784_854, 277.1],
		['night-walker', 871_669_470, 380.1],
		['night-walker', 736_510_439, 335.0],
		['night-walker', 714_186_350, 302.7]
	])('%s at 전투력 %i measured %f 조/min', (classId, combatPower, measured) => {
		const predicted = dpmJo(classId, combatPower);
		expect(Math.abs(predicted / measured - 1)).toBeLessThan(0.12);
	});
});

/* -------------------------------------------------------------------------- */
/* getAnchorDpm                                                                */
/* -------------------------------------------------------------------------- */

describe('getAnchorDpm', () => {
	it('needs both a covered class and a Combat Power', () => {
		expect(getAnchorDpm('hero')).toBeNull();
		expect(getAnchorDpm('hero', undefined)).toBeNull();
		expect(getAnchorDpm('hero', 0)).toBeNull();
		expect(getAnchorDpm('hero', -1)).toBeNull();
		expect(getAnchorDpm('hero', Number.NaN)).toBeNull();
		expect(getAnchorDpm('kanna', 5e8)).toBeNull();
		expect(getAnchorDpm('not-a-class', 5e8)).toBeNull();
	});

	it('is monotonic in Combat Power', () => {
		const a = getAnchorDpm('ren', 4e8)!.value;
		const b = getAnchorDpm('ren', 8e8)!.value;
		expect(b).toBeGreaterThan(a);
		// alpha ~1.08 for Ren, so doubling CP a bit more than doubles DPM.
		expect(b / a).toBeGreaterThan(2);
		expect(b / a).toBeLessThan(2.3);
	});

	it('is `estimated` inside the fitted band and never better than that', () => {
		const fit = getDpmFit('hero')!;
		const mid = (fit.cpRange[0] + fit.cpRange[1]) / 2;
		const anchor = getAnchorDpm('hero', mid)!;
		expect(anchor.confidence).toBe('estimated');
		expect(anchor.note).toMatch(/연무장 2026-08/);
		expect(anchor.note).not.toMatch(/EXTRAPOLATED/);
	});

	it('degrades to `speculative` and says so outside the fitted band', () => {
		const fit = getDpmFit('hero')!;
		for (const cp of [fit.cpRange[0] - 1, fit.cpRange[1] + 1, 1e8]) {
			const anchor = getAnchorDpm('hero', cp)!;
			expect(anchor.confidence).toBe('speculative');
			expect(anchor.note).toMatch(/EXTRAPOLATED/);
		}
	});

	it('honours the shared-exponent mode', () => {
		const fit = getDpmFit('buccaneer')!;
		const shared = getAnchorDpm('buccaneer', 5e8, { alphaMode: 'shared' })!;
		expect(shared.value).toBeCloseTo(fit.kAtSharedAlpha * 5e8 ** SHARED_ALPHA, -6);
		expect(shared.note).toMatch(/CP\^1\.140/);
		// Buccaneer's free exponent is the §4.2 outlier at ~1.49, so the two
		// modes must actually differ for it.
		expect(getAnchorDpm('buccaneer', 5e8)!.value).not.toBeCloseTo(shared.value, -9);
	});
});

/* -------------------------------------------------------------------------- */
/* The self-measurement frame (dpm-anchors.md §7.1) — unchanged                */
/* -------------------------------------------------------------------------- */

describe('the 8.8 self-measurement frame', () => {
	it('is Level 1, 380% defence, and carries no force requirement (bosses.md §5.6)', () => {
		expect(ANCHOR_TARGET.level).toBe(1);
		expect(ANCHOR_TARGET.pdr).toBe(3.8);
		expect(ANCHOR_TARGET.arcaneReq).toBeUndefined();
		expect(ANCHOR_TARGET.sacredReq).toBeUndefined();
	});

	it('stays `speculative`: no real 8.8 stat window has ever been transcribed', () => {
		expect(ANCHOR_FRAME.target).toBe(ANCHOR_TARGET);
		expect(ANCHOR_FRAME.confidence).toBe('speculative');
		expect(ANCHOR_FRAME_CONFIDENCE).toBe('speculative');
	});

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

	it('produces a usable (non-zero, finite) damage index against both dummies', () => {
		for (const classId of ANCHOR_PRIORITY_CLASSES) {
			for (const target of [ANCHOR_TARGET, DUMMY_TARGET]) {
				const value = damageIndex(anchorFrameFor(classId), target);
				expect(value).toBeGreaterThan(0);
				expect(Number.isFinite(value)).toBe(true);
			}
		}
	});

	it('getAnchorFrame returns the shared frame for the class', () => {
		expect(getAnchorFrame('wind-archer')).toEqual(anchorFrameFor('wind-archer'));
	});
});
