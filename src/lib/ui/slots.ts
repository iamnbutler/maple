// Equipment-grid layout and per-slot presentation.
//
// The grid mirrors the in-game Equip window: rings and pendants down the left,
// armour up the middle, weapon / secondary / emblem down the right. Slot ids are
// used verbatim as CSS grid-area names, so the template below IS the layout.

import type { Grade, Slot } from '$lib/schema';

export const SLOT_LABELS: Record<Slot, string> = {
	weapon: 'Weapon',
	secondary: 'Secondary',
	emblem: 'Emblem',
	hat: 'Hat',
	top: 'Top',
	bottom: 'Bottom',
	overall: 'Overall',
	shoes: 'Shoes',
	gloves: 'Gloves',
	cape: 'Cape',
	shoulder: 'Shoulder',
	belt: 'Belt',
	pendant1: 'Pendant 1',
	pendant2: 'Pendant 2',
	ring1: 'Ring 1',
	ring2: 'Ring 2',
	ring3: 'Ring 3',
	ring4: 'Ring 4',
	earrings: 'Earrings',
	face: 'Face',
	eye: 'Eye',
	pocket: 'Pocket',
	badge: 'Badge',
	medal: 'Medal',
	heart: 'Heart',
	android: 'Android',
	totem1: 'Totem 1',
	totem2: 'Totem 2',
	totem3: 'Totem 3'
};

/**
 * Five columns, mirroring the game window. `overall` is absent here: an overall
 * replaces top+bottom, so it is spliced in by {@link gridTemplate} only when the
 * character actually wears one.
 */
const LAYOUT_SPLIT: readonly (Slot | '.')[][] = [
	['ring1', 'face', 'hat', 'medal', 'emblem'],
	['ring2', 'eye', 'top', 'shoulder', 'secondary'],
	['ring3', 'earrings', 'bottom', 'gloves', 'weapon'],
	['ring4', 'pendant1', 'shoes', 'cape', 'android'],
	['pocket', 'pendant2', 'belt', 'badge', 'heart'],
	['totem1', 'totem2', 'totem3', '.', '.']
];

/** Same grid, with `overall` spanning the two rows top/bottom would occupy. */
const LAYOUT_OVERALL: readonly (Slot | '.')[][] = LAYOUT_SPLIT.map((row, y) =>
	y === 1 || y === 2 ? row.map((cell, x) => (x === 2 ? ('overall' as Slot) : cell)) : row
);

function template(layout: readonly (Slot | '.')[][]): string {
	return layout.map((row) => `"${row.join(' ')}"`).join(' ');
}

/** The `grid-template-areas` value for a character. */
export function gridTemplate(hasOverall: boolean): string {
	return template(hasOverall ? LAYOUT_OVERALL : LAYOUT_SPLIT);
}

/** The slots that actually have a cell in the grid, in reading order. */
export function gridSlots(hasOverall: boolean): Slot[] {
	const layout = hasOverall ? LAYOUT_OVERALL : LAYOUT_SPLIT;
	const seen = new Set<Slot>();
	for (const row of layout) {
		for (const cell of row) if (cell !== '.') seen.add(cell);
	}
	return [...seen];
}

/** GMS potential frame colours (design brief). */
export const GRADE_COLORS: Record<Grade, string> = {
	rare: '#66ffff',
	epic: '#9966ff',
	unique: '#ffcc00',
	legendary: '#ccff00'
};

export const GRADE_LABELS: Record<Grade, string> = {
	rare: 'Rare',
	epic: 'Epic',
	unique: 'Unique',
	legendary: 'Legendary'
};

/** Order used when sorting things by potential quality. */
export const GRADE_ORDER: Record<Grade, number> = {
	rare: 0,
	epic: 1,
	unique: 2,
	legendary: 3
};

/** Tooltip labels for `StatBlock` keys, in the order a tooltip prints them. */
const STAT_BLOCK_LABELS: [keyof import('$lib/schema').StatBlock, string, boolean][] = [
	['str', 'STR', false],
	['dex', 'DEX', false],
	['int', 'INT', false],
	['luk', 'LUK', false],
	['maxHp', 'Max HP', false],
	['maxMp', 'Max MP', false],
	['att', 'ATT', false],
	['matt', 'Magic ATT', false],
	['def', 'DEF', false],
	['speed', 'Speed', false],
	['jump', 'Jump', false],
	['allStatPct', 'All Stat', true],
	['bossDmgPct', 'Boss Damage', true],
	['iedPct', 'Ignore DEF', true],
	['dmgPct', 'Damage', true],
	['maxHpPct', 'Max HP', true],
	['maxMpPct', 'Max MP', true]
];

/** A `StatBlock` as ordered `{ label, value }` pairs, skipping absent fields. */
export function statEntries(
	block: import('$lib/schema').StatBlock | undefined
): { label: string; value: string }[] {
	if (!block) return [];
	const out: { label: string; value: string }[] = [];
	for (const [key, label, isPercent] of STAT_BLOCK_LABELS) {
		const value = block[key];
		if (value === undefined) continue;
		const sign = value >= 0 ? '+' : '';
		out.push({ label, value: `${sign}${value}${isPercent ? '%' : ''}` });
	}
	return out;
}
