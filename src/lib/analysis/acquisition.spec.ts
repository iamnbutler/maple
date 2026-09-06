import { describe, expect, it } from 'vitest';

import { getClass } from '$lib/data/classes';
import { resolveByName } from '$lib/data/items';
import type { Character, Item, Slot } from '$lib/schema';

import { generateAcquisitions, resolveStageItem, transferVerdict } from './acquisition';
import * as gearProgression from '$lib/data/gear-progression';

function item(slot: Slot, partial: Omit<Item, 'slot'>): [Slot, Item] {
	return [slot, { ...partial, slot }];
}

const WISPS: Omit<Item, 'slot'> = {
	name: "Will o' the Wisps",
	category: 'accessory',
	itemLevel: 130,
	starforce: 14,
	setName: 'Boss Accessory Set',
	total: { str: 93, dex: 44, int: 44, luk: 44, att: 7 },
	potential: { grade: 'unique', lines: ['STR : +9%', 'STR : +6%', 'Max HP : +6%'] }
};

const ROYAL_SHOULDER: Omit<Item, 'slot'> = {
	name: 'Royal Black Metal Shoulder',
	category: 'armor',
	itemLevel: 120,
	starforce: 12,
	setName: 'Boss Accessory Set',
	total: { str: 41, dex: 41, int: 41, luk: 41, att: 6 }
};

const DOMINATOR: Omit<Item, 'slot'> = {
	name: 'Dominator Pendant',
	category: 'accessory',
	itemLevel: 140,
	starforce: 17,
	setName: 'Boss Accessory Set',
	total: { str: 138, dex: 78, int: 118, luk: 98, att: 20 },
	potential: { grade: 'unique', lines: ['STR : +9%', 'Max HP : +6%', 'STR : +6%'] }
};

function character(entries: [Slot, Item][]): Character {
	return {
		id: 'test',
		name: 'Test',
		classId: 'ren',
		level: 272,
		world: 'Kronos',
		equipment: Object.fromEntries(entries)
	} as Character;
}

describe('resolveStageItem', () => {
	const ren = getClass('ren');

	it('picks the job branch out of a per-branch armour family', () => {
		const stage = findStageById('armour-outer-absolab');
		const { entry } = resolveStageItem(stage, 'shoulder', ren);
		// Ren is a warrior, so the Warrior branch is the only correct answer.
		expect(entry?.name).toBe('AbsoLab Knight Shoulder');
		expect(entry?.setName).toBe('AbsoLab Set (Warrior)');
	});

	it('resolves a single named item', () => {
		const stage = findStageByName('Superior Gollux Earrings');
		const { entry } = resolveStageItem(stage, 'earrings', ren);
		expect(entry?.name).toBe('Superior Gollux Earrings');
	});

	function findStageById(id: string): gearProgression.PathStage {
		const stage = gearProgression.getStage(id);
		if (!stage) throw new Error(`no stage ${id}`);
		return stage;
	}

	function findStageByName(name: string): gearProgression.PathStage {
		for (const path of gearProgression.SLOT_PATHS) {
			for (const stage of path.stages) if (stage.name === name) return stage;
		}
		throw new Error(`no stage named ${name}`);
	}
});

describe('transferVerdict', () => {
	const absolabShoulder = resolveByName('AbsoLab Knight Shoulder', 'shoulder').entries[0];
	const superiorEarrings = resolveByName('Superior Gollux Earrings', 'earrings').entries[0];

	it('refuses a gap wider than 10 levels', () => {
		// Royal Black Metal Shoulder is Lv 120, AbsoLab is Lv 160.
		const verdict = transferVerdict({ ...ROYAL_SHOULDER, slot: 'shoulder' }, absolabShoulder);
		expect(verdict.eligible).toBe(false);
		expect(verdict.why).toContain('this gap is 40');
	});

	it('allows a gap of exactly 10 and drops one star', () => {
		// Dominator Pendant is Lv 140; a Lv 150 receiver is exactly at the limit.
		const receiver = { ...absolabShoulder, itemLevel: 150 };
		const verdict = transferVerdict({ ...DOMINATOR, slot: 'pendant1' }, receiver);
		expect(verdict.eligible).toBe(true);
		expect(verdict.stars).toBe(16);
	});

	it('treats an uncaptured star count as unknown, never as zero', () => {
		const noStars = { ...DOMINATOR, starforce: undefined, slot: 'pendant1' as Slot };
		expect(transferVerdict(noStars, superiorEarrings).eligible).toBe(false);
		expect(transferVerdict(noStars, superiorEarrings).why).toContain('no captured star count');
	});

	it('refuses a 0-star source', () => {
		const bare = { ...DOMINATOR, starforce: 0, slot: 'pendant1' as Slot };
		expect(transferVerdict(bare, superiorEarrings).why).toContain('at least 1★');
	});
});

describe('generateAcquisitions', () => {
	it('offers the next stage as obtain PLUS invest, never the bare drop', () => {
		const { candidates } = generateAcquisitions(
			character([item('shoulder', ROYAL_SHOULDER), item('earrings', WISPS)])
		);
		const shoulder = candidates.find((c) => c.slot === 'shoulder');
		expect(shoulder).toBeDefined();
		expect(shoulder?.itemName).toBe('AbsoLab Knight Shoulder');
		// The label carries the investment, and the gain is for the finished piece.
		expect(shoulder?.label).toContain('17★');
		expect(shoulder?.notes?.some((n) => n.includes('OBTAIN PLUS INVEST'))).toBe(true);
		// A 0★ drop would be a downgrade; the prescribed piece is not.
		expect(shoulder?.delta.mainFlat ?? 0).toBeGreaterThan(0);
		expect(shoulder?.cost.mesos ?? 0).toBeGreaterThan(0);
		expect(shoulder?.feasibility).toBe('grind');
	});

	it('counts the set effect GAINED and the one LOST', () => {
		// Three Boss Accessory pieces, one AbsoLab piece. Swapping the shoulder
		// moves both counts at once, in opposite directions.
		const { candidates } = generateAcquisitions(
			character([
				item('shoulder', ROYAL_SHOULDER),
				item('earrings', WISPS),
				item('pendant2', DOMINATOR),
				item('cape', {
					name: 'AbsoLab Knight Cape',
					category: 'armor',
					itemLevel: 160,
					starforce: 13,
					setName: 'AbsoLab Set (Warrior)',
					total: { str: 74, dex: 49, att: 6 }
				})
			])
		);
		const shoulder = candidates.find((c) => c.slot === 'shoulder');
		const notes = (shoulder?.notes ?? []).join('\n');
		expect(notes).toContain('Loses one Boss Accessory Set piece (3 → 2)');
		expect(notes).toContain('Gains one AbsoLab Set (Warrior) piece (1 → 2)');
		// The AbsoLab 2-set is +10% boss damage, and it is IN the delta.
		expect(shoulder?.delta.boss).toBe(10);
		// The Boss Accessory loss is in there too — flat all stat and ATT come off.
		expect(shoulder?.detail).toContain('-Boss Accessory Set');
	});

	it('walks past a stage the character already wears in another slot', () => {
		const result = generateAcquisitions(
			character([
				item('pendant2', DOMINATOR),
				item('pendant1', {
					name: 'Daybreak Pendant',
					category: 'accessory',
					itemLevel: 140,
					starforce: 16,
					setName: 'Dawn Boss Set',
					total: { str: 81, dex: 145, att: 16 }
				})
			])
		);
		// You cannot wear two Daybreak Pendants, so no candidate — and a note that
		// says exactly why rather than silence.
		expect(result.candidates.some((c) => c.itemName === 'Daybreak Pendant')).toBe(false);
		expect(result.notes.join('\n')).toContain('already wears in another slot');
	});

	it('refuses to compare against an uncaptured item', () => {
		const bare = { ...ROYAL_SHOULDER, total: undefined };
		const result = generateAcquisitions(character([item('shoulder', bare)]));
		expect(result.candidates).toHaveLength(0);
		expect(result.notes.join('\n')).toContain('an uncaptured item is not an empty slot');
	});

	it('reports empty slots instead of guessing a rung for them', () => {
		const result = generateAcquisitions(character([item('shoulder', ROYAL_SHOULDER)]));
		const notes = result.notes.join('\n');
		expect(notes).toContain('Nothing equipped in:');
		expect(notes).toContain('does not say which rung a bare slot should start at');
	});

	it('never proposes an out-of-scope Pitched or Brilliant stage', () => {
		const { candidates } = generateAcquisitions(
			character([item('shoulder', ROYAL_SHOULDER), item('earrings', WISPS)])
		);
		for (const candidate of candidates) {
			const stage = gearProgression.stageForItem(candidate.itemName ?? '');
			expect(stage?.outOfScope ?? false).toBe(false);
		}
	});
});
