// Per-class DPM anchors for the boss board's clear-time model.
//
// WHY THIS MODULE EXISTS
// ----------------------
// `calc.damageIndex` returns a RELATIVE scalar, not a real DPM (formulas.md
// §3.1). To turn it into "will I clear this in the time limit?" the board needs
// one real (spec, DPM) calibration point per class.
//
// THE STANDARD — KMS 연무장 (Practice Arena), 2026-08
// --------------------------------------------------
// KMS shipped an official in-game DPS test in its 2026-03 patch: 연무장, a
// **boss-flagged, Level 200, 380% defence-rate, elemental-halving** dummy with
// game-supplied buffs, run for ~340 s, entry gated at Combat Power >= 3억.
// Results go through the Nexon Open API, and `docs/research/dpm-anchors.md`
// cross-joins two republishers into **933 records** of
// `(class, level, 전투력, 헥사환산, DPS, DPM)` — the dataset in
// `docs/research/data/yeonmujang-2026-08.csv`.
//
// That dataset is the anchor. Because the game supplies the buffs, most of the
// doping variance that made the older 8.8 Challenge charts unusable is gone.
//
// THE MODEL
// ---------
//     DPM_dummy = k_class * combatPower ** alpha_class          <- fitted here
//
// Combat Power is the right regressor because our engine computes it exactly
// (formulas.md §2.3) and the dataset publishes it per record. It is a poor
// *damage* metric — it ignores IED, crit rate, level and force — which is
// precisely why `alpha` comes out slightly super-linear (median 1.13 over the
// 41 classes with >= 8 samples): better-geared characters carry more of the
// things CP does not count. See dpm-anchors.md §3, §4.2.
//
// Transfer to an arbitrary boss is done by the CHARACTER'S OWN damage index,
// not by the measured population's average:
//
//     DPM_boss = DPM_dummy
//              * damageIndex(you, boss) / damageIndex(you, DUMMY_TARGET)
//              * uptime
//
// `damageIndex` already carries PDR, the level-difference coefficient and the
// Arcane/Sacred force coefficient, so that one ratio transfers all three and
// nothing is applied twice. The character's real IED / %boss / crit are
// respected rather than the sample's average. `buildBossBoard` implements it.
//
// HOW MUCH TO TRUST IT (dpm-anchors.md §6)
// ----------------------------------------
//   * It is **KMS**. GMS diverges: GMS permits attack-speed stage 0, which the
//     rapid-fire group — Marksman, Thunder Breaker, Shade, Buccaneer,
//     **Wind Archer**, Dawn Warrior, Corsair, Blaze Wizard — gains final damage
//     from, so their KMS figures read LOW for GMS. GMS balance also trails KMS.
//   * Numbers decay ~2%/month at fixed spec (§5.4 measured +37% over 16 months).
//   * The records are self-selected experts on a dummy with no mechanics, no
//     movement, no deaths and no phase transitions. Real clears are slower;
//     that is what `uptime` is for.
//   * Every record is a fully-built endgame character (CP 3억-16억). Below the
//     fitted CP band the curve is an **extrapolation** and is flagged as such.
//
// So a DPM-derived verdict is at best `estimated`, never `sourced`. Nothing in
// here should be presented as a measured clear time.
//
// TO REFRESH: re-scrape `api.maplescouter.com/api/ranking/battle` and
// `chuchu.gg/battle-practice`, drop the CSV in docs/research/data/, and run
// `node scripts/fit-dpm-anchors.mjs --table`.

import type { Confidence, Sourced } from '../analysis/types';
import type { CalcInput, StatKey, StatTriple, Target } from '../calc/types';
import { getClass } from './classes';
import { ARCANE_FORCE_PRACTICAL_MAX, SACRED_FORCE_PRACTICAL_MAX } from './symbols';

/* -------------------------------------------------------------------------- */
/* The 연무장 dummy — what the fitted DPM is a DPM *against*                    */
/* -------------------------------------------------------------------------- */

/** Where the fit came from. Shown to the user, so keep it exact. */
export const ANCHOR_SOURCE_URL = 'https://maplescouter.com/ko/battle-ranking';
/** Month the records were measured, per dpm-anchors.md §3 (2026-08-05 → 08-19). */
export const ANCHOR_MEASURED_AT = '2026-08';
/** Region the records come from. Not ours — see the module header. */
export const ANCHOR_REGION = 'KMS';

/**
 * The 연무장 dummy as a `Target` (dpm-anchors.md §1.1).
 *
 * **Level 200**, 380% defence rate, and **no force requirement** — a practice
 * dummy is neither in Arcane River nor in Grandis, so neither force system
 * applies. Elemental halving is in the dummy's description but not in this
 * target: `damageIndex` leaves the elemental multiplier out by default and it
 * cancels in the transfer ratio anyway (both sides are Strong-resist bosses).
 *
 * This is the DENOMINATOR of the transfer ratio, and it is the only target the
 * fitted DPM is valid at.
 */
export const DUMMY_TARGET: Target = Object.freeze({ id: 'yeonmujang-dummy', pdr: 3.8, level: 200 });

/* -------------------------------------------------------------------------- */
/* The fits                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Shared fallback exponent for classes whose sample is too small to fit one:
 * the median free alpha over the 41 classes with >= 8 trusted records
 * (dpm-anchors.md TL;DR quotes 1.14; this repo's own fit over the same CSV
 * gives 1.131 — 1.14 is kept because it is the published, citable figure).
 */
export const SHARED_ALPHA = 1.14;

/** Minimum trusted records before a per-class exponent is fitted. */
export const MIN_FREE_ALPHA_SAMPLES = 8;

/**
 * One class's fit of `DPM_dummy = k * combatPower ** alpha`, by OLS on
 * log(DPM) vs log(CP) over that class's `maplescouter_trusted` records.
 *
 * Produced by `scripts/fit-dpm-anchors.mjs`; do not hand-edit.
 */
export interface ClassDpmFit {
	/** Coefficient for {@link alpha}. DPM is raw damage per minute. */
	k: number;
	/** Fitted exponent, or {@link SHARED_ALPHA} when `alphaFitted` is false. */
	alpha: number;
	/** Trusted records behind the fit. */
	sampleSize: number;
	/** R² of the log-log fit actually stored in `k`/`alpha`. */
	r2: number;
	/** Median |predicted/actual − 1| over the sample, as a percent. */
	spreadPercent: number;
	/** `k` when the exponent is pinned to {@link SHARED_ALPHA} instead. */
	kAtSharedAlpha: number;
	/** Median residual of the pinned-exponent fit, as a percent. */
	spreadAtSharedAlphaPercent: number;
	/** [min, max] Combat Power in the sample. Outside it, the curve extrapolates. */
	cpRange: readonly [number, number];
	/** False when the sample was under {@link MIN_FREE_ALPHA_SAMPLES}. */
	alphaFitted: boolean;
}

/**
 * classId -> fit, over `docs/research/data/yeonmujang-2026-08.csv`.
 *
 * 47 classes; Lethe is in the dataset but is KMS-only and has no entry in
 * `data/classes.ts`, so it is dropped. Hayato, Kanna, Lynn, Mo Xuan,
 * Sia Astelle and Erel Light have no records and are therefore absent —
 * absence means "uncalibrated", not "zero".
 *
 * GENERATED by `node scripts/fit-dpm-anchors.mjs`.
 */
export const CLASS_DPM_FITS: Readonly<Record<string, ClassDpmFit>> = Object.freeze({
	adele: {
		k: 6.117342e4,
		alpha: 1.0984,
		sampleSize: 36,
		r2: 0.9599,
		spreadPercent: 6.3,
		kAtSharedAlpha: 2.658918e4,
		spreadAtSharedAlphaPercent: 6.7,
		cpRange: [301027152, 1411863478],
		alphaFitted: true
	},
	'angelic-buster': {
		k: 2.814928e4,
		alpha: 1.1343,
		sampleSize: 19,
		r2: 0.9821,
		spreadPercent: 3.2,
		kAtSharedAlpha: 2.513316e4,
		spreadAtSharedAlphaPercent: 3.3,
		cpRange: [302115937, 1098391924],
		alphaFitted: true
	},
	aran: {
		k: 9.390668e4,
		alpha: 1.0755,
		sampleSize: 13,
		r2: 0.9303,
		spreadPercent: 3.2,
		kAtSharedAlpha: 2.584542e4,
		spreadAtSharedAlphaPercent: 4.1,
		cpRange: [307031098, 761862448],
		alphaFitted: true
	},
	'arch-mage-fp': {
		k: 1.197938e5,
		alpha: 1.0625,
		sampleSize: 22,
		r2: 0.9694,
		spreadPercent: 4.3,
		kAtSharedAlpha: 2.500517e4,
		spreadAtSharedAlphaPercent: 4.8,
		cpRange: [308840715, 1411363023],
		alphaFitted: true
	},
	'arch-mage-il': {
		k: 2.660251e4,
		alpha: 1.1344,
		sampleSize: 24,
		r2: 0.9687,
		spreadPercent: 5.0,
		kAtSharedAlpha: 2.38042e4,
		spreadAtSharedAlphaPercent: 4.9,
		cpRange: [307462833, 1354860732],
		alphaFitted: true
	},
	ark: {
		k: 2.671975e5,
		alpha: 1.029,
		sampleSize: 19,
		r2: 0.9395,
		spreadPercent: 4.0,
		kAtSharedAlpha: 2.864438e4,
		spreadAtSharedAlphaPercent: 6.0,
		cpRange: [321198065, 998491868],
		alphaFitted: true
	},
	'battle-mage': {
		k: 4.155753e4,
		alpha: 1.1091,
		sampleSize: 12,
		r2: 0.9691,
		spreadPercent: 7.6,
		kAtSharedAlpha: 2.240445e4,
		spreadAtSharedAlphaPercent: 6.6,
		cpRange: [303540292, 1116056741],
		alphaFitted: true
	},
	bishop: {
		k: 8.765731e3,
		alpha: 1.1865,
		sampleSize: 43,
		r2: 0.9673,
		spreadPercent: 4.7,
		kAtSharedAlpha: 2.226351e4,
		spreadAtSharedAlphaPercent: 5.2,
		cpRange: [304999467, 1059071126],
		alphaFitted: true
	},
	blaster: {
		k: 2.310295e4,
		alpha: 1.147,
		sampleSize: 20,
		r2: 0.9755,
		spreadPercent: 3.7,
		kAtSharedAlpha: 2.659402e4,
		spreadAtSharedAlphaPercent: 3.9,
		cpRange: [300799131, 1174706723],
		alphaFitted: true
	},
	'blaze-wizard': {
		k: 2.559405e4,
		alpha: 1.14,
		sampleSize: 7,
		r2: 0.9334,
		spreadPercent: 6.0,
		kAtSharedAlpha: 2.559405e4,
		spreadAtSharedAlphaPercent: 6.0,
		cpRange: [373631135, 1287758510],
		alphaFitted: false
	},
	'bow-master': {
		k: 2.967854e4,
		alpha: 1.1306,
		sampleSize: 26,
		r2: 0.9796,
		spreadPercent: 4.3,
		kAtSharedAlpha: 2.457615e4,
		spreadAtSharedAlphaPercent: 4.3,
		cpRange: [302175143, 1081112181],
		alphaFitted: true
	},
	buccaneer: {
		k: 2.539391e1,
		alpha: 1.4871,
		sampleSize: 11,
		r2: 0.9291,
		spreadPercent: 4.9,
		kAtSharedAlpha: 2.492997e4,
		spreadAtSharedAlphaPercent: 6.3,
		cpRange: [316152894, 596728227],
		alphaFitted: true
	},
	cadena: {
		k: 5.210292e3,
		alpha: 1.2262,
		sampleSize: 34,
		r2: 0.9514,
		spreadPercent: 5.6,
		kAtSharedAlpha: 2.942794e4,
		spreadAtSharedAlphaPercent: 5.8,
		cpRange: [309506008, 901964668],
		alphaFitted: true
	},
	cannoneer: {
		k: 1.521554e5,
		alpha: 1.0488,
		sampleSize: 12,
		r2: 0.9669,
		spreadPercent: 4.8,
		kAtSharedAlpha: 2.431226e4,
		spreadAtSharedAlphaPercent: 4.4,
		cpRange: [309458327, 1133098480],
		alphaFitted: true
	},
	corsair: {
		k: 1.903428e4,
		alpha: 1.1526,
		sampleSize: 19,
		r2: 0.9771,
		spreadPercent: 4.4,
		kAtSharedAlpha: 2.446567e4,
		spreadAtSharedAlphaPercent: 4.3,
		cpRange: [336877218, 972297150],
		alphaFitted: true
	},
	'dark-knight': {
		k: 8.128521e3,
		alpha: 1.1964,
		sampleSize: 15,
		r2: 0.9794,
		spreadPercent: 5.5,
		kAtSharedAlpha: 2.499517e4,
		spreadAtSharedAlphaPercent: 5.0,
		cpRange: [300003327, 907217420],
		alphaFitted: true
	},
	'dawn-warrior': {
		k: 1.948228e4,
		alpha: 1.1526,
		sampleSize: 20,
		r2: 0.9589,
		spreadPercent: 3.9,
		kAtSharedAlpha: 2.501582e4,
		spreadAtSharedAlphaPercent: 4.1,
		cpRange: [300000506, 738557629],
		alphaFitted: true
	},
	'demon-avenger': {
		k: 8.716933e2,
		alpha: 1.3012,
		sampleSize: 20,
		r2: 0.9765,
		spreadPercent: 4.6,
		kAtSharedAlpha: 2.228232e4,
		spreadAtSharedAlphaPercent: 6.6,
		cpRange: [304187449, 1058033539],
		alphaFitted: true
	},
	'demon-slayer': {
		k: 2.053354e4,
		alpha: 1.149,
		sampleSize: 10,
		r2: 0.9897,
		spreadPercent: 2.1,
		kAtSharedAlpha: 2.462376e4,
		spreadAtSharedAlphaPercent: 1.9,
		cpRange: [311647515, 922741709],
		alphaFitted: true
	},
	'dual-blade': {
		k: 1.257067e4,
		alpha: 1.164,
		sampleSize: 39,
		r2: 0.974,
		spreadPercent: 7.4,
		kAtSharedAlpha: 2.04247e4,
		spreadAtSharedAlphaPercent: 6.7,
		cpRange: [300432563, 1624579813],
		alphaFitted: true
	},
	evan: {
		k: 1.785525e4,
		alpha: 1.1544,
		sampleSize: 26,
		r2: 0.9615,
		spreadPercent: 5.2,
		kAtSharedAlpha: 2.379811e4,
		spreadAtSharedAlphaPercent: 5.0,
		cpRange: [304655383, 854328414],
		alphaFitted: true
	},
	hero: {
		k: 9.66712e4,
		alpha: 1.0734,
		sampleSize: 16,
		r2: 0.9819,
		spreadPercent: 3.7,
		kAtSharedAlpha: 2.543973e4,
		spreadAtSharedAlphaPercent: 4.4,
		cpRange: [305675119, 966219936],
		alphaFitted: true
	},
	hoyoung: {
		k: 1.88415e5,
		alpha: 1.0431,
		sampleSize: 15,
		r2: 0.9824,
		spreadPercent: 2.6,
		kAtSharedAlpha: 2.672221e4,
		spreadAtSharedAlphaPercent: 3.1,
		cpRange: [325147829, 1034186821],
		alphaFitted: true
	},
	illium: {
		k: 3.665329e4,
		alpha: 1.1206,
		sampleSize: 13,
		r2: 0.9909,
		spreadPercent: 2.8,
		kAtSharedAlpha: 2.479741e4,
		spreadAtSharedAlphaPercent: 3.1,
		cpRange: [313253818, 950683247],
		alphaFitted: true
	},
	kain: {
		k: 2.652292e5,
		alpha: 1.03,
		sampleSize: 20,
		r2: 0.9719,
		spreadPercent: 4.1,
		kAtSharedAlpha: 2.908032e4,
		spreadAtSharedAlphaPercent: 7.3,
		cpRange: [332304826, 1081101770],
		alphaFitted: true
	},
	kaiser: {
		k: 1.98846e5,
		alpha: 1.0393,
		sampleSize: 10,
		r2: 0.9868,
		spreadPercent: 3.5,
		kAtSharedAlpha: 2.558988e4,
		spreadAtSharedAlphaPercent: 3.5,
		cpRange: [317638768, 1528195484],
		alphaFitted: true
	},
	khali: {
		k: 3.032748e4,
		alpha: 1.1381,
		sampleSize: 18,
		r2: 0.9829,
		spreadPercent: 4.5,
		kAtSharedAlpha: 2.918859e4,
		spreadAtSharedAlphaPercent: 4.4,
		cpRange: [306049443, 1022922738],
		alphaFitted: true
	},
	kinesis: {
		k: 2.646961e4,
		alpha: 1.14,
		sampleSize: 5,
		r2: 0.9704,
		spreadPercent: 3.8,
		kAtSharedAlpha: 2.646961e4,
		spreadAtSharedAlphaPercent: 3.8,
		cpRange: [301598545, 814013880],
		alphaFitted: false
	},
	lara: {
		k: 2.963021e4,
		alpha: 1.1309,
		sampleSize: 22,
		r2: 0.9442,
		spreadPercent: 5.4,
		kAtSharedAlpha: 2.470288e4,
		spreadAtSharedAlphaPercent: 5.3,
		cpRange: [302438558, 1072467354],
		alphaFitted: true
	},
	luminous: {
		k: 1.8074e4,
		alpha: 1.1581,
		sampleSize: 11,
		r2: 0.9795,
		spreadPercent: 3.3,
		kAtSharedAlpha: 2.599909e4,
		spreadAtSharedAlphaPercent: 2.7,
		cpRange: [312482125, 1039015548],
		alphaFitted: true
	},
	marksman: {
		k: 2.449349e4,
		alpha: 1.14,
		sampleSize: 7,
		r2: 0.9735,
		spreadPercent: 5.3,
		kAtSharedAlpha: 2.449349e4,
		spreadAtSharedAlphaPercent: 5.3,
		cpRange: [312048376, 1132809874],
		alphaFitted: false
	},
	mechanic: {
		k: 2.44914e4,
		alpha: 1.14,
		sampleSize: 7,
		r2: 0.9094,
		spreadPercent: 3.7,
		kAtSharedAlpha: 2.44914e4,
		spreadAtSharedAlphaPercent: 3.7,
		cpRange: [390715151, 803459659],
		alphaFitted: false
	},
	mercedes: {
		k: 1.199612e5,
		alpha: 1.0647,
		sampleSize: 28,
		r2: 0.9668,
		spreadPercent: 5.7,
		kAtSharedAlpha: 2.633354e4,
		spreadAtSharedAlphaPercent: 6.6,
		cpRange: [300119760, 1263686264],
		alphaFitted: true
	},
	mihile: {
		k: 4.048877e4,
		alpha: 1.1127,
		sampleSize: 14,
		r2: 0.9586,
		spreadPercent: 6.1,
		kAtSharedAlpha: 2.344629e4,
		spreadAtSharedAlphaPercent: 5.7,
		cpRange: [323840902, 850903348],
		alphaFitted: true
	},
	'night-lord': {
		k: 7.611077e4,
		alpha: 1.0825,
		sampleSize: 19,
		r2: 0.9753,
		spreadPercent: 3.3,
		kAtSharedAlpha: 2.383544e4,
		spreadAtSharedAlphaPercent: 6.1,
		cpRange: [302512304, 1070625876],
		alphaFitted: true
	},
	'night-walker': {
		k: 3.947527e3,
		alpha: 1.2318,
		sampleSize: 15,
		r2: 0.9675,
		spreadPercent: 5.8,
		kAtSharedAlpha: 2.490639e4,
		spreadAtSharedAlphaPercent: 6.9,
		cpRange: [307613551, 871669470],
		alphaFitted: true
	},
	paladin: {
		k: 4.059096e4,
		alpha: 1.1127,
		sampleSize: 14,
		r2: 0.9609,
		spreadPercent: 5.8,
		kAtSharedAlpha: 2.342813e4,
		spreadAtSharedAlphaPercent: 6.7,
		cpRange: [319544661, 1111398774],
		alphaFitted: true
	},
	pathfinder: {
		k: 8.884125e4,
		alpha: 1.0783,
		sampleSize: 18,
		r2: 0.9772,
		spreadPercent: 3.3,
		kAtSharedAlpha: 2.569111e4,
		spreadAtSharedAlphaPercent: 3.8,
		cpRange: [308540013, 962844194],
		alphaFitted: true
	},
	phantom: {
		k: 9.96076e4,
		alpha: 1.0708,
		sampleSize: 29,
		r2: 0.9266,
		spreadPercent: 5.4,
		kAtSharedAlpha: 2.500776e4,
		spreadAtSharedAlphaPercent: 5.8,
		cpRange: [303021426, 1200986576],
		alphaFitted: true
	},
	ren: {
		k: 7.736575e4,
		alpha: 1.0823,
		sampleSize: 45,
		r2: 0.9506,
		spreadPercent: 3.5,
		kAtSharedAlpha: 2.433257e4,
		spreadAtSharedAlphaPercent: 4.9,
		cpRange: [300260819, 1280814012],
		alphaFitted: true
	},
	shade: {
		k: 2.474672e4,
		alpha: 1.1377,
		sampleSize: 8,
		r2: 0.9791,
		spreadPercent: 4.9,
		kAtSharedAlpha: 2.362662e4,
		spreadAtSharedAlphaPercent: 4.9,
		cpRange: [337461699, 1126000268],
		alphaFitted: true
	},
	shadower: {
		k: 5.033238e4,
		alpha: 1.1039,
		sampleSize: 19,
		r2: 0.9648,
		spreadPercent: 3.9,
		kAtSharedAlpha: 2.43867e4,
		spreadAtSharedAlphaPercent: 3.9,
		cpRange: [300977792, 992169415],
		alphaFitted: true
	},
	'thunder-breaker': {
		k: 2.728302e4,
		alpha: 1.14,
		sampleSize: 7,
		r2: 0.9603,
		spreadPercent: 8.4,
		kAtSharedAlpha: 2.728302e4,
		spreadAtSharedAlphaPercent: 8.4,
		cpRange: [372570520, 1048553161],
		alphaFitted: false
	},
	'wild-hunter': {
		k: 2.435127e4,
		alpha: 1.14,
		sampleSize: 7,
		r2: 0.9407,
		spreadPercent: 8.4,
		kAtSharedAlpha: 2.435127e4,
		spreadAtSharedAlphaPercent: 8.4,
		cpRange: [315879228, 869404986],
		alphaFitted: false
	},
	'wind-archer': {
		k: 8.17667e3,
		alpha: 1.1979,
		sampleSize: 23,
		r2: 0.9482,
		spreadPercent: 5.4,
		kAtSharedAlpha: 2.589534e4,
		spreadAtSharedAlphaPercent: 4.5,
		cpRange: [305409438, 914025557],
		alphaFitted: true
	},
	xenon: {
		k: 1.065854e4,
		alpha: 1.1844,
		sampleSize: 20,
		r2: 0.9691,
		spreadPercent: 5.8,
		kAtSharedAlpha: 2.598092e4,
		spreadAtSharedAlphaPercent: 6.3,
		cpRange: [300733711, 1147161742],
		alphaFitted: true
	},
	zero: {
		k: 2.704333e4,
		alpha: 1.1422,
		sampleSize: 28,
		r2: 0.955,
		spreadPercent: 6.2,
		kAtSharedAlpha: 2.823322e4,
		spreadAtSharedAlphaPercent: 6.1,
		cpRange: [300846466, 871669858],
		alphaFitted: true
	}
});

/* -------------------------------------------------------------------------- */
/* Reading a fit                                                               */
/* -------------------------------------------------------------------------- */

export interface DpmFitOptions {
	/**
	 * `per-class` (default) uses the class's own fitted exponent when its sample
	 * supports one; `shared` pins every class to {@link SHARED_ALPHA}.
	 *
	 * The two agree closely inside the fitted band (the five priority classes
	 * land within 3% of each other at CP 6.56e8) and their in-sample residuals
	 * are near-identical. They diverge when EXTRAPOLATING far below the band,
	 * where the flatter shared exponent is the safer of the two — Buccaneer's
	 * free alpha is 1.49 and Demon Avenger's 1.30.
	 */
	alphaMode?: 'per-class' | 'shared';
}

/** The fit for a class, or `null` when the dataset has no records for it. */
export function getDpmFit(classId: string): ClassDpmFit | null {
	return CLASS_DPM_FITS[classId] ?? null;
}

/** True when the dataset covers at least one class. Sanity guard, not a feature flag. */
export function hasAnyAnchor(): boolean {
	return Object.keys(CLASS_DPM_FITS).length > 0;
}

/**
 * `DPM_dummy = k * combatPower ** alpha` — what this class does on the 연무장
 * dummy at this Combat Power, in raw damage per minute.
 *
 * Returns `null` when the class has no records or the Combat Power is missing
 * or non-positive; callers must read `null` as "the DPM model cannot run",
 * never as zero and never as licence to borrow another class's curve.
 *
 * Confidence is `estimated` inside the fitted CP band and `speculative` outside
 * it — dpm-anchors.md §6 is explicit that extrapolating below 전투력 3억 is
 * unsupported, and the entry gate for 연무장 means there is no data down there.
 */
export function getAnchorDpm(
	classId: string,
	combatPower?: number,
	options: DpmFitOptions = {}
): Sourced<number> | null {
	const fit = getDpmFit(classId);
	if (!fit) return null;
	if (combatPower == null || !Number.isFinite(combatPower) || combatPower <= 0) return null;

	const shared = options.alphaMode === 'shared';
	const alpha = shared ? SHARED_ALPHA : fit.alpha;
	const k = shared ? fit.kAtSharedAlpha : fit.k;
	const spread = shared ? fit.spreadAtSharedAlphaPercent : fit.spreadPercent;
	const value = k * combatPower ** alpha;

	const [cpMin, cpMax] = fit.cpRange;
	const outOfBand = combatPower < cpMin || combatPower > cpMax;

	const note =
		`KMS 연무장 ${ANCHOR_MEASURED_AT}: DPM = ${k.toPrecision(4)} x CP^${alpha.toFixed(3)} ` +
		`fitted over ${fit.sampleSize} trusted record${fit.sampleSize === 1 ? '' : 's'} ` +
		`(R² ${fit.r2.toFixed(2)}, median residual ${spread.toFixed(1)}%)` +
		(outOfBand
			? `. EXTRAPOLATED: Combat Power ${Math.round(combatPower).toLocaleString('en-US')} is outside the fitted band ` +
				`${Math.round(cpMin).toLocaleString('en-US')}-${Math.round(cpMax).toLocaleString('en-US')}, where the dataset has no records.`
			: '.');

	return { value, confidence: outOfBand ? 'speculative' : 'estimated', note };
}

/* -------------------------------------------------------------------------- */
/* The self-measurement path (dpm-anchors.md §7.1)                             */
/* -------------------------------------------------------------------------- */

/**
 * The 8.8 Challenge dummy, as a `Target` (bosses.md §5.6).
 *
 * Level 1 (so the level-advantage multiplier is pinned at its 1.20 cap) and
 * 380% defence rate, with no force requirement. This is the frame's own
 * measurement condition for the older, community 8.8 standard, kept because it
 * is what a user reproduces in the GMS Training Room when they measure their
 * own DPM (§7.1) — the one route to a GMS-native number, since 연무장 does not
 * exist in GMS.
 *
 * It is NOT the target the fitted anchors are measured on; that is
 * {@link DUMMY_TARGET}.
 */
export const ANCHOR_TARGET: Target = { id: '8.8-dummy', pdr: 3.8, level: 1 };

/**
 * Everything about a hand-transcribed anchor character that is not class-specific.
 *
 * !!! EVERY NUMBER HERE IS UNVERIFIED !!!
 *
 * The 8.8 rules constrain the character by 환산 주스탯 (87,000-89,000) and
 * kms-tools.md §3 records that **환산 has no published closed form**, so there
 * is no way to reconstruct a real 8.8 stat window from the rules alone. What is
 * below is a placeholder shaped like a maxed KMS endgame stat window.
 *
 * It is reached ONLY when a caller passes `anchorDpm` without an `anchorFrame`
 * — i.e. "here is a DPM I measured, scale it for me". The shipped path does not
 * touch it: {@link getAnchorDpm} needs no frame, because the character is its
 * own frame (see the module header's transfer ratio).
 */
export interface AnchorFrameSpec {
	level: number;
	/** Total main stat. Read as the 환산 midpoint of the 8.8 rule's 87k-89k band. */
	mainStat: number;
	secondaryStat: number;
	attack: number;
	damagePercent: number;
	bossDamagePercent: number;
	finalDamagePercent: number;
	ignoreDefensePercent: number;
	criticalRatePercent: number;
	criticalDamagePercent: number;
	arcaneForce: number;
	sacredForce: number;
}

export const ANCHOR_FRAME_SPEC: AnchorFrameSpec = {
	// Level: the 8.8 rules require the level-275 chair as doping but do not fix
	// the character's level; KMS 8.8 entrants are at or near the 285 soft cap.
	level: 285,
	// bosses.md §5.6: "HEXA-converted main stat in 8.7-8.9만". Midpoint.
	mainStat: 88_000,
	// UNVERIFIED placeholders below this line.
	secondaryStat: 5_000,
	attack: 2_000,
	damagePercent: 90,
	bossDamagePercent: 320,
	finalDamagePercent: 0,
	ignoreDefensePercent: 95,
	criticalRatePercent: 100,
	criticalDamagePercent: 90,
	// symbols.ts: Arcane practical max 1450 (symbols 1320 + guild 30 + hyper 100),
	// Sacred practical max 880. A fully-doped 8.8 entrant is assumed capped on
	// both, so that the boss-side force term of the ratio is the *user's* deficit
	// rather than the frame's.
	arcaneForce: ARCANE_FORCE_PRACTICAL_MAX,
	sacredForce: SACRED_FORCE_PRACTICAL_MAX
};

/** How much to trust {@link ANCHOR_FRAME_SPEC}. Not much. */
export const ANCHOR_FRAME_CONFIDENCE: Confidence = 'speculative';

function triple(base: number): StatTriple {
	return { base, percent: 0, flat: 0 };
}

/**
 * Materialise {@link ANCHOR_FRAME_SPEC} as a `CalcInput` for one class.
 *
 * The frame MUST carry the user's own `classId`: `damageIndex` resolves the
 * primary/secondary stat keys, the weapon constant and mastery from the class,
 * and those only cancel out of `D(you)/D(frame)` when both sides are the same
 * class.
 */
export function anchorFrameFor(classId: string): CalcInput {
	const cls = getClass(classId);
	const s = ANCHOR_FRAME_SPEC;

	const stats: Record<StatKey, StatTriple> = {
		str: triple(4),
		dex: triple(4),
		int: triple(4),
		luk: triple(4),
		hp: triple(0)
	};
	for (const key of cls.primary) stats[key] = triple(s.mainStat);
	for (const key of cls.secondary) stats[key] = triple(s.secondaryStat);

	const att = triple(s.attack);
	return {
		level: s.level,
		classId,
		stats,
		attack: cls.usesMagicAttack ? triple(0) : att,
		magicAttack: cls.usesMagicAttack ? att : triple(0),
		damagePercent: s.damagePercent,
		bossDamagePercent: s.bossDamagePercent,
		finalDamagePercent: s.finalDamagePercent,
		ignoreDefensePercent: s.ignoreDefensePercent,
		criticalRatePercent: s.criticalRatePercent,
		criticalDamagePercent: s.criticalDamagePercent,
		arcaneForce: s.arcaneForce,
		sacredForce: s.sacredForce
	};
}

/**
 * The 8.8 anchor frame and the dummy it was measured against.
 *
 * `input` is materialised for a reference class so the constant can be inspected
 * and diffed; use {@link anchorFrameFor} (or {@link getAnchorFrame}) to get the
 * frame for the class actually being analysed.
 */
export const ANCHOR_FRAME: { input: CalcInput; target: Target; confidence: Confidence } = {
	input: anchorFrameFor('hero'),
	target: ANCHOR_TARGET,
	confidence: ANCHOR_FRAME_CONFIDENCE
};

/** The frame a hand-supplied `anchorDpm` is assumed to have been measured on. */
export function getAnchorFrame(classId: string): CalcInput {
	return anchorFrameFor(classId);
}

/* -------------------------------------------------------------------------- */
/* Priority classes                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The five classes the user actually plays, in the user's stated priority order.
 * All five have fits; the list exists so tests and tooling can assert that.
 */
export const ANCHOR_PRIORITY_CLASSES: readonly string[] = Object.freeze([
	'ren',
	'hero',
	'wind-archer',
	'battle-mage',
	'night-walker'
]);
