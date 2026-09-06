// Named targets: the two standing presets, plus every boss in the dataset.
//
// Design §4: `arcane` = 300% PDR at level 255, `grandis` = 380% PDR at level
// 285. Boss rows come from src/lib/data/bosses.ts, whose `pdr` is stored as a
// WHOLE PERCENT (300) while `Target.pdr` is a DECIMAL (3.0) — the conversion is
// the single most important thing this module does.

import { BOSSES, getBoss, type Boss } from '$lib/data/bosses';

import { unknownTarget } from './errors';
import type { NamedTarget } from './types';

export const DEFAULT_TARGET_ID = 'grandis';

/** Fallbacks for boss rows the dataset does not fully describe. */
const FALLBACK_PDR = 3.0;
const FALLBACK_LEVEL = 275;

export const PRESET_TARGETS: Record<'arcane' | 'grandis', NamedTarget> = {
	arcane: {
		id: 'arcane',
		label: 'Arcane River boss (300% DEF, Lv255)',
		kind: 'preset',
		pdr: 3.0,
		level: 255
	},
	grandis: {
		id: 'grandis',
		label: 'Grandis boss (380% DEF, Lv285)',
		kind: 'preset',
		pdr: 3.8,
		level: 285
	}
};

function fromBoss(boss: Boss): NamedTarget {
	const target: NamedTarget = {
		id: boss.id,
		label: `${titleCase(boss.difficulty)} ${boss.bossName}`,
		kind: 'boss',
		// bosses.json stores PDR as a whole percent; Target wants the decimal.
		pdr: boss.pdr === undefined ? FALLBACK_PDR : boss.pdr / 100,
		level: boss.level ?? FALLBACK_LEVEL
	};
	if (boss.force.type === 'arcane' && boss.force.required != null) {
		target.arcaneReq = boss.force.required;
	}
	if (boss.force.type === 'sacred' && boss.force.required != null) {
		target.sacredReq = boss.force.required;
	}
	return target;
}

function titleCase(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Resolve a target id.
 *
 * @throws {AnalysisError} `unknown-target` (400) when the id is neither preset
 *   nor a boss id.
 */
export function resolveTarget(id: string | null | undefined): NamedTarget {
	const key = (id ?? DEFAULT_TARGET_ID).trim();
	if (key === 'arcane' || key === 'grandis') return { ...PRESET_TARGETS[key] };

	const boss = getBoss(key);
	if (!boss) throw unknownTarget(key);
	return fromBoss(boss);
}

/** Every selectable target, presets first. */
export function listTargets(): NamedTarget[] {
	return [
		{ ...PRESET_TARGETS.arcane },
		{ ...PRESET_TARGETS.grandis },
		...BOSSES.map((boss) => fromBoss(boss))
	];
}
