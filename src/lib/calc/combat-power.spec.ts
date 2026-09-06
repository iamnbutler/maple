import { describe, expect, it } from 'vitest';

import { BOW_BASE_ATT, bowNormalizeAtt, computeCombatPower } from './combat-power';

/**
 * A verbatim transcription of the python-fiddle reference implementation quoted
 * in docs/research/formulas.md §2.3 (https://python-fiddle.com/saved/Hv6sN7miNlXfTijSoTO6),
 * which reproduces a real character's Combat Power of exactly 236,118.
 *
 * innateFlatAtt  = 40 + 40 + 0        (Lune, Cane Expert)
 * innateFinalDmg = 1.30 * 1.32 * 1    (Piercing Vision, Cane Expert)
 * innateDmg      = 30 + 0             (Priere D'Aria)
 * innateCritDmg  = 15 + 0             (Cane Expert)
 * innateBossDmg  = 0
 */
const PYTHON_FIDDLE = {
	mainStatBase: 2077,
	mainStatPercent: 129,
	mainStatFinal: 500,
	mainStatFromSkills: 140,

	subStatBase: 750,
	subStatPercent: 48,
	subStatFinal: 85,
	subStatFromSkills: 40,

	attFlat: 484,
	attPercent: 6,
	attFromSkills: 40 + 40 + 0,

	critDamagePercent: 40.5,
	critDamageFromSkills: 15,

	damagePercent: 72,
	damageFromSkills: 30,

	bossDamagePercent: 25,
	bossDamageFromSkills: 0,

	finalDamagePercent: 71.6,
	finalDamageFromSkills: 1.3 * 1.32 * 1,

	// weaponMul = 1.3 (a cane user with a single weapon type => ratio 1)
	weaponBaseAtt: 108,
	weaponStarAtt: 37,
	bowBaseAtt: 105
};

describe('computeCombatPower (formulas.md §2.3)', () => {
	it('reproduces the verified python-fiddle example exactly', () => {
		const result = computeCombatPower(PYTHON_FIDDLE);
		expect(result.value).toBe(236_118);
		expect(result.approx).toBe(false);
	});

	it('is unchanged by an explicit weapon-constant ratio of 1', () => {
		expect(computeCombatPower({ ...PYTHON_FIDDLE, weaponConstantRatio: 1 }).value).toBe(236_118);
	});

	it('penalises a lower-constant weapon via the §2.2 ratio term', () => {
		const full = computeCombatPower(PYTHON_FIDDLE).value;
		const halved = computeCombatPower({ ...PYTHON_FIDDLE, weaponConstantRatio: 0.5 }).value;
		expect(Math.abs(halved - full / 2)).toBeLessThan(2);
	});

	it('marks the result approx when the weapon data for normalisation is missing', () => {
		const result = computeCombatPower({
			...PYTHON_FIDDLE,
			weaponBaseAtt: undefined,
			weaponStarAtt: undefined,
			bowBaseAtt: undefined
		});
		expect(result.approx).toBe(true);
		expect(result.normalizedAtt).toBe(484 - 80);
	});

	it('excludes skill-sourced stats from every term', () => {
		const withoutSkillStat = computeCombatPower({
			...PYTHON_FIDDLE,
			mainStatBase: PYTHON_FIDDLE.mainStatBase - PYTHON_FIDDLE.mainStatFromSkills,
			mainStatFromSkills: 0
		});
		expect(withoutSkillStat.value).toBe(236_118);
	});
});

describe('bowNormalizeAtt (formulas.md §2.2 term 8)', () => {
	it('matches the §2.3 reference arithmetic', () => {
		// floor((105/108 - 1) * (108 + 37)) = floor(-4.0277...) = -5
		expect(
			bowNormalizeAtt({ flatAtt: 404, weaponBaseAtt: 108, weaponStarAtt: 37, bowBaseAtt: 105 })
		).toBe(404 + Math.floor((105 / 108 - 1) * (108 + 37)));
	});

	it('is a no-op when the weapon already IS the reference bow', () => {
		expect(
			bowNormalizeAtt({ flatAtt: 500, weaponBaseAtt: 349, weaponStarAtt: 60, bowBaseAtt: 349 })
		).toBe(500);
	});

	it('raises ATT for a weapon whose base ATT is below the bow', () => {
		const normalized = bowNormalizeAtt({
			flatAtt: 500,
			weaponBaseAtt: 200,
			weaponStarAtt: 50,
			bowBaseAtt: BOW_BASE_ATT.destiny
		});
		expect(normalized).toBeGreaterThan(500);
		expect(normalized).toBe(500 + Math.floor((349 / 200 - 1) * 250));
	});

	it('degrades gracefully when the weapon base ATT is unknown', () => {
		expect(
			bowNormalizeAtt({ flatAtt: 500, weaponBaseAtt: 0, weaponStarAtt: 0, bowBaseAtt: 349 })
		).toBe(500);
	});
});

describe('BOW_BASE_ATT (formulas.md §2.2)', () => {
	it('carries the four wiki-verified tiers', () => {
		expect(BOW_BASE_ATT.destiny).toBe(349);
		expect(BOW_BASE_ATT.genesis).toBe(318);
		expect(BOW_BASE_ATT.arcane).toBe(276);
		expect(BOW_BASE_ATT.absolab).toBe(192);
	});
});
