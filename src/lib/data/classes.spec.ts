import { describe, expect, it } from 'vitest';

import { getClass, listClasses, tryGetClass } from './classes';
import { MAX_WEAPON_CONSTANT, WEAPON_CONSTANTS, weaponConstantFor } from './weapon-constants';

describe('class table', () => {
	it('has unique kebab-case ids', () => {
		const ids = listClasses().map((c) => c.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
	});

	it('covers the whole GMS 2026 roster from formulas.md §4.1-§4.6', () => {
		expect(listClasses()).toHaveLength(53);
	});

	it('excludes KMS-only and removed classes', () => {
		// Lethe is KMS-only (§4.7); Beast Tamer became Lynn; Jett and Zen are gone.
		for (const id of ['lethe', 'beast-tamer', 'jett', 'zen']) {
			expect(tryGetClass(id)).toBeUndefined();
		}
	});

	it('gives every class a primary stat and a plausible weapon constant', () => {
		for (const cls of listClasses()) {
			expect(cls.primary.length).toBeGreaterThan(0);
			expect(cls.weaponConstant).toBeGreaterThanOrEqual(1.2);
			expect(cls.weaponConstant).toBeLessThanOrEqual(MAX_WEAPON_CONSTANT);
			expect(cls.masteryPercent).toBeGreaterThanOrEqual(20);
			expect(cls.masteryPercent).toBeLessThanOrEqual(99);
		}
	});

	it('only marks magicians as using Magic ATT', () => {
		for (const cls of listClasses()) {
			if (cls.usesMagicAttack) expect(cls.jobType).toBe('magician');
		}
	});

	it('throws on an unknown id and resolves a known one', () => {
		expect(() => getClass('not-a-class')).toThrow(/Unknown classId/);
		expect(getClass('hero').name).toBe('Hero');
	});
});

// The five classes this tracker is actually used for. Every number below is
// asserted against docs/research/formulas.md §1.2 (stat mapping), §1.5 (weapon
// constant) and §4.0 (mastery, minimum of the published range).
describe('priority classes', () => {
	it('Ren — Anima Warrior, 1.3, STR/DEX', () => {
		const ren = getClass('ren');
		// §1.5 job table: "1.3 | ... Ren"
		expect(ren.weaponConstant).toBe(1.3);
		// §4.6 lists Ren as an Anima WARRIOR; §1.2 maps Warriors to STR/DEX.
		expect(ren.jobType).toBe('warrior');
		expect(ren.primary).toEqual(['str']);
		expect(ren.secondary).toEqual(['dex']);
		expect(ren.usesMagicAttack).toBe(false);
		// UNVERIFIED — Ren postdates the §4.0 mastery table.
		expect(ren.masteryPercent).toBe(90);
		expect(ren.weaponVariants).toBeUndefined();
	});

	it('Hero — 1H 1.34 vs 2H 1.44', () => {
		const hero = getClass('hero');
		// §1.5: "1.44 | Hero with 2H Sword / 2H Axe";
		//       "1.34 | Hero with 1H Sword/1H Axe"
		expect(hero.weaponVariants).toEqual({ '1h': 1.34, '2h': 1.44 });
		expect(hero.weaponConstant).toBe(1.44); // default = the 2H constant
		expect(hero.weaponVariants?.['1h']).toBe(1.34);
		expect(hero.primary).toEqual(['str']);
		expect(hero.secondary).toEqual(['dex']);
		expect(hero.masteryPercent).toBe(90); // §4.0 Hero 90-91%
		// The weapon-type table agrees once the Hero override is applied.
		expect(weaponConstantFor('two-handed-sword', 'hero')).toBe(1.44);
		expect(weaponConstantFor('one-handed-sword', 'hero')).toBe(1.34);
		expect(weaponConstantFor('one-handed-axe', 'hero')).toBe(1.34);
		expect(weaponConstantFor('two-handed-sword')).toBe(1.34); // non-Hero base
	});

	it('Wind Archer — Cygnus Bowman, 1.3, DEX/STR', () => {
		const wa = getClass('wind-archer');
		expect(wa.weaponConstant).toBe(1.3); // §1.5
		expect(wa.jobType).toBe('bowman');
		expect(wa.primary).toEqual(['dex']); // §1.2 Bowman row
		expect(wa.secondary).toEqual(['str']);
		expect(wa.usesMagicAttack).toBe(false);
		expect(wa.masteryPercent).toBe(85); // §4.0 Wind Archer 85-87%
	});

	it('Battle Mage — Resistance Magician, 1.2, INT/LUK, Magic ATT', () => {
		const bam = getClass('battle-mage');
		expect(bam.weaponConstant).toBe(1.2); // §1.5 "All Magicians except Kanna and Lynn"
		expect(bam.jobType).toBe('magician');
		expect(bam.primary).toEqual(['int']); // §1.2 Magician row
		expect(bam.secondary).toEqual(['luk']);
		expect(bam.usesMagicAttack).toBe(true);
		expect(bam.masteryPercent).toBe(95); // §4.0 Battle Mage 95-97%
	});

	it('Night Walker — Cygnus Thief, 1.75, LUK/DEX', () => {
		const nw = getClass('night-walker');
		expect(nw.weaponConstant).toBe(1.75); // §1.5 "1.75 | Night Lord, Night Walker, Mo Xuan"
		expect(nw.jobType).toBe('thief');
		expect(nw.primary).toEqual(['luk']); // §1.2 Thief row (not one of the dual-secondary thieves)
		expect(nw.secondary).toEqual(['dex']);
		expect(nw.usesMagicAttack).toBe(false);
		expect(nw.masteryPercent).toBe(85); // §4.0 Night Walker 85-87%
		expect(nw.weaponConstant).toBe(WEAPON_CONSTANTS.claw);
	});
});

describe('special stat-multiplier classes', () => {
	it('Xenon has three primaries and no secondary', () => {
		const xenon = getClass('xenon');
		expect(xenon.primary).toEqual(['str', 'dex', 'luk']);
		expect(xenon.secondary).toEqual([]);
		expect(xenon.weaponConstant).toBe(1.3125);
		expect(xenon.flags?.xenon).toBe(true);
	});

	it('Demon Avenger is HP/STR', () => {
		const da = getClass('demon-avenger');
		expect(da.primary).toEqual(['hp']);
		expect(da.secondary).toEqual(['str']);
		expect(da.weaponConstant).toBe(1.3);
		expect(da.flags?.demonAvenger).toBe(true);
	});

	it('Shadower, Dual Blade and Cadena carry both secondaries', () => {
		for (const id of ['shadower', 'dual-blade', 'cadena']) {
			expect(getClass(id).secondary).toEqual(['dex', 'str']);
		}
	});

	it('Kanna is flagged for its Final Magic ATT exception', () => {
		expect(getClass('kanna').flags?.kanna).toBe(true);
		expect(getClass('kanna').weaponConstant).toBe(1.35);
	});
});

describe('weapon constants (formulas.md §1.5)', () => {
	it('matches the by-weapon-type table', () => {
		expect(WEAPON_CONSTANTS.staff).toBe(1.2);
		expect(WEAPON_CONSTANTS.katana).toBe(1.25);
		expect(WEAPON_CONSTANTS.bow).toBe(1.3);
		expect(WEAPON_CONSTANTS['whip-blade']).toBe(1.3125);
		expect(WEAPON_CONSTANTS['two-handed-blunt']).toBe(1.34);
		expect(WEAPON_CONSTANTS.crossbow).toBe(1.35);
		expect(WEAPON_CONSTANTS.polearm).toBe(1.49);
		expect(WEAPON_CONSTANTS.cannon).toBe(1.5);
		expect(WEAPON_CONSTANTS.knuckle).toBe(1.7);
		expect(WEAPON_CONSTANTS.claw).toBe(1.75);
	});

	it('applies the Paladin overrides', () => {
		expect(weaponConstantFor('one-handed-blunt', 'paladin')).toBe(1.24);
		expect(weaponConstantFor('two-handed-blunt', 'paladin')).toBe(1.34);
		expect(weaponConstantFor('one-handed-blunt')).toBe(1.2);
	});

	it('has claw as the game-wide maximum', () => {
		const all = Object.values(WEAPON_CONSTANTS);
		expect(Math.max(...all)).toBe(MAX_WEAPON_CONSTANT);
	});
});
