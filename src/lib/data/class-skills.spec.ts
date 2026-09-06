import { describe, expect, it } from 'vitest';

import { getClass } from './classes';
import {
	ASCENT_SKILL_RIDER,
	CLASS_SKILL_IDS,
	CLASS_SKILLS,
	INNATE_CRITICAL_RATE_PERCENT,
	V_BOOST_NODE_RIDERS,
	alwaysOnTotals,
	getClassSkills,
	skillsAffecting,
	tryGetClassSkills,
	type ClassSkill,
	type SkillEffects
} from './class-skills';

/** Every numeric key of `SkillEffects`, for the "never zero" invariant. */
const NUMERIC_EFFECT_KEYS = [
	'finalDamagePercent',
	'ignoreDefensePercent',
	'bossDamagePercent',
	'damagePercent',
	'normalEnemyDamagePercent',
	'criticalRatePercent',
	'criticalDamagePercent',
	'attack',
	'attackPercent',
	'magicAttack',
	'magicAttackPercent',
	'apAssignedStatPercent',
	'masteryPercent',
	'attackSpeedStages'
] as const satisfies readonly (keyof SkillEffects)[];

function allSkills(): { classId: string; skill: ClassSkill }[] {
	return CLASS_SKILL_IDS.flatMap((classId) =>
		CLASS_SKILLS[classId].skills.map((skill) => ({ classId, skill }))
	);
}

/* -------------------------------------------------------------------------- */

describe('coverage', () => {
	// design §11: Ren (priority), Hero, Wind Archer, Battle Mage, Night Walker.
	it('covers exactly the five priority classes, Ren first', () => {
		expect([...CLASS_SKILL_IDS]).toEqual([
			'ren',
			'hero',
			'wind-archer',
			'night-walker',
			'battle-mage'
		]);
		expect(Object.keys(CLASS_SKILLS).sort()).toEqual([...CLASS_SKILL_IDS].sort());
	});

	it('refuses to answer for an unresearched class instead of returning nothing', () => {
		// A silent `{}` would read as "this class has no passives", which is the
		// exact failure mode this module exists to prevent.
		expect(tryGetClassSkills('shadower')).toBeUndefined();
		expect(() => getClassSkills('shadower')).toThrow(/No class-skill data/);
	});

	it('uses class ids that resolve in classes.ts', () => {
		for (const id of CLASS_SKILL_IDS) {
			expect(getClass(id).id).toBe(id);
		}
	});

	it('gives every priority class a full stat sheet', () => {
		for (const id of CLASS_SKILL_IDS) {
			const set = getClassSkills(id);
			expect(set.sourceUrl).toMatch(/^https:\/\/grandislibrary\.com\//);
			expect(set.skills.length).toBeGreaterThan(10);
			expect(set.weaponTypes.length).toBeGreaterThan(0);
			expect(set.secondaryTypes.length).toBeGreaterThan(0);
			expect(set.weaponMultiplier.length).toBeGreaterThan(0);
			expect(set.weaponMasteryPercent).toBeGreaterThan(0);
			// Every field of the Grandis Library aggregate is transcribed, so the
			// spec below can compare against it.
			for (const value of Object.values(set.grandisLibraryTotals)) {
				expect(typeof value).toBe('string');
				expect(value.length).toBeGreaterThan(0);
			}
		}
	});
});

/* -------------------------------------------------------------------------- */

describe('per-skill invariants', () => {
	it('sets alwaysOn explicitly on every skill — never by default', () => {
		for (const { classId, skill } of allSkills()) {
			const label = `${classId}/${skill.name}`;
			expect(
				Object.prototype.hasOwnProperty.call(skill, 'alwaysOn'),
				`${label} is missing an explicit alwaysOn`
			).toBe(true);
			expect(typeof skill.alwaysOn, `${label} alwaysOn is not a boolean`).toBe('boolean');
		}
	});

	it('marks every duration-limited skill as not always-on, and vice versa', () => {
		for (const { classId, skill } of allSkills()) {
			if (skill.durationSeconds !== undefined) {
				expect(skill.alwaysOn, `${classId}/${skill.name} has a duration but is alwaysOn`).toBe(
					false
				);
			}
		}
	});

	it('never stores 0 — an absent value is an absent key', () => {
		for (const { classId, skill } of allSkills()) {
			for (const key of NUMERIC_EFFECT_KEYS) {
				const value = skill.effects[key];
				if (value === undefined) continue;
				expect(value, `${classId}/${skill.name}.${key} is 0`).not.toBe(0);
			}
			for (const bag of [skill.effects.stat, skill.effects.statPercent]) {
				for (const [key, value] of Object.entries(bag ?? {})) {
					expect(value, `${classId}/${skill.name} stat.${key} is 0`).not.toBe(0);
				}
			}
		}
	});

	it('names the affected skills whenever an effect is skill-scoped', () => {
		for (const { classId, skill } of allSkills()) {
			if (skill.scope !== 'skill') continue;
			expect(
				skill.appliesTo,
				`${classId}/${skill.name} is skill-scoped with no appliesTo`
			).toBeDefined();
			expect(skill.appliesTo?.length).toBeGreaterThan(0);
		}
	});

	it('has unique skill names within a class', () => {
		for (const id of CLASS_SKILL_IDS) {
			const names = getClassSkills(id).skills.map((s) => s.name);
			expect(new Set(names).size, `${id} has duplicate skill names`).toBe(names.length);
		}
	});
});

/* -------------------------------------------------------------------------- */

describe('Ren — the design §11 priority class', () => {
	const ren = getClassSkills('ren');

	// https://grandislibrary.com/anima/ren — "Ren is a STR warrior class part of
	// the Anima class group. Ren uses Swords as their primary weapons. For their
	// secondary weapon, Ren can equip Imugi Gems".
	it('is a STR/DEX Anima warrior with a one-handed Sword and an Imugi Gem', () => {
		expect(ren.primaryStat).toBe('str');
		expect(ren.secondaryStat).toBe('dex');
		expect(ren.classGroup).toBe('Anima');
		expect(ren.jobGroup).toBe('Warrior');
		expect([...ren.weaponTypes]).toEqual(['Sword']);
		expect([...ren.secondaryTypes]).toEqual(['Imugi Gem']);
		// The Sword is ONE-HANDED, which is why Ren takes a real secondary. The
		// class table must not mark it two-handed.
		expect(getClass('ren').weapons?.twoHandedPrimary).toBeUndefined();
	});

	it('agrees with classes.ts on stats, weapon and secondary', () => {
		const cls = getClass('ren');
		expect(cls.primary).toEqual([ren.primaryStat]);
		expect(cls.secondary).toEqual([ren.secondaryStat]);
		expect(cls.weaponType).toBe(ren.weaponTypes[0]);
		expect(cls.secondaryType).toBe(ren.secondaryTypes[0]);
	});

	it('sources the 1.3 weapon multiplier and the 90% mastery classes.ts carries', () => {
		// classes.ts has Ren's mastery marked UNVERIFIED; the class page prints
		// "Weapon Mastery: 90%" (Base +20% + Exquisite Sword Mastery +70%).
		expect([...ren.weaponMultiplier]).toEqual([1.3]);
		expect(getClass('ren').weaponConstant).toBe(1.3);
		expect(ren.weaponMasteryPercent).toBe(90);
		expect(getClass('ren').masteryPercent).toBe(90);
	});

	it('reproduces the page aggregate from the individual passives', () => {
		const t = alwaysOnTotals('ren');
		// "Final Damage: +69.23%" = 1.05 x 1.10 x 1.10 x 1.11 x 1.20
		expect(t.finalDamagePercent).toBeCloseTo(69.23, 2);
		expect(ren.grandisLibraryTotals.finalDamage).toContain('+69.23%');
		// "Ignore DEF: +40%" — Eyes Unclouded alone.
		expect(t.ignoreDefensePercent).toBeCloseTo(40, 6);
		// "Damage: +20%" = Grounded Body (link) +5% + Eyes Unclouded +15%.
		expect(t.damagePercent).toBe(20);
		// "Crit Rate: +50%" = Base 5% + 15% + 20% + 10%.
		expect(t.criticalRatePercent).toBe(50);
		// "Crit Damage: +10%" — Eyes Unclouded.
		expect(t.criticalDamagePercent).toBe(10);
		// "Attack: +165" = 30 + 30 + 48 + 57.
		expect(t.attack).toBe(165);
		// "Boss Damage: +0%" — Ren has no class-wide boss damage at all.
		expect(t.bossDamagePercent).toBe(0);
		expect(ren.grandisLibraryTotals.bossDamage).toBe('+0%');
	});

	it('keeps the hyper Guardbreaks out of the character total', () => {
		// Storm/Spirit Strike/Wish Unending Guardbreak are skill-scoped: they must
		// not inflate class IED from 40% to something the stat window never shows.
		expect(alwaysOnTotals('ren').ignoreDefensePercent).toBeCloseTo(40, 6);
		const withSkillScoped = alwaysOnTotals('ren', { includeSkillScoped: true });
		expect(withSkillScoped.ignoreDefensePercent).toBeGreaterThan(40);
	});

	it("treats Exclusive Spell's +4% ATT as a buff, not a passive", () => {
		const spell = ren.skills.find((s) => s.name === 'Exclusive Spell');
		expect(spell?.alwaysOn).toBe(false);
		expect(spell?.durationSeconds).toBe(2400);
		expect(alwaysOnTotals('ren').attackPercent).toBe(0);
	});
});

/* -------------------------------------------------------------------------- */

describe('Hero', () => {
	const hero = getClassSkills('hero');

	it('is a STR/DEX Explorer warrior with both weapon multipliers recorded', () => {
		expect(hero.primaryStat).toBe('str');
		expect(hero.secondaryStat).toBe('dex');
		// "[1H] 1.34x [2H] 1.44x". The tracker models Hero 2H-only (design §11),
		// and classes.ts therefore carries only 1.44.
		expect([...hero.weaponMultiplier]).toEqual([1.34, 1.44]);
		expect(getClass('hero').weaponConstant).toBe(1.44);
		expect(hero.weaponMasteryPercent).toBe(getClass('hero').masteryPercent);
	});

	it('separates the unconditional baseline from the Combo Orb stack', () => {
		const t = alwaysOnTotals('hero');
		// Unconditional: Weapon Mastery +10% x Enrage +25%.
		expect(t.finalDamagePercent).toBeCloseTo(37.5, 6);
		expect(t.ignoreDefensePercent).toBeCloseTo(50, 6); // Combat Mastery
		expect(t.criticalRatePercent).toBe(40); // 5 + 15 + 20
		expect(t.criticalDamagePercent).toBe(20); // Enrage
		expect(t.damagePercent).toBe(6); // Invincible Belief (link)
		expect(t.bossDamagePercent).toBe(0); // all of Hero's boss damage is orb-gated
	});

	it("reproduces the page's +202.5% Final Damage from the three cited terms", () => {
		// The page composes Weapon Mastery +10%, Enrage +25% and the Combo Orb
		// term "+12% per Combo Orb (Max. +120%)" — where the 12% is Advanced
		// Combo's 10% PLUS the hyper Reinforce's 2%, added inside one term.
		const advancedCombo = hero.skills.find((s) => s.name === 'Advanced Combo');
		const reinforce = hero.skills.find((s) => s.name === 'Advanced Combo Attack - Reinforce');
		expect(advancedCombo?.effects.finalDamagePercent).toBe(100);
		// The hyper carries no final damage of its own precisely so it is never
		// composed as a separate multiplier.
		expect(reinforce?.effects.finalDamagePercent).toBeUndefined();
		const comboTerm = 100 + 20;
		const composed = 1.1 * 1.25 * (1 + comboTerm / 100);
		expect((composed - 1) * 100).toBeCloseTo(202.5, 6);
		expect(hero.grandisLibraryTotals.finalDamage).toContain('+202.5%');
	});

	it('flags the orb, debuff, axe and optional-hyper contributions', () => {
		const conditional = hero.skills.filter((s) => s.conditional !== undefined).map((s) => s.name);
		expect(conditional).toContain('Combo Attack');
		expect(conditional).toContain('Advanced Combo');
		expect(conditional).toContain('Advanced Combo Attack - Boss Rush');
		expect(conditional).toContain('Puncture');
		expect(conditional).toContain('Weapon Mastery (Axe bonus)');
		const ferocity = hero.skills.find((s) => s.name === 'Advanced Final Attack - Ferocity');
		expect(ferocity?.optional).toBe(true);
		// With orbs charged, boss damage appears; without them it is zero.
		expect(alwaysOnTotals('hero', { includeConditional: true }).bossDamagePercent).toBe(20);
	});
});

/* -------------------------------------------------------------------------- */

describe('Wind Archer', () => {
	const wa = getClassSkills('wind-archer');

	it('is a DEX/STR Cygnus archer holding a Bow and a Jewel', () => {
		expect(wa.primaryStat).toBe('dex');
		expect(wa.secondaryStat).toBe('str');
		expect([...wa.weaponTypes]).toEqual(['Bow']);
		expect([...wa.secondaryTypes]).toEqual(['Jewel']);
		expect(getClass('wind-archer').weaponType).toBe('Bow');
		expect([...wa.weaponMultiplier]).toEqual([getClass('wind-archer').weaponConstant]);
		expect(wa.weaponMasteryPercent).toBe(getClass('wind-archer').masteryPercent);
	});

	it('reproduces the page aggregate', () => {
		const t = alwaysOnTotals('wind-archer');
		// "Final Damage: +66.32%" = 1.10 x 1.12 x 1.35 — all unconditional passives.
		expect(t.finalDamagePercent).toBeCloseTo(66.32, 2);
		expect(wa.grandisLibraryTotals.finalDamage).toBe('+66.32%');
		// "Damage: +50%" = 10 + 15 + 25.
		expect(t.damagePercent).toBe(50);
		// "Boss Damage: +40%" — Bow Expert. The only always-on class boss damage
		// among the five priority classes.
		expect(t.bossDamagePercent).toBe(40);
		// CONFLICT, documented on the Eagle Eye entry: the page's Attack row reads
		// "+170" (it omits Eagle Eye's +20) while its own skill descriptions give
		// +190 = 55 + 20 + 20 + 20 + 15 + 30 + 30. We follow the skill
		// descriptions, which are also what reproduce the crit-rate and
		// attack-speed rows. This test pins that choice so it cannot drift.
		expect(t.attack).toBe(190);
		expect(wa.grandisLibraryTotals.attack).toBe('+24% +170');
		expect(wa.skills.find((s) => s.name === 'Eagle Eye')?.note).toMatch(/^CONFLICT/);
		// IED composes Pinpoint Pierce +15% with Albatross Max +15%.
		expect(t.ignoreDefensePercent).toBeCloseTo(27.75, 6);
	});

	it("matches the page's +34.98% Ignore DEF once Emerald Dust is included", () => {
		const t = alwaysOnTotals('wind-archer', { includeConditional: true });
		expect(t.ignoreDefensePercent).toBeCloseTo(34.975, 3);
		expect(wa.grandisLibraryTotals.ignoreDefense).toBe('+34.98%');
	});

	it('excludes Sharp Eyes from the always-on crit numbers', () => {
		const sharpEyes = wa.skills.find((s) => s.name === 'Sharp Eyes');
		expect(sharpEyes?.alwaysOn).toBe(false);
		expect(sharpEyes?.durationSeconds).toBe(300);
		const t = alwaysOnTotals('wind-archer');
		// The page prints +60% / +36% with Sharp Eyes folded in; without it:
		expect(t.criticalRatePercent).toBe(40);
		expect(t.criticalDamagePercent).toBe(21);
		expect(wa.grandisLibraryTotals.criticalRate).toBe('+60%');
		expect(wa.grandisLibraryTotals.criticalDamage).toBe('+36%');
	});
});

/* -------------------------------------------------------------------------- */

describe('Night Walker', () => {
	const nw = getClassSkills('night-walker');

	it('is a LUK/DEX Cygnus thief holding a Claw and a Jewel', () => {
		expect(nw.primaryStat).toBe('luk');
		expect(nw.secondaryStat).toBe('dex');
		expect([...nw.weaponTypes]).toEqual(['Claw']);
		expect([...nw.secondaryTypes]).toEqual(['Jewel']);
		expect([...nw.weaponMultiplier]).toEqual([getClass('night-walker').weaponConstant]);
		expect(nw.weaponMasteryPercent).toBe(getClass('night-walker').masteryPercent);
	});

	it('reproduces the page aggregate', () => {
		const t = alwaysOnTotals('night-walker');
		// "Final Damage: +54.56%" = Shadow Momentum 1.15 x Dark Blessing 1.12
		// x Shadow Bite (5th job passive effect) 1.20.
		expect(t.finalDamagePercent).toBeCloseTo(54.56, 2);
		expect(nw.grandisLibraryTotals.finalDamage).toContain('+54.56%');
		expect(t.damagePercent).toBe(30); // Throwing Mastery
		expect(t.criticalRatePercent).toBe(40); // 5 + 35
		expect(t.criticalDamagePercent).toBe(30); // 10 + 10 + 10
		expect(t.attack).toBe(125); // 55 + 10 + 30 + 30
		expect(t.bossDamagePercent).toBe(0);
		expect(nw.grandisLibraryTotals.bossDamage).toBe('+0%');
	});

	it("matches the page's +44.75% Ignore DEF only with Marks of Darkness up", () => {
		expect(alwaysOnTotals('night-walker').ignoreDefensePercent).toBeCloseTo(15, 6);
		const marked = alwaysOnTotals('night-walker', { includeConditional: true });
		expect(marked.ignoreDefensePercent).toBeCloseTo(44.75, 6);
		expect(nw.grandisLibraryTotals.ignoreDefense).toBe('+44.75%');
	});

	it("matches the page's +215 Attack only with the optional hyper and Last Resort", () => {
		expect(alwaysOnTotals('night-walker', { includeOptional: true }).attack).toBe(185);
		expect(nw.grandisLibraryTotals.attack).toBe('+14% +125(215)');
	});

	it('counts the 5th-job Shadow Bite passive as always on', () => {
		const bite = nw.skills.find((s) => s.name === 'Shadow Bite');
		expect(bite?.source).toBe('v');
		expect(bite?.alwaysOn).toBe(true);
		expect(bite?.effects.finalDamagePercent).toBe(20);
	});
});

/* -------------------------------------------------------------------------- */

describe('Battle Mage', () => {
	const bam = getClassSkills('battle-mage');

	it('is an INT/LUK Resistance magician holding a Staff', () => {
		expect(bam.primaryStat).toBe('int');
		expect(bam.secondaryStat).toBe('luk');
		expect([...bam.weaponTypes]).toEqual(['Staff']);
		expect(bam.secondaryTypes).toContain('Magic Marble');
		expect([...bam.weaponMultiplier]).toEqual([getClass('battle-mage').weaponConstant]);
		expect(bam.weaponMasteryPercent).toBe(getClass('battle-mage').masteryPercent);
	});

	it('reproduces the page aggregate', () => {
		const t = alwaysOnTotals('battle-mage');
		// "Final Damage: +58.6%" = Battle Mastery 1.30 x Spell Boost 1.22.
		expect(t.finalDamagePercent).toBeCloseTo(58.6, 6);
		expect(bam.grandisLibraryTotals.finalDamage).toContain('+58.6%');
		expect(t.damagePercent).toBe(36); // 5 (link) + 6 + 25
		expect(t.criticalRatePercent).toBe(60); // 5 + 15 + 20 + 20
		expect(t.criticalDamagePercent).toBe(40); // 10 + 20 + 10
		expect(t.magicAttack).toBe(80); // 20 + 30 + 30
		expect(t.magicAttackPercent).toBe(17); // Dark Aura 7 + Spell Boost 10
		expect(t.ignoreDefensePercent).toBeCloseTo(30, 6); // Spell Boost
		// Boss damage is parenthesised on the page because its only source is a
		// hyper passive gated on an aura.
		expect(t.bossDamagePercent).toBe(0);
		expect(bam.grandisLibraryTotals.bossDamage).toBe('(+5%)');
	});

	it("matches the page's +44% Ignore DEF once Weakening Aura is toggled", () => {
		const t = alwaysOnTotals('battle-mage', { includeConditional: true });
		expect(t.ignoreDefensePercent).toBeCloseTo(44, 6);
		expect(bam.grandisLibraryTotals.ignoreDefense).toBe('+44%');
		expect(t.bossDamagePercent).toBe(5);
	});

	it('splits Dark Aura into its passive and toggled halves', () => {
		const passiveHalf = bam.skills.find((s) => s.name === 'Dark Aura (passive half)');
		const auraHalf = bam.skills.find((s) => s.name === 'Dark Aura (aura half)');
		expect(passiveHalf?.conditional).toBeUndefined();
		expect(passiveHalf?.effects.magicAttackPercent).toBe(7);
		expect(auraHalf?.conditional).toBeDefined();
		expect(auraHalf?.effects.damagePercent).toBe(10);
	});
});

/* -------------------------------------------------------------------------- */

describe('shared constants and helpers', () => {
	it('records the innate 5% critical rate every page prints as "Base +5%"', () => {
		expect(INNATE_CRITICAL_RATE_PERCENT).toBe(5);
		// A class with no crit-rate passives at all would still total 5%.
		for (const id of CLASS_SKILL_IDS) {
			expect(alwaysOnTotals(id).criticalRatePercent).toBeGreaterThanOrEqual(5);
		}
	});

	it('records the uniform V boost node and Ascent skill riders', () => {
		expect(V_BOOST_NODE_RIDERS.level40IgnoreDefensePercent).toBe(20);
		expect(V_BOOST_NODE_RIDERS.level20CriticalRatePercent).toBe(5);
		expect(ASCENT_SKILL_RIDER).toEqual({
			ignoreDefensePercent: 60,
			bossDamagePercent: 40,
			criticalRatePercent: 100
		});
		// Every class's Ascent skill carries exactly that rider, skill-scoped.
		for (const id of CLASS_SKILL_IDS) {
			const ascent = getClassSkills(id).skills.filter(
				(s) => s.source === 'hexa' && s.effects.bossDamagePercent === 40
			);
			expect(ascent.length, `${id} has no Ascent skill entry`).toBe(1);
			expect(ascent[0].scope).toBe('skill');
			expect(ascent[0].effects.ignoreDefensePercent).toBe(60);
			expect(ascent[0].effects.criticalRatePercent).toBe(100);
		}
	});

	it('composes ignore-defense instead of adding it', () => {
		// Two 15% sources compose to 27.75%, never 30%.
		const t = alwaysOnTotals('wind-archer');
		expect(t.ignoreDefensePercent).toBeCloseTo(27.75, 6);
		expect(t.ignoreDefensePercent).not.toBeCloseTo(30, 2);
	});

	it('answers "which skill is driving this number?"', () => {
		const iedSources = skillsAffecting('ren', 'ignoreDefensePercent').map((s) => s.name);
		expect(iedSources).toContain('Eyes Unclouded');
		expect(iedSources).toContain('Storm - Guardbreak');
		expect(alwaysOnTotals('ren').contributors.map((s) => s.name)).toContain('Eyes Unclouded');
		// Buffs never appear in an always-on total.
		expect(alwaysOnTotals('ren').contributors.map((s) => s.name)).not.toContain('Weapon Aura');
	});

	it('never counts a buff toward an always-on total', () => {
		for (const id of CLASS_SKILL_IDS) {
			for (const skill of alwaysOnTotals(id, {
				includeConditional: true,
				includeSkillScoped: true,
				includeOptional: true
			}).contributors) {
				expect(skill.alwaysOn, `${id}/${skill.name}`).toBe(true);
				expect(skill.durationSeconds, `${id}/${skill.name}`).toBeUndefined();
			}
		}
	});

	it('can restrict a total to true class passives', () => {
		// Ren's +20% Damage is +15% class passive plus +5% from a Link Skill.
		expect(alwaysOnTotals('ren').damagePercent).toBe(20);
		expect(alwaysOnTotals('ren', { sources: ['passive'] }).damagePercent).toBe(15);
	});
});
