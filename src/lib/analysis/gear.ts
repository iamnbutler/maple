// Bottom-up gear model.
//
// Design §2: gear is NOT the source of truth for totals — it is (a) the source
// of deltas for candidate upgrades and (b) a consistency check against the stat
// window. This module does the second job: it walks `character.equipment`,
// sums what the tooltips say, and reports the residual (the class / link /
// legion / inner-ability / buff baseline) that gear cannot explain.
//
// IED is deliberately kept as a LIST of individual source percentages and is
// never summed: IED composes multiplicatively (formulas.md §1.8), so
// `30 + 30 != 60`, and only the individual lines let a candidate remove and
// re-add a source correctly.

import * as calc from '$lib/calc';
import { getClass } from '$lib/data/classes';
import { STAR_FORCEABLE_CATEGORIES, type Character, type Item, type StatBlock } from '$lib/schema';

import type { GearResidual } from './types';

export type FourStat = 'str' | 'dex' | 'int' | 'luk';

const FOUR_STATS: readonly FourStat[] = ['str', 'dex', 'int', 'luk'];

/** Everything the equipment tooltips add up to. Whole percents throughout. */
export interface GearTotals {
	/** Flat "% applied" stat, per stat key. */
	flatStat: Record<FourStat, number>;
	/** Per-stat % (STR% etc). All Stat % is tracked separately. */
	statPercent: Record<FourStat, number>;
	allStatPercent: number;
	flatMaxHp: number;

	att: number;
	matt: number;
	attPercent: number;
	mattPercent: number;

	bossPercent: number;
	damagePercent: number;
	critRatePercent: number;
	critDamagePercent: number;

	/**
	 * Every IED source found on gear, as individual whole percentages.
	 * NEVER sum these — compose them (`calc.ied.compose`).
	 */
	iedLines: number[];
}

export interface GearItemSummary {
	slot: string;
	name: string;
	category: string;
	itemLevel?: number;
	starforce?: number;
	superior?: boolean;
	potentialGrade?: string;
	bonusPotentialGrade?: string;
}

export interface GearSummary {
	totals: GearTotals;
	items: GearItemSummary[];
	warnings: string[];
	/** Composed total of `iedLines`, as a whole percent — for display only. */
	composedIedPercent: number;
}

function emptyTotals(): GearTotals {
	return {
		flatStat: { str: 0, dex: 0, int: 0, luk: 0 },
		statPercent: { str: 0, dex: 0, int: 0, luk: 0 },
		allStatPercent: 0,
		flatMaxHp: 0,
		att: 0,
		matt: 0,
		attPercent: 0,
		mattPercent: 0,
		bossPercent: 0,
		damagePercent: 0,
		critRatePercent: 0,
		critDamagePercent: 0,
		iedLines: []
	};
}

function addBlock(totals: GearTotals, block: StatBlock | undefined): void {
	if (!block) return;
	for (const stat of FOUR_STATS) totals.flatStat[stat] += block[stat] ?? 0;
	totals.flatMaxHp += block.maxHp ?? 0;
	totals.att += block.att ?? 0;
	totals.matt += block.matt ?? 0;
	totals.allStatPercent += block.allStatPct ?? 0;
	totals.bossPercent += block.bossDmgPct ?? 0;
	totals.damagePercent += block.dmgPct ?? 0;
	// A tooltip's flat IED is one source, exactly like a potential line.
	if (block.iedPct) totals.iedLines.push(block.iedPct);
}

function addPotential(totals: GearTotals, lines: readonly string[] | undefined): void {
	if (!lines) return;
	for (const line of calc.parsePotentialLines(lines)) {
		switch (line.kind) {
			case 'stat_pct':
				if (line.stat && line.stat !== 'hp') totals.statPercent[line.stat] += line.value;
				break;
			case 'stat_flat':
				if (line.stat === 'hp') totals.flatMaxHp += line.value;
				else if (line.stat) totals.flatStat[line.stat] += line.value;
				break;
			case 'all_stat_pct':
				totals.allStatPercent += line.value;
				break;
			case 'att':
				totals.att += line.value;
				break;
			case 'att_pct':
				totals.attPercent += line.value;
				break;
			case 'matt':
				totals.matt += line.value;
				break;
			case 'matt_pct':
				totals.mattPercent += line.value;
				break;
			case 'boss':
				totals.bossPercent += line.value;
				break;
			case 'dmg':
				totals.damagePercent += line.value;
				break;
			case 'crit_rate':
				totals.critRatePercent += line.value;
				break;
			case 'crit_dmg':
				totals.critDamagePercent += line.value;
				break;
			case 'ied':
				// §1.8 — one line, one source. Kept separate, never added.
				totals.iedLines.push(line.value);
				break;
			// hp_pct / cooldown / drop / meso / other contribute no boss damage.
			default:
				break;
		}
	}
}

function itemWarnings(slot: string, item: Item): string[] {
	const out: string[] = [];
	if (item.itemLevel === undefined) {
		out.push(
			`${slot} (${item.name}) has no itemLevel; star force, flame and potential tables ` +
				'cannot be applied to it.'
		);
	}
	if (item.starforce === undefined && STAR_FORCEABLE_CATEGORIES.includes(item.category)) {
		out.push(
			`${slot} (${item.name}) is star-forceable but has no confirmed starforce value; no ` +
				'star force upgrades will be suggested for it.'
		);
	}
	return out;
}

/** Sum every equipped item's tooltip and potential lines. */
export function summarizeGear(character: Character): GearSummary {
	const totals = emptyTotals();
	const items: GearItemSummary[] = [];
	const warnings: string[] = [];

	for (const [slot, item] of Object.entries(character.equipment ?? {})) {
		if (!item) continue;
		addBlock(totals, item.total);
		addPotential(totals, item.potential?.lines);
		addPotential(totals, item.bonusPotential?.lines);
		items.push({
			slot,
			name: item.name,
			category: item.category,
			itemLevel: item.itemLevel,
			starforce: item.starforce,
			superior: item.superior,
			potentialGrade: item.potential?.grade,
			bonusPotentialGrade: item.bonusPotential?.grade
		});
		warnings.push(...itemWarnings(slot, item));
	}

	const composedIedPercent = calc.ied.compose(totals.iedLines.map((v) => v / 100)) * 100;

	return { totals, items, warnings, composedIedPercent };
}

/**
 * Gear-derived totals against the stat window.
 *
 * `residual = fromStatWindow - fromGear` for everything additive. IED is the
 * exception: it composes, so its residual is the single source that, composed
 * with the gear lines, reproduces the window total —
 * `1 - (1 - window) / (1 - gear)` (formulas.md §1.8). A residual of 0 for a
 * captured field means gear explains it entirely; a large positive residual is
 * the class/link/legion/buff baseline, which design §2 treats as an opaque
 * constant. A NEGATIVE residual means the gear says more than the window does,
 * which is a data-entry bug worth surfacing.
 */
export function residuals(character: Character): GearResidual[] {
	const window = character.statWindow;
	if (!window) return [];

	const cls = getClass(character.classId);
	const gear = summarizeGear(character).totals;
	const main = cls.primary[0];
	const sub = cls.secondary[0];
	const out: GearResidual[] = [];

	const row = (stat: string, fromGear: number, fromStatWindow: number): void => {
		out.push({ stat, fromGear, fromStatWindow, residual: fromStatWindow - fromGear });
	};

	if (main && main !== 'hp') {
		row(`${main.toUpperCase()} (base)`, gear.flatStat[main], window[main].base);
		row(
			`${main.toUpperCase()} %`,
			gear.statPercent[main] + gear.allStatPercent,
			window[main].percent ?? 0
		);
	}
	if (sub && sub !== 'hp') {
		row(`${sub.toUpperCase()} (base)`, gear.flatStat[sub], window[sub].base);
		row(
			`${sub.toUpperCase()} %`,
			gear.statPercent[sub] + gear.allStatPercent,
			window[sub].percent ?? 0
		);
	}

	if (cls.usesMagicAttack) {
		row('Magic ATT (base)', gear.matt, window.magicAttack?.base ?? 0);
		row('Magic ATT %', gear.mattPercent, window.magicAttack?.percent ?? 0);
	} else {
		row('ATT (base)', gear.att, window.attack.base);
		row('ATT %', gear.attPercent, window.attack.percent ?? 0);
	}

	row('Boss Damage %', gear.bossPercent, window.bossDamagePercent ?? 0);
	row('Damage %', gear.damagePercent, window.damagePercent ?? 0);
	row('Critical Damage %', gear.critDamagePercent, window.criticalDamagePercent ?? 0);
	row('Critical Rate %', gear.critRatePercent, window.criticalRatePercent ?? 0);

	// IED composes; its "residual" is the extra source implied by the window.
	const gearIed = calc.ied.compose(gear.iedLines.map((v) => v / 100));
	const windowIed = (window.ignoreDefensePercent ?? 0) / 100;
	const iedResidual = gearIed >= 1 ? 0 : (1 - (1 - windowIed) / (1 - gearIed)) * 100;
	out.push({
		stat: 'Ignore Enemy DEF % (composed)',
		fromGear: gearIed * 100,
		fromStatWindow: windowIed * 100,
		residual: iedResidual
	});

	return out;
}
