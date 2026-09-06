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
 * Short labels for the faint overlay on a grid tile. These follow the in-game
 * Equip window wording ("Cap", "Clothes", "Pants", "Sub") rather than the
 * schema's slot ids, and are kept short enough to fit a 58px tile.
 */
export const SLOT_TILE_LABELS: Record<Slot, string> = {
	weapon: 'Weapon',
	secondary: 'Sub',
	emblem: 'Emblem',
	hat: 'Cap',
	top: 'Clothes',
	bottom: 'Pants',
	overall: 'Overall',
	shoes: 'Shoes',
	gloves: 'Gloves',
	cape: 'Cape',
	shoulder: 'Shoulder',
	belt: 'Belt',
	pendant1: 'Pend 1',
	pendant2: 'Pend 2',
	ring1: 'Ring 1',
	ring2: 'Ring 2',
	ring3: 'Ring 3',
	ring4: 'Ring 4',
	earrings: 'Earring',
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
 * The in-game Equip window, transcribed cell for cell: five columns, six rows,
 * `.` wherever the game leaves a hole.
 *
 *   ring1    .         hat       .         emblem
 *   ring2    pendant1  face      .         badge
 *   ring3    pendant2  eye       earrings  medal
 *   ring4    weapon    top       shoulder  secondary
 *   pocket   belt      bottom    gloves    cape
 *   .        .         shoes     android   heart
 *
 * `overall` is absent here: an overall replaces top+bottom, so it is spliced in
 * by {@link gridTemplate} only when the character actually wears one. Totems
 * have no cell — the game keeps them on a separate tab — so an equipped totem
 * falls through to the grid's "no cell for this slot" strip.
 */
const LAYOUT_SPLIT: readonly (Slot | '.')[][] = [
	['ring1', '.', 'hat', '.', 'emblem'],
	['ring2', 'pendant1', 'face', '.', 'badge'],
	['ring3', 'pendant2', 'eye', 'earrings', 'medal'],
	['ring4', 'weapon', 'top', 'shoulder', 'secondary'],
	['pocket', 'belt', 'bottom', 'gloves', 'cape'],
	['.', '.', 'shoes', 'android', 'heart']
];

/** Row indices of the two cells an overall swallows (top, then bottom). */
const TOP_ROW = 3;
const BOTTOM_ROW = 4;
const CLOTHES_COL = 2;

/** Same grid, with `overall` spanning the two rows top/bottom would occupy. */
const LAYOUT_OVERALL: readonly (Slot | '.')[][] = LAYOUT_SPLIT.map((row, y) =>
	y === TOP_ROW || y === BOTTOM_ROW
		? row.map((cell, x) => (x === CLOTHES_COL ? ('overall' as Slot) : cell))
		: row
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
