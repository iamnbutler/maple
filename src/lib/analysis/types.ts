// The analysis contract.
//
// This is the single interface between the game-math engine, the API and the
// UI. It is owned by the design (docs/plans/2026-09-06-maple-design.md §4, §5,
// §9) rather than by any one implementation module, so that the UI can be built
// against it in parallel with the engine.
//
// Conventions, matching src/lib/calc/types.ts:
//   * every "...Percent" field is a WHOLE percent — `40` means 40%.
//   * multipliers and ratios are plain numbers (`1.25`).
//   * absent/unknown values are `undefined`, never `0`.
//   * mesos are raw integers, not millions.

import type { CalcInput, Delta, Target } from '$lib/calc/types';
import type { SetProgress } from './sets';

/* -------------------------------------------------------------------------- */
/* Targets                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A named target the analysis is computed against. `arcane` and `grandis` are
 * the two standing presets (design §4); anything else is a boss id from
 * src/lib/data/bosses.ts.
 */
export interface NamedTarget extends Target {
	id: string;
	label: string;
	/** `preset` for arcane/grandis, `boss` for a row from the boss dataset. */
	kind: 'preset' | 'boss';
}

/* -------------------------------------------------------------------------- */
/* How confident are we in a number?                                           */
/* -------------------------------------------------------------------------- */

/**
 * Every derived number the user might act on carries a confidence, because the
 * research behind this project is uneven: some values are transcribed from
 * client data, others are one blogger's opinion.
 *
 *   `exact`       — reproduces a game-displayed number, or is pure arithmetic
 *                   over sourced data.
 *   `sourced`     — computed from a cited table that we trust.
 *   `estimated`   — a documented model with real inputs, but the model itself
 *                   is an approximation (e.g. expected cube cost).
 *   `speculative` — the underlying data is UNVERIFIED or community-guessed.
 */
export type Confidence = 'exact' | 'sourced' | 'estimated' | 'speculative';

/** A number plus why we believe it. */
export interface Sourced<T> {
	value: T;
	confidence: Confidence;
	/** Short human note, e.g. "weapon 26-30* is not publicly documented". */
	note?: string;
}

/* -------------------------------------------------------------------------- */
/* Character summary                                                           */
/* -------------------------------------------------------------------------- */

/** The headline numbers shown at the top of a character page. */
export interface CharacterSummary {
	characterId: string;
	name: string;
	classId: string;
	className: string;
	level: number;
	world?: string;

	/** Relative boss-damage scalar at the requested target. Not a game number. */
	damageIndex: number;
	/** The same scalar at the two standing presets, for cross-target comparison. */
	damageIndexArcane: number;
	damageIndexGrandis: number;

	/** Reproduces the in-game stat window range (calc.displayedRange). */
	range: { min: number; max: number };
	/** Reproduces the in-game Combat Power (calc.computeCombatPower). */
	combatPower: Sourced<number>;

	/** Composed totals actually fed to the damage formula. */
	totals: {
		mainStat: number;
		secondaryStat: number;
		attack: number;
		statMultiplier: number;
		damagePercent: number;
		bossDamagePercent: number;
		finalDamagePercent: number;
		ignoreDefensePercent: number;
		criticalRatePercent: number;
		criticalDamagePercent: number;
		arcaneForce?: number;
		sacredForce?: number;
	};
}

/* -------------------------------------------------------------------------- */
/* Calibration — do the captured numbers hang together?                        */
/* -------------------------------------------------------------------------- */

/**
 * A comparison between a value we computed and the value the game displayed,
 * as captured in `StatWindow.displayed`. This is how the user finds out that a
 * screenshot was misread, and it is the reason Combat Power is computed at all
 * (design §2 — CP is a checksum, never a ranking metric).
 */
export interface Checksum {
	label: string;
	computed: number;
	displayed?: number;
	/** `(computed - displayed) / displayed`, as a whole percent. */
	deltaPercent?: number;
	/**
	 * `match` / `close` / `mismatch` compare two numbers that should be equal.
	 *
	 * `within-bound` / `over-bound` are for a checksum whose computed value is
	 * only a BOUND on the displayed one — see `kind`. `within-bound` is the
	 * healthy state and carries no information about how far apart they are.
	 */
	status: 'match' | 'close' | 'mismatch' | 'missing' | 'within-bound' | 'over-bound';
	/**
	 * `point` (default) — computed and displayed should be equal.
	 * `upper-bound` — computed is the largest value the displayed one could
	 *   legitimately take, so anything at or below it is consistent. Used for
	 *   Combat Power, which the game computes on SKILL-STRIPPED stats while a
	 *   stat-window capture is inherently buffed; every unknown skill
	 *   contribution can only push the true value down.
	 */
	kind?: 'point' | 'upper-bound';
	/** Why this checksum reads the way it does. */
	note?: string;
}

/**
 * What the character's gear accounts for versus what the stat window shows.
 * The residual is the class/link/legion/buff contribution, which we cannot
 * reconstruct bottom-up (design §2) and therefore treat as an opaque baseline.
 */
export interface GearResidual {
	stat: string;
	fromGear: number;
	fromStatWindow: number;
	residual: number;
}

export interface Calibration {
	checksums: Checksum[];
	residuals: GearResidual[];
	/** Schema/consistency warnings, e.g. a tooltip breakdown that doesn't sum. */
	warnings: string[];
}

/* -------------------------------------------------------------------------- */
/* Upgrades                                                                    */
/* -------------------------------------------------------------------------- */

export type UpgradeKind =
	| 'starforce'
	| 'flame'
	| 'potential'
	| 'bonus-potential'
	| 'symbol'
	| 'hyper-stat'
	| 'stat-line'
	/** Crossing an equipment-set piece-count threshold. */
	| 'set';

/** What an upgrade costs. Any field may be absent when we cannot source it. */
export interface UpgradeCost {
	mesos?: number;
	/** Real-world days, for daily-gated progress like symbols. */
	days?: number;
	/** Hyper stat points, Legion coins, etc. */
	points?: number;
	note?: string;
}

/**
 * How attainable a candidate actually is.
 *
 *   `routine`  — a bounded, repeatable action: stars, a flame, a symbol level.
 *                The cost model is a real expectation.
 *   `grind`    — expensive but a normal progression goal.
 *   `ceiling`  — the BEST CASE for a slot, not an action. Rolling three
 *                specific legendary lines is a jackpot whose true cost we
 *                cannot compute (see `RankedUpgrade.cost.note`), so these show
 *                the headroom in a slot and must never be ranked as advice
 *                against a routine action.
 */
export type Feasibility = 'routine' | 'grind' | 'ceiling';

/** One candidate change, scored. */
export interface RankedUpgrade {
	id: string;
	kind: UpgradeKind;
	/** Short action label, e.g. "Arcane Umbra Cape 17★ → 18★". */
	label: string;
	/** Longer explanation of what changes. */
	detail?: string;
	slot?: string;
	itemName?: string;

	/** The change applied to the CalcInput to score this candidate. */
	delta: Delta;

	/** Absolute boss-damage gain, as a whole percent. THE headline number. */
	gainPercent: number;
	cost: UpgradeCost;
	/** `gainPercent / (mesos / 1e9)`, when mesos are known. */
	gainPerBillionMesos?: number;
	/** `gainPercent / days`, when days are known. */
	gainPerDay?: number;

	confidence: Confidence;
	/** Defaults to `routine` when absent. */
	feasibility?: Feasibility;
	notes?: string[];
}

/**
 * The "what is 1 more of X worth right now" diagnostic table. This is not a
 * to-do list — it explains WHY the ranking looks the way it does, and it is
 * recomputed from current totals every time because stat equivalence is only
 * valid at the current configuration (formulas.md §3.4).
 */
export interface StatWorth {
	label: string;
	/** e.g. `+1 ATT`, `+1% boss`, `+10 main stat`. */
	delta: Delta;
	gainPercent: number;
	/** Expressed in main-stat-equivalent units, the community's common currency. */
	mainStatEquivalent?: number;
}

/* -------------------------------------------------------------------------- */
/* Boss board (design §9)                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A verdict on one axis. `blocked` means a hard gate fails (character level,
 * or a force deficit so large the damage penalty makes the fight pointless).
 */
export type BossVerdict =
	'comfortable' | 'possible' | 'minimum' | 'out-of-reach' | 'blocked' | 'uncalibrated';

export interface BossAxis {
	verdict: BossVerdict;
	/**
	 * Your estimated damage over the damage required to clear in the time limit.
	 * 1.0 = exactly on the cut. Absent when uncalibrated.
	 */
	ratio?: number;
	/** Estimated clear time in minutes, when a DPM anchor exists. */
	clearMinutes?: number;
	reason?: string;
}

/**
 * How relevant a boss is to a progressing character, used to keep the board
 * free of filler.
 *
 *   `trivial` — below Chaos Zakum. Never shown, under any option; the engine
 *               drops these rows entirely.
 *   `early`   — Chaos Zakum up to but excluding Normal Lotus. Hidden unless
 *               `BossBoardOptions.includeEarlyBosses` is set.
 *   `current` — Normal Lotus and above. Always shown.
 *
 * (GMS Zakum difficulties are Easy/Normal/Chaos — "hard zak" colloquially means
 * Chaos Zakum, which is where the floor sits.)
 */
export type BossTier = 'trivial' | 'early' | 'current';

export interface BossRow {
	bossId: string;
	bossName: string;
	difficulty: string;
	tier: BossTier;
	level: number;
	entryLevel: number;
	totalHp?: number;

	/** Hard gates, evaluated before any DPM model. */
	gates: {
		levelOk: boolean;
		/** Damage multiplier from the force check (1.0 = at requirement). */
		forceMultiplier: number;
		forceType: 'arcane' | 'sacred' | 'none';
		forceRequired?: number;
		forceHave?: number;
		/** Advisory only — the CP gate is CMS-sourced (bosses.md §3.1). */
		combatPowerOk?: boolean;
	};

	/** Damage needed to earn loot as a blue dot: 5% of total HP (bosses.md §2.2). */
	carryDamageRequired?: number;

	solo: BossAxis;
	party: BossAxis;
	carried: BossAxis;

	crystalMesos?: number;
	notes?: string[];
}

export interface BossBoard {
	/** Never contains `tier: 'trivial'` rows. */
	rows: BossRow[];
	/** False until per-class DPM anchors exist; UI must label verdicts accordingly. */
	calibrated: boolean;
	/** How many rows fell into each tier before filtering, for "N hidden" copy. */
	tierCounts?: Record<BossTier, number>;
	note?: string;
}

/* -------------------------------------------------------------------------- */
/* The whole thing                                                             */
/* -------------------------------------------------------------------------- */

export interface AnalysisOptions {
	/** `arcane` | `grandis` | a boss id. Defaults to `grandis`. */
	target?: string;
	/** Cap on ranked upgrades returned. Defaults to 40. */
	topN?: number;
	/** Restrict the candidate generators. Defaults to all. */
	kinds?: UpgradeKind[];
	/** Include the boss board. Defaults to true. */
	includeBossBoard?: boolean;
	/** Show `tier: 'early'` bosses (Chaos Zakum → pre-Normal-Lotus). Defaults to false. */
	includeEarlyBosses?: boolean;
}

export interface Analysis {
	generatedAt: string;
	target: NamedTarget;
	summary: CharacterSummary;
	calibration: Calibration;
	upgrades: RankedUpgrade[];
	statWorth: StatWorth[];
	/** Set membership and how close each set is to its next threshold. */
	sets?: SetProgress[];
	bossBoard?: BossBoard;
	/** The CalcInput the analysis ran on — lets the UI show its work. */
	input: CalcInput;
}

/** Response shape of POST /api/characters/:id/what-if. */
export interface WhatIfResult {
	target: NamedTarget;
	before: number;
	after: number;
	gainPercent: number;
	/** Per-delta marginal gains, in the order supplied. Sums will NOT equal the
	 * joint gain — that is the point of evaluating jointly (formulas.md §3.4). */
	marginal: { delta: Delta; gainPercent: number }[];
}
