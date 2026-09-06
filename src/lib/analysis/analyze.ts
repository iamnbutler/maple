// `analyze(character, options) -> Analysis` — the one function the API calls.
//
// It composes the whole layer: adapter -> checksums + gear residuals ->
// candidates -> ranking -> stat worth, all against one resolved target.
//
// The boss board (design §9) lives in a sibling module owned by another
// workstream. It is loaded lazily and defensively so that this module — and its
// tests — work whether or not that file exists yet.

import * as calc from '$lib/calc';
import type { CalcInput, Delta } from '$lib/calc/types';
import { getClass } from '$lib/data/classes';
import type { Character } from '$lib/schema';

import { toCalcInput } from './adapter';
import { buildBossBoard } from './boss-board';
import { generateCandidates } from './candidates';
import { buildChecksums, combatPowerFor } from './checksums';
import { residuals, summarizeGear } from './gear';
import { DEFAULT_TOP_N, rankCandidates } from './rank';
import { statWorth } from './stat-worth';
import { PRESET_TARGETS, resolveTarget } from './targets';
import type {
	Analysis,
	AnalysisOptions,
	BossBoard,
	CharacterSummary,
	NamedTarget,
	WhatIfResult
} from './types';

/**
 * The contract `src/lib/analysis/boss-board.ts` is expected to satisfy.
 * Nothing here depends on it existing.
 */
export interface BossBoardBuildOptions {
	/** Show `tier: 'early'` rows (Chaos Zakum -> pre-Normal-Lotus). */
	includeEarlyBosses?: boolean;
	/** Party size for the `party` axis. */
	partySize?: number;
	/** Character Combat Power, for the advisory CMS entry gate. */
	combatPower?: number;
}

/**
 * The signature `src/lib/analysis/boss-board.ts` implements. Argument order is
 * `(input, character, options)` — the board is a function of the CALC INPUT
 * first; the document is only consulted for level / classId / symbols.
 */
export type BossBoardBuilder = (
	input: CalcInput,
	character: Character,
	options?: BossBoardBuildOptions
) => BossBoard;

export interface AnalyzeDeps {
	/** Injected in tests, or resolved by `loadBossBoardBuilder()` in the routes. */
	bossBoardBuilder?: BossBoardBuilder;
}

/**
 * Resolve `buildBossBoard`.
 *
 * Async because the boss board is a separately-owned module (design §9): this
 * was a guarded lazy import while that module was still being written, and it
 * is a plain static import now that it has landed. The async signature is kept
 * so neither the routes nor a future lazy strategy has to change.
 */
export async function loadBossBoardBuilder(): Promise<BossBoardBuilder | undefined> {
	return buildBossBoard;
}

function buildSummary(
	character: Character,
	input: CalcInput,
	target: NamedTarget
): CharacterSummary {
	const cls = getClass(character.classId);
	const range = calc.displayedRange(input);
	const mainKey = cls.primary[0] ?? 'str';
	const subKey = cls.secondary[0];

	const summary: CharacterSummary = {
		characterId: character.id,
		name: character.name,
		classId: character.classId,
		className: cls.name,
		level: character.level,
		world: character.world,
		damageIndex: calc.damageIndex(input, target),
		damageIndexArcane: calc.damageIndex(input, PRESET_TARGETS.arcane),
		damageIndexGrandis: calc.damageIndex(input, PRESET_TARGETS.grandis),
		range: { min: range.lower, max: range.upper },
		combatPower: combatPowerFor(character, input),
		totals: {
			mainStat: calc.statTotal(input, mainKey),
			secondaryStat: subKey ? calc.statTotal(input, subKey) : 0,
			attack: calc.attackTerm(input),
			statMultiplier: calc.statMultiplier(input),
			damagePercent: input.damagePercent,
			bossDamagePercent: input.bossDamagePercent,
			finalDamagePercent: input.finalDamagePercent,
			ignoreDefensePercent: input.ignoreDefensePercent,
			criticalRatePercent: input.criticalRatePercent,
			criticalDamagePercent: input.criticalDamagePercent
		}
	};

	if (input.arcaneForce !== undefined) summary.totals.arcaneForce = input.arcaneForce;
	if (input.sacredForce !== undefined) summary.totals.sacredForce = input.sacredForce;
	return summary;
}

/** The full analysis. Synchronous — pass a boss board builder in `deps` if you want one. */
export function analyze(
	character: Character,
	options: AnalysisOptions = {},
	deps: AnalyzeDeps = {}
): Analysis {
	const target = resolveTarget(options.target);
	const { input, warnings } = toCalcInput(character);

	const gear = summarizeGear(character);
	const generated = generateCandidates(character, input, target, { kinds: options.kinds });
	const upgrades = rankCandidates(input, generated.candidates, target, {
		topN: options.topN ?? DEFAULT_TOP_N
	});

	const summary = buildSummary(character, input, target);

	const analysis: Analysis = {
		generatedAt: new Date().toISOString(),
		target,
		summary,
		calibration: {
			checksums: buildChecksums(character, input),
			residuals: residuals(character),
			warnings: [...warnings, ...gear.warnings, ...generated.notes]
		},
		upgrades,
		statWorth: statWorth(input, target),
		input
	};

	if (options.includeBossBoard !== false && deps.bossBoardBuilder) {
		try {
			// The board reports `calibrated: false` and `uncalibrated` verdicts until a
			// per-class DPM anchor exists (design §9). Pass that through untouched.
			analysis.bossBoard = deps.bossBoardBuilder(input, character, {
				includeEarlyBosses: options.includeEarlyBosses ?? false,
				combatPower: summary.combatPower.value
			});
		} catch (error) {
			analysis.calibration.warnings.push(
				`Boss board could not be built: ${(error as Error).message}`
			);
		}
	}

	return analysis;
}

/** `analyze`, resolving the boss board module first when one is wanted. */
export async function analyzeAsync(
	character: Character,
	options: AnalysisOptions = {}
): Promise<Analysis> {
	const bossBoardBuilder =
		options.includeBossBoard === false ? undefined : await loadBossBoardBuilder();
	return analyze(character, options, { bossBoardBuilder });
}

/**
 * Evaluate a SET of deltas.
 *
 * The joint gain comes from `measureGainBatch` (formulas.md §3.4: "evaluate the
 * set jointly rather than summing individual deltas"). The per-delta `marginal`
 * gains are each measured against the SAME unmodified baseline, so they will
 * not sum to the joint number — IED and %stat are both strongly non-linear —
 * and seeing the two disagree is the point of the endpoint.
 */
export function whatIf(
	character: Character,
	deltas: readonly Delta[],
	targetId?: string
): WhatIfResult {
	const target = resolveTarget(targetId);
	const { input } = toCalcInput(character);

	const joint = calc.measureGainBatch(input, deltas, target);
	return {
		target,
		before: joint.before,
		after: joint.after,
		gainPercent: joint.gainPct,
		marginal: deltas.map((delta) => ({
			delta,
			gainPercent: calc.measureGain(input, delta, target).gainPct
		}))
	};
}
