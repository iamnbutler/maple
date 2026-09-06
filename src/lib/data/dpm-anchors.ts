// Per-class DPM anchors for the boss board's clear-time model.
//
// WHY THIS MODULE EXISTS
// ----------------------
// `calc.damageIndex` returns a RELATIVE scalar, not a real DPM (formulas.md
// §3.1). To turn it into "will I clear this in the time limit?" the board needs
// exactly one calibration point per class: a known (damage index, real DPM)
// pair. Then, for any boss target,
//
//     estimatedDpm = anchorDpm * damageIndex(you, boss) / damageIndex(frame, boss)
//
// (design §9). Every factor the two characters share cancels; everything that
// differs — stat, ATT, %boss, IED, crit, level gap, Arcane/Sacred Force — is
// carried by the ratio. The frame is evaluated against the SAME boss target as
// the user, which is what makes the force and level terms behave.
//
// THE STANDARD
// ------------
// The community's only shared measurement standard is the KMS "8.8 Challenge"
// (bosses.md §5.6): a character whose HEXA-converted main stat (헥산산 / 환산
// 주스탯) sits in 87,000-89,000, fighting a training-ground dummy that is Large,
// Boss-flagged, **Level 1**, **380% defence rate**, elemental-halving, infinite
// HP, for >= 2 Origin cycles (~11 min 20 s), with all training-ground doping up.
// Per-class DPM charts published against that standard are what would populate
// `CLASS_ANCHORS` below.
//
// STATUS: UNCALIBRATED
// --------------------
// No per-class 8.8 DPM figure in this repo's research is trustworthy enough to
// ship. bosses.md §5.6 names the chart *publishers* (Inven, FMKorea, Arca.live,
// Vortex Gaming) and kms-tools.md §2.7 names the *source* (maplescouter.com/88dpm,
// now 404, plus the in-game Battle Arena ranking) — but neither file transcribes
// a single class's number, and formulas.md §6280 is explicit: "Absolute DPM /
// 'you will clear X': don't claim it."
//
// So every entry is `null`. `buildBossBoard` reports `calibrated: false` and
// emits `uncalibrated` verdicts on every DPM-derived axis, which is exactly the
// contract's `BossVerdict.uncalibrated` / `BossBoard.calibrated` escape hatch.
// The deterministic parts of the board (entry level, force multiplier, the 5%
// carry number, CP floors) are unaffected and still correct.
//
// TO CALIBRATE ONE CLASS you need, from a single published 8.8 run:
//   1. the stat window shown before the run (the rules require it on video), and
//   2. the DPM that run scored.
// Transcribe (1) into a `frame` override and (2) into `dpm`, set confidence to
// `estimated` (the model is an approximation even with real inputs) and cite the
// post. Do NOT interpolate one class's number from another's.

import type { Confidence, Sourced } from '../analysis/types';
import type { CalcInput, StatKey, StatTriple, Target } from '../calc/types';
import { getClass } from './classes';
import { ARCANE_FORCE_PRACTICAL_MAX, SACRED_FORCE_PRACTICAL_MAX } from './symbols';

/* -------------------------------------------------------------------------- */
/* The 8.8 dummy                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The 8.8 Challenge dummy, as a `Target` (bosses.md §5.6).
 *
 * Level 1 (so the level-advantage multiplier is pinned at its 1.20 cap), 380%
 * defence rate, and **no force requirement** — a training-ground dummy is not in
 * Arcane River or Grandis, so neither force system applies to it.
 *
 * This target is the frame's own measurement condition. It is NOT the target the
 * board divides by: `buildBossBoard` evaluates both the user and the frame
 * against the *boss*, so that level gap and force deficit stay in the ratio.
 */
export const ANCHOR_TARGET: Target = { id: '8.8-dummy', pdr: 3.8, level: 1 };

/* -------------------------------------------------------------------------- */
/* The frame                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Everything about the anchor character that is not class-specific.
 *
 * !!! EVERY NUMBER HERE IS UNVERIFIED !!!
 *
 * The 8.8 rules constrain the character by 환산 주스탯 (87,000-89,000), and
 * kms-tools.md §3 records that **환산 has no published closed form** — it is
 * "convert every multiplier into the equivalent main stat under a standardised
 * doping frame", and the doping frame is not published either. There is
 * therefore no way to reconstruct a real 8.8 stat window from the rules alone.
 *
 * What is written below is a placeholder shaped like a maxed KMS endgame stat
 * window, with `mainStat` set to the midpoint of the rule's own 87k-89k band on
 * the reading that 환산 *is* an equivalent main stat. It is `speculative` and it
 * is never reached in shipped output, because every `CLASS_ANCHORS` entry is
 * `null` and `buildBossBoard` short-circuits before touching the frame. It
 * exists so the shape of the calibration is checked into the repo and so the
 * tests can exercise the arithmetic.
 *
 * Replace it wholesale — do not tune it — with a transcribed stat window from a
 * real 8.8 run when one is sourced.
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
 * class. Anchor DPM is per-class for the same reason.
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

/* -------------------------------------------------------------------------- */
/* Per-class anchors                                                          */
/* -------------------------------------------------------------------------- */

export interface ClassDpmAnchor {
	/**
	 * DPM this class scored on the 8.8 dummy, or `null` when no trustworthy
	 * figure has been sourced. `null` is the honest default — see the module
	 * header.
	 */
	dpm: Sourced<number> | null;
	/**
	 * Stat window of the run that produced `dpm`, when it differs from
	 * {@link ANCHOR_FRAME_SPEC}. A real calibration will always set this, because
	 * two 8.8 runs are only "the same spec" to within the rule's 환산 band.
	 */
	frame?: CalcInput;
}

/**
 * The five classes the user actually plays, first, because those are the anchors
 * worth hunting for. Order is the user's stated priority.
 */
export const ANCHOR_PRIORITY_CLASSES: readonly string[] = Object.freeze([
	'ren',
	'hero',
	'wind-archer',
	'battle-mage',
	'night-walker'
]);

/**
 * classId -> anchor. Every value is `null` until a per-class 8.8 DPM figure is
 * transcribed from a cited source; see the module header for what a real entry
 * needs. Classes absent from this map are equally uncalibrated — the map is a
 * to-do list, not a whitelist.
 */
export const CLASS_ANCHORS: Readonly<Record<string, ClassDpmAnchor>> = Object.freeze({
	// --- the user's five, prioritised -------------------------------------
	ren: { dpm: null },
	hero: { dpm: null },
	'wind-archer': { dpm: null },
	'battle-mage': { dpm: null },
	'night-walker': { dpm: null }
});

/**
 * The 8.8 DPM anchor for a class, or `null` when we have none.
 *
 * Currently returns `null` for every class. Callers must treat `null` as "the
 * DPM model cannot run" and fall back to the deterministic half of the board —
 * never as zero, and never by substituting another class's number.
 */
export function getAnchorDpm(classId: string): Sourced<number> | null {
	return CLASS_ANCHORS[classId]?.dpm ?? null;
}

/** The frame that `getAnchorDpm(classId)` was measured on. */
export function getAnchorFrame(classId: string): CalcInput {
	return CLASS_ANCHORS[classId]?.frame ?? anchorFrameFor(classId);
}

/** True when at least one class has a real DPM anchor. */
export function hasAnyAnchor(): boolean {
	return Object.values(CLASS_ANCHORS).some((a) => a.dpm !== null);
}
