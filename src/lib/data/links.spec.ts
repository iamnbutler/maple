import { describe, expect, it } from 'vitest';

import { listClasses } from './classes';
import {
	LINK_FACTIONS,
	LINK_SKILL_IDS,
	LINK_SKILLS,
	LINK_SLOTS,
	LINK_TRANSFER_UNLOCK_LEVEL,
	availableLinks,
	effectiveLinkEffect,
	getLinkSkill,
	linkEffect,
	linkLevelFromCharacterLevel,
	linkLevelFromRoster,
	linkSkillForClass
} from './links';

/* -------------------------------------------------------------------------- */
/* Coverage                                                                    */
/* -------------------------------------------------------------------------- */

describe('link skill coverage', () => {
	it('gives every GMS class in classes.ts exactly one link skill', () => {
		for (const cls of listClasses()) {
			const spec = linkSkillForClass(cls.id);
			expect(spec, `${cls.id} contributes to no link skill`).toBeDefined();
		}
	});

	it('never lists a class under two link skills', () => {
		const seen = new Map<string, string>();
		for (const spec of Object.values(LINK_SKILLS)) {
			for (const classId of spec.contributors) {
				expect(
					seen.has(classId),
					`${classId} appears in both ${seen.get(classId)} and ${spec.id}`
				).toBe(false);
				seen.set(classId, spec.id);
			}
		}
	});

	it('only names real class ids', () => {
		const known = new Set(listClasses().map((c) => c.id));
		for (const spec of Object.values(LINK_SKILLS)) {
			for (const classId of spec.contributors) {
				expect(known, `${spec.id} lists unknown class ${classId}`).toContain(classId);
			}
		}
	});

	it('has 35 link skills: 8 faction plus 27 single-class', () => {
		expect(LINK_SKILL_IDS).toHaveLength(35);
		const faction = Object.values(LINK_SKILLS).filter((s) => s.faction);
		expect(faction).toHaveLength(8);
		expect(LINK_SKILL_IDS.length - faction.length).toBe(27);
	});

	it('has a per-level effect entry for every level of every skill', () => {
		for (const spec of Object.values(LINK_SKILLS)) {
			expect(spec.transferred, `${spec.id} transferred`).toHaveLength(spec.maxLevel);
			if (spec.self) expect(spec.self, `${spec.id} self`).toHaveLength(spec.maxLevel);
		}
	});

	it('does not include removed or KMS-only classes', () => {
		// Beast Tamer / Jett are removed; Lethe's Covenant is KMS-only.
		for (const spec of Object.values(LINK_SKILLS)) {
			expect(spec.contributors).not.toContain('beast-tamer');
			expect(spec.contributors).not.toContain('jett');
			expect(spec.contributors).not.toContain('lethe');
		}
		expect(LINK_SKILLS.covenant).toBeUndefined();
	});
});

/* -------------------------------------------------------------------------- */
/* Faction stacking — §B1                                                      */
/* -------------------------------------------------------------------------- */

describe('faction stacking', () => {
	it('caps each faction link at 3 x its unique contributors', () => {
		expect(getLinkSkill('invincible-belief').maxLevel).toBe(9);
		expect(getLinkSkill('empirical-knowledge').maxLevel).toBe(9);
		expect(getLinkSkill('adventurers-curiosity').maxLevel).toBe(9);
		expect(getLinkSkill('thiefs-cunning').maxLevel).toBe(9);
		expect(getLinkSkill('pirate-blessing').maxLevel).toBe(9);
		expect(getLinkSkill('cygnus-blessing').maxLevel).toBe(15);
		expect(getLinkSkill('spirit-of-freedom').maxLevel).toBe(12);
		expect(getLinkSkill('guiding-stars').maxLevel).toBe(6);
	});

	it('derives every faction cap from the contributor count', () => {
		for (const spec of Object.values(LINK_SKILLS)) {
			if (!spec.faction) continue;
			expect(spec.maxLevel, spec.id).toBe(spec.contributors.length * 3);
		}
	});

	it('keeps Mihile, the Demons and Xenon out of the faction stacks', () => {
		// Guides routinely fold these into Cygnus / Resistance. They are separate.
		expect(LINK_FACTIONS.cygnus).not.toContain('mihile');
		expect(LINK_FACTIONS.resistance).not.toContain('demon-slayer');
		expect(LINK_FACTIONS.resistance).not.toContain('demon-avenger');
		expect(LINK_FACTIONS.resistance).not.toContain('xenon');
		expect(linkSkillForClass('mihile')?.id).toBe('knights-watch');
		expect(linkSkillForClass('demon-slayer')?.id).toBe('fury-unleashed');
		expect(linkSkillForClass('xenon')?.id).toBe('hybrid-logic');
	});

	it('includes Blaster in the Resistance stack, not as its own link', () => {
		expect(LINK_FACTIONS.resistance).toContain('blaster');
		expect(linkSkillForClass('blaster')?.id).toBe('spirit-of-freedom');
	});

	it('folds Pathfinder into the Explorer Bowman stack', () => {
		expect(LINK_FACTIONS['explorer-bowman']).toContain('pathfinder');
		expect(linkSkillForClass('pathfinder')?.id).toBe('adventurers-curiosity');
	});
});

/* -------------------------------------------------------------------------- */
/* Level gates — §B1                                                           */
/* -------------------------------------------------------------------------- */

describe('level gates', () => {
	it('uses the GMS ladder: Lv1, Lv2 at 120, Lv3 at 210', () => {
		expect(linkLevelFromCharacterLevel(1)).toBe(1);
		expect(linkLevelFromCharacterLevel(119)).toBe(1);
		expect(linkLevelFromCharacterLevel(120)).toBe(2);
		expect(linkLevelFromCharacterLevel(209)).toBe(2);
		expect(linkLevelFromCharacterLevel(210)).toBe(3);
		expect(linkLevelFromCharacterLevel(285)).toBe(3);
	});

	it('allows 12 links from other characters', () => {
		expect(LINK_SLOTS).toBe(12);
	});
});

describe('linkLevelFromRoster', () => {
	it('sums unique contributing classes', () => {
		expect(
			linkLevelFromRoster('invincible-belief', [
				{ classId: 'hero', level: 210 },
				{ classId: 'paladin', level: 210 },
				{ classId: 'dark-knight', level: 210 }
			])
		).toBe(9);
	});

	it('gains nothing from a duplicate class', () => {
		const one = [{ classId: 'hero', level: 210 }];
		const two = [
			{ classId: 'hero', level: 210 },
			{ classId: 'hero', level: 210 }
		];
		expect(linkLevelFromRoster('invincible-belief', one)).toBe(3);
		expect(linkLevelFromRoster('invincible-belief', two)).toBe(3);
	});

	it('keeps the higher level when a class appears twice', () => {
		expect(
			linkLevelFromRoster('invincible-belief', [
				{ classId: 'hero', level: 120 },
				{ classId: 'hero', level: 210 }
			])
		).toBe(3);
	});

	it('mixes partial contributions', () => {
		// Hero at 210 (Lv3) + Paladin at 120 (Lv2) + Dark Knight at 70 (Lv1) = 6.
		expect(
			linkLevelFromRoster('invincible-belief', [
				{ classId: 'hero', level: 210 },
				{ classId: 'paladin', level: 120 },
				{ classId: 'dark-knight', level: 70 }
			])
		).toBe(6);
	});

	it('ignores characters below the Lv.70 transfer gate', () => {
		expect(LINK_TRANSFER_UNLOCK_LEVEL).toBe(70);
		expect(linkLevelFromRoster('invincible-belief', [{ classId: 'hero', level: 69 }])).toBe(0);
		expect(linkLevelFromRoster('invincible-belief', [{ classId: 'hero', level: 70 }])).toBe(1);
	});

	it('ignores classes that do not contribute to the skill', () => {
		expect(linkLevelFromRoster('invincible-belief', [{ classId: 'bishop', level: 250 }])).toBe(0);
	});

	it('clamps to the skill max', () => {
		// Five Cygnus classes at 210 is exactly 15; there is no sixth.
		expect(
			linkLevelFromRoster(
				'cygnus-blessing',
				LINK_FACTIONS.cygnus.map((classId) => ({ classId, level: 250 }))
			)
		).toBe(15);
	});
});

/* -------------------------------------------------------------------------- */
/* Effect values — §B2.1                                                       */
/* -------------------------------------------------------------------------- */

describe('link effects', () => {
	it('returns nothing at level 0', () => {
		expect(linkEffect('light-wash', 0)).toEqual({});
	});

	it('rejects a level above the cap', () => {
		expect(() => linkEffect('light-wash', 4)).toThrow(/caps at level 3/);
		expect(() => linkEffect('light-wash', -1)).toThrow(/>= 0/);
	});

	it('throws on an unknown skill', () => {
		expect(() => linkEffect('not-a-link', 1)).toThrow(/Unknown link skill/);
	});

	it('gives the cited single-class maxima', () => {
		expect(linkEffect('light-wash', 3).ignoreDefensePercent).toBe(20);
		expect(linkEffect('phantom-instinct', 3).criticalRatePercent).toBe(20);
		expect(linkEffect('hybrid-logic', 3).allStatPercent).toBe(15);
		expect(linkEffect('fury-unleashed', 3).bossDamagePercent).toBe(20);
		expect(linkEffect('wild-rage', 3).damagePercent).toBe(15);
		expect(linkEffect('judgment', 3).criticalDamagePercent).toBe(6);
		expect(linkEffect('iron-will', 3).maxHpPercent).toBe(20);
		expect(linkEffect('innate-gift', 3).damagePercent).toBe(7);
		expect(linkEffect('bravado', 3).ignoreDefensePercent).toBe(15);
		expect(linkEffect('grounded-body', 3).damageTakenPercent).toBe(-6);
	});

	it('gives the cited Lynn multi-stat line', () => {
		expect(linkEffect('focus-spirit', 3)).toEqual({
			bossDamagePercent: 11,
			criticalRatePercent: 10,
			maxHpPercent: 5,
			maxMpPercent: 5
		});
	});

	it('gives the cited faction maxima', () => {
		expect(linkEffect('thiefs-cunning', 9).damagePercent).toBe(27);
		expect(linkEffect('adventurers-curiosity', 9).criticalRatePercent).toBe(15);
		expect(linkEffect('cygnus-blessing', 15).attack).toBe(35);
		expect(linkEffect('guiding-stars', 6)).toMatchObject({
			buffDurationPercent: 19,
			criticalDamagePercent: 6
		});
		expect(linkEffect('rhinnes-blessing', 6)).toMatchObject({
			damageTakenPercent: -20,
			ignoreDefensePercent: 15
		});
		// Empirical Knowledge at 3 stacks: +5% each per stack -> +15%/+15%.
		expect(linkEffect('empirical-knowledge', 9)).toMatchObject({
			damagePercent: 15,
			ignoreDefensePercent: 15
		});
	});

	it('reproduces every cited anchor on the interpolated ladders', () => {
		// Adventurer's Curiosity: Lv1 3, Lv2 4, Lv3 6, Lv9 15.
		expect(linkEffect('adventurers-curiosity', 1).criticalRatePercent).toBe(3);
		expect(linkEffect('adventurers-curiosity', 2).criticalRatePercent).toBe(4);
		expect(linkEffect('adventurers-curiosity', 3).criticalRatePercent).toBe(6);
		// Empirical Knowledge per stack: Lv1 1, Lv2 1, Lv3 2, Lv9 5 (x3 stacks).
		expect(linkEffect('empirical-knowledge', 1).damagePercent).toBe(3);
		expect(linkEffect('empirical-knowledge', 2).damagePercent).toBe(3);
		expect(linkEffect('empirical-knowledge', 3).damagePercent).toBe(6);
		// Cygnus ATT: Lv1 7, Lv2 9, Lv3 11, Lv15 35.
		expect(linkEffect('cygnus-blessing', 1).attack).toBe(7);
		expect(linkEffect('cygnus-blessing', 2).attack).toBe(9);
		expect(linkEffect('cygnus-blessing', 3).attack).toBe(11);
	});

	it('gives the cited Pirate Blessing ladder at every level', () => {
		expect(linkEffect('pirate-blessing', 1)).toMatchObject({
			allStatFlat: 20,
			maxHpFlat: 350,
			damageTakenPercent: -5
		});
		expect(linkEffect('pirate-blessing', 2)).toMatchObject({
			allStatFlat: 30,
			maxHpFlat: 525,
			damageTakenPercent: -7
		});
		expect(linkEffect('pirate-blessing', 3)).toMatchObject({
			allStatFlat: 40,
			maxHpFlat: 700,
			damageTakenPercent: -9
		});
		expect(linkEffect('pirate-blessing', 9)).toMatchObject({
			allStatFlat: 100,
			maxHpFlat: 1750,
			maxMpFlat: 1750,
			damageTakenPercent: -21
		});
	});

	it('attributes the Demon links the right way round', () => {
		expect(linkSkillForClass('demon-slayer')?.id).toBe('fury-unleashed');
		expect(linkEffect('fury-unleashed', 3).bossDamagePercent).toBe(20);
		expect(linkSkillForClass('demon-avenger')?.id).toBe('wild-rage');
		expect(linkEffect('wild-rage', 3).damagePercent).toBe(15);
	});
});

/* -------------------------------------------------------------------------- */
/* Self versions — §B2.3                                                       */
/* -------------------------------------------------------------------------- */

describe('self versions', () => {
	it('adds the self-only damage passive on top of the transferred effect', () => {
		// Luminous: transferred is IED +20%; the owner also gets +4% Damage.
		expect(linkEffect('light-wash', 3, false)).toEqual({ ignoreDefensePercent: 20 });
		expect(linkEffect('light-wash', 3, true)).toEqual({
			ignoreDefensePercent: 20,
			damagePercent: 4
		});
	});

	it('gives Ren +5% Damage on its own link that a Ren mule does not give', () => {
		expect(linkEffect('grounded-body', 3, false)).toEqual({ damageTakenPercent: -6 });
		expect(linkEffect('grounded-body', 3, true)).toEqual({
			damageTakenPercent: -6,
			damagePercent: 5
		});
	});

	it('turns pure-utility links into damage for their owner', () => {
		// Close Call, Elven Blessing, Rune Persistence, Combo Kill Blessing.
		for (const id of ['close-call', 'rune-persistence', 'combo-kill-blessing']) {
			expect(linkEffect(id, 3, false).damagePercent, id).toBeUndefined();
			expect(linkEffect(id, 3, true).damagePercent, id).toBe(5);
		}
		expect(linkEffect('elven-blessing', 3, false)).toEqual({ expPercent: 20 });
		expect(linkEffect('elven-blessing', 3, true)).toEqual({ expPercent: 20, damagePercent: 5 });
	});

	it('replaces rather than adds when the self version is a different value', () => {
		// Cygnus: ATT +35 transferred, +55 for a Cygnus Knight — not +90.
		expect(linkEffect('cygnus-blessing', 15, false).attack).toBe(35);
		expect(linkEffect('cygnus-blessing', 15, true).attack).toBe(55);
		// Angelic Buster: the transferred version is exactly half.
		expect(linkEffect('terms-and-conditions', 3, false).damagePercent).toBe(60);
		expect(linkEffect('terms-and-conditions', 3, true).damagePercent).toBe(120);
		// Pirate Blessing Lv9: 100 transferred, 130 for an Explorer Pirate.
		expect(linkEffect('pirate-blessing', 9, false).allStatFlat).toBe(100);
		expect(linkEffect('pirate-blessing', 9, true).allStatFlat).toBe(130);
	});

	it('gates the tiered self passives on their cited levels', () => {
		// Explorer Warrior: Lv7 +2%, Lv8 +4%, Lv9 +6%.
		expect(linkEffect('invincible-belief', 6, true).damagePercent).toBeUndefined();
		expect(linkEffect('invincible-belief', 7, true).damagePercent).toBe(2);
		expect(linkEffect('invincible-belief', 8, true).damagePercent).toBe(4);
		expect(linkEffect('invincible-belief', 9, true).damagePercent).toBe(6);
		// Resistance: Lv9 +2%, Lv10 +3%, Lv11 +4%, Lv12 +5%.
		expect(linkEffect('spirit-of-freedom', 8, true).damagePercent).toBeUndefined();
		expect(linkEffect('spirit-of-freedom', 9, true).damagePercent).toBe(2);
		expect(linkEffect('spirit-of-freedom', 12, true).damagePercent).toBe(5);
	});
});

/* -------------------------------------------------------------------------- */
/* Conditional links                                                           */
/* -------------------------------------------------------------------------- */

describe('conditional links', () => {
	it('marks the conditional links and leaves the rest alone', () => {
		const conditional = Object.values(LINK_SKILLS)
			.filter((s) => s.condition)
			.map((s) => s.id)
			.sort();
		expect(conditional).toEqual([
			'elementalism',
			'empirical-knowledge',
			'moonlit-blade-learnings',
			'qi-cultivation',
			'solus',
			'terms-and-conditions',
			'thiefs-cunning',
			'tide-of-battle',
			'time-to-prepare',
			'unfair-advantage'
		]);
		expect(LINK_SKILLS['light-wash'].condition).toBeUndefined();
		expect(LINK_SKILLS['wild-rage'].condition).toBeUndefined();
	});

	it('derives cooldown uptimes from duration over cooldown', () => {
		// Angelic Buster: 10s on a 60s cooldown.
		const ab = LINK_SKILLS['terms-and-conditions'].condition!;
		expect(ab.assumedUptime).toBeCloseTo(10 / 60, 10);
		expect(ab.uptimeIsArithmetic).toBe(true);
		// Kain: 20s on a 40s cooldown. Thief's Cunning: 10s on a 20s cooldown.
		expect(LINK_SKILLS['time-to-prepare'].condition!.assumedUptime).toBe(0.5);
		expect(LINK_SKILLS['thiefs-cunning'].condition!.assumedUptime).toBe(0.5);
	});

	it('does not claim arithmetic for the guessed stack and proc uptimes', () => {
		for (const id of [
			'empirical-knowledge',
			'tide-of-battle',
			'solus',
			'qi-cultivation',
			'elementalism'
		]) {
			expect(LINK_SKILLS[id].condition!.uptimeIsArithmetic, id).toBeUndefined();
		}
	});

	it('scales an effect by uptime', () => {
		// Angelic Buster's headline +60% is +10% once you account for the cooldown.
		expect(linkEffect('terms-and-conditions', 3).damagePercent).toBe(60);
		expect(effectiveLinkEffect('terms-and-conditions', 3).damagePercent).toBeCloseTo(10, 10);
		// Kain's +25% is +12.5%.
		expect(effectiveLinkEffect('time-to-prepare', 3).damagePercent).toBe(12.5);
	});

	it('leaves unconditional links untouched', () => {
		expect(effectiveLinkEffect('light-wash', 3)).toEqual(linkEffect('light-wash', 3));
		expect(effectiveLinkEffect('wild-rage', 3)).toEqual({ damagePercent: 15 });
	});

	it('leaves state-gated links at full value', () => {
		// Hayato and Cadena are gated on a standing condition, not on uptime.
		expect(effectiveLinkEffect('moonlit-blade-learnings', 3).criticalDamagePercent).toBe(7);
		expect(effectiveLinkEffect('unfair-advantage', 3).damagePercent).toBe(9);
	});

	it('scales the self version too', () => {
		expect(effectiveLinkEffect('terms-and-conditions', 3, true).damagePercent).toBeCloseTo(20, 10);
	});
});

/* -------------------------------------------------------------------------- */
/* Roster rollup                                                               */
/* -------------------------------------------------------------------------- */

describe('availableLinks', () => {
	it('lists only the links a roster can actually supply', () => {
		const available = availableLinks([
			{ classId: 'hero', level: 270 },
			{ classId: 'wind-archer', level: 263 },
			{ classId: 'battle-mage', level: 260 },
			{ classId: 'ren', level: 272 }
		]);
		expect(available.map((a) => a.id).sort()).toEqual([
			'cygnus-blessing',
			'grounded-body',
			'invincible-belief',
			'spirit-of-freedom'
		]);
	});

	it('reports each link at its roster level, not its cap', () => {
		const available = availableLinks([{ classId: 'hero', level: 270 }]);
		expect(available).toEqual([{ id: 'invincible-belief', level: 3, maxLevel: 9 }]);
	});

	it('sorts highest level first', () => {
		const available = availableLinks([
			{ classId: 'hero', level: 270 },
			{ classId: 'paladin', level: 270 },
			{ classId: 'dark-knight', level: 270 },
			{ classId: 'ren', level: 272 }
		]);
		expect(available[0]).toEqual({ id: 'invincible-belief', level: 9, maxLevel: 9 });
	});

	it('returns nothing for an empty roster', () => {
		expect(availableLinks([])).toEqual([]);
	});

	// The four SSS characters visible on the Ren legion card.
	it('reads the captured Ren roster', () => {
		const available = availableLinks([
			{ classId: 'ren', level: 272 },
			{ classId: 'hero', level: 270 },
			{ classId: 'wind-archer', level: 263 },
			{ classId: 'battle-mage', level: 260 }
		]);
		const byId = Object.fromEntries(available.map((a) => [a.id, a.level]));
		// One Cygnus class and one Resistance class: 3 of 15 and 3 of 12.
		expect(byId['cygnus-blessing']).toBe(3);
		expect(byId['spirit-of-freedom']).toBe(3);
		// One Explorer Warrior: 3 of 9.
		expect(byId['invincible-belief']).toBe(3);
		// Ren's own link — and Ren is the character being played, so it is the
		// self version that applies.
		expect(byId['grounded-body']).toBe(3);
		expect(linkEffect('grounded-body', 3, true).damagePercent).toBe(5);
	});
});
