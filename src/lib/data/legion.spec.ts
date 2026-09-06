import { describe, expect, it } from 'vitest';

import { listClasses } from './classes';
import {
	CHARACTER_RANKS,
	EVENT_BLOCK_MAX,
	INNER_AREAS,
	LEGION_AREA_KEYS,
	LEGION_JOBS_WITH_EFFECTS,
	LEGION_MAX_MEMBERS,
	LEGION_MEMBER_EFFECTS,
	LEGION_RANKS,
	OUTER_AREAS,
	OVERDRIVE_LIVE_IN_GMS,
	areaCapacity,
	areaValue,
	boardSizeAt,
	characterRank,
	coverageBudget,
	legionMembersAt,
	legionRankAt,
	memberEffectValue,
	nextLegionRank,
	nextRankGate,
	outerSquaresAt,
	rankSquares,
	rosterEffects
} from './legion';

/* -------------------------------------------------------------------------- */
/* Character ranks — formulas.md §4B §2 §1.1                                   */
/* -------------------------------------------------------------------------- */

describe('character ranks', () => {
	it('promotes at 60 / 100 / 140 / 200 / 250', () => {
		expect(characterRank(59)).toBeNull();
		expect(characterRank(60)).toBe('B');
		expect(characterRank(99)).toBe('B');
		expect(characterRank(100)).toBe('A');
		expect(characterRank(139)).toBe('A');
		expect(characterRank(140)).toBe('S');
		expect(characterRank(199)).toBe('S');
		expect(characterRank(200)).toBe('SS');
		expect(characterRank(249)).toBe('SS');
		expect(characterRank(250)).toBe('SSS');
	});

	it('puts Zero on its own curve: 130 / 160 / 180 / 200 / 250', () => {
		expect(characterRank(129, true)).toBeNull();
		expect(characterRank(130, true)).toBe('B');
		expect(characterRank(160, true)).toBe('A');
		expect(characterRank(180, true)).toBe('S');
		expect(characterRank(200, true)).toBe('SS');
		expect(characterRank(250, true)).toBe('SSS');
	});

	// §1.1 — "There are no ranks above SSS."
	it('stops improving the piece past 250', () => {
		expect(characterRank(250)).toBe('SSS');
		expect(characterRank(272)).toBe('SSS');
		expect(characterRank(300)).toBe('SSS');
		expect(nextRankGate(250)).toBeNull();
		expect(nextRankGate(300)).toBeNull();
	});

	it('gives 1/2/3/4/5 squares by rank', () => {
		expect(CHARACTER_RANKS.map((r) => r.squares)).toEqual([1, 2, 3, 4, 5]);
		expect(rankSquares('SSS')).toBe(5);
		expect(rankSquares('B')).toBe(1);
	});

	it('reports the next gate and what it is worth', () => {
		expect(nextRankGate(245)).toEqual({ rank: 'SSS', atLevel: 250, squaresGained: 1 });
		// A level-140 character is S (3 squares); SS at 200 is worth one more.
		expect(nextRankGate(140)).toEqual({ rank: 'SS', atLevel: 200, squaresGained: 1 });
		// Below the B gate entirely: reaching 60 is worth the whole first square.
		expect(nextRankGate(1)).toEqual({ rank: 'B', atLevel: 60, squaresGained: 1 });
	});
});

/* -------------------------------------------------------------------------- */
/* Legion ranks — §3                                                           */
/* -------------------------------------------------------------------------- */

describe('legion ranks', () => {
	it('has 25 ranks: 5 tiers x 5 sub-ranks', () => {
		expect(LEGION_RANKS).toHaveLength(25);
		for (const tier of ['Nameless', 'Renowned', 'Heroic', 'Legendary', 'Supreme'] as const) {
			expect(LEGION_RANKS.filter((r) => r.tier === tier)).toHaveLength(5);
		}
	});

	it('steps the Legion Level requirement by 500 from 500 to 12,500', () => {
		expect(LEGION_RANKS.map((r) => r.legionLevel)).toEqual(
			Array.from({ length: 25 }, (_, i) => 500 + i * 500)
		);
	});

	it('has no rank below Legion Level 500', () => {
		expect(legionRankAt(0)).toBeNull();
		expect(legionRankAt(499)).toBeNull();
		expect(legionRankAt(500)?.label).toBe('Nameless Legion I');
	});

	// The Ren capture: Legion 9083 -> Legendary Legion III, 38 members.
	it('reproduces the captured Ren legion: 9083 is Legendary III with 38 members', () => {
		const rank = legionRankAt(9083);
		expect(rank?.label).toBe('Legendary Legion III');
		expect(rank?.members).toBe(38);
		expect(legionMembersAt(9083)).toBe(38);
	});

	it('caps members at 45 and reaches it at Supreme V / 12,500', () => {
		expect(legionMembersAt(12_500)).toBe(LEGION_MAX_MEMBERS);
		expect(legionMembersAt(12_600)).toBe(LEGION_MAX_MEMBERS);
		expect(LEGION_RANKS.at(-1)?.label).toBe('Supreme Legion V');
	});

	it('reports the next rank, and none at Supreme V', () => {
		expect(nextLegionRank(9083)?.label).toBe('Legendary Legion IV');
		expect(nextLegionRank(9083)?.legionLevel).toBe(9_500);
		expect(nextLegionRank(12_500)).toBeNull();
	});
});

/* -------------------------------------------------------------------------- */
/* Board size — §2                                                             */
/* -------------------------------------------------------------------------- */

describe('board size', () => {
	it('grows 12x10 -> 22x20 and stops at Heroic II / 6,000', () => {
		expect(boardSizeAt(500)).toEqual({ width: 12, height: 10 });
		expect(boardSizeAt(2_000)).toEqual({ width: 14, height: 12 });
		expect(boardSizeAt(3_000)).toEqual({ width: 16, height: 14 });
		expect(boardSizeAt(4_000)).toEqual({ width: 18, height: 16 });
		expect(boardSizeAt(5_000)).toEqual({ width: 20, height: 18 });
		expect(boardSizeAt(6_000)).toEqual({ width: 22, height: 20 });
		// Everything past 6,000 buys attackers, not board.
		expect(boardSizeAt(12_500)).toEqual({ width: 22, height: 20 });
	});

	it('carries the size forward through ranks that do not unlock a new one', () => {
		expect(boardSizeAt(1_500)).toEqual({ width: 12, height: 10 });
		expect(boardSizeAt(9_083)).toEqual({ width: 22, height: 20 });
	});

	// §2 — the outer-per-area ladder is directly cited, and the arithmetic
	// 8 inner x 15 + 8 outer x 40 = 440 = 22x20 is the self-consistency check.
	it('has 16 areas whose full-board squares sum to 22x20', () => {
		expect(LEGION_AREA_KEYS).toHaveLength(16);
		expect(Object.keys(INNER_AREAS)).toHaveLength(8);
		expect(Object.keys(OUTER_AREAS)).toHaveLength(8);
		const inner = Object.values(INNER_AREAS).reduce((n, a) => n + a.maxSquares, 0);
		const outer = Object.values(OUTER_AREAS).reduce((n, a) => n + a.maxSquares, 0);
		expect(inner).toBe(120);
		expect(outer).toBe(320);
		expect(inner + outer).toBe(22 * 20);
	});

	it('steps outer squares per area 0/6/13/21/30/40', () => {
		expect(outerSquaresAt(500)).toBe(0);
		expect(outerSquaresAt(2_000)).toBe(6);
		expect(outerSquaresAt(3_000)).toBe(13);
		expect(outerSquaresAt(4_000)).toBe(21);
		expect(outerSquaresAt(5_000)).toBe(30);
		expect(outerSquaresAt(6_000)).toBe(40);
		expect(outerSquaresAt(12_500)).toBe(40);
	});

	it('grants the whole inner grid immediately but no outer grid', () => {
		expect(areaCapacity('str', 500)).toBe(15);
		expect(areaCapacity('bossDamage', 500)).toBe(0);
	});
});

/* -------------------------------------------------------------------------- */
/* Board stat values — §5                                                      */
/* -------------------------------------------------------------------------- */

describe('board stat values', () => {
	it('gives the cited per-square inner values', () => {
		expect(areaValue('str', 15, 12_500)).toBe(75);
		expect(areaValue('maxHp', 15, 12_500)).toBe(3_750);
		expect(areaValue('att', 15, 12_500)).toBe(15);
		expect(areaValue('matt', 15, 12_500)).toBe(15);
	});

	it('gives the cited per-square outer values at a full board', () => {
		expect(areaValue('criticalRate', 40, 12_500)).toBe(40);
		expect(areaValue('bossDamage', 40, 12_500)).toBe(40);
		expect(areaValue('normalDamage', 40, 12_500)).toBe(40);
		expect(areaValue('buffDuration', 40, 12_500)).toBe(40);
		expect(areaValue('ignoreDefense', 40, 12_500)).toBe(40);
		expect(areaValue('statusResistance', 40, 12_500)).toBe(40);
		// Critical Damage is +0.5%/square, EXP is +0.25%/square — the two areas
		// that are NOT 1:1 and that stale guides get wrong.
		expect(areaValue('criticalDamage', 40, 12_500)).toBe(20);
		expect(areaValue('expObtained', 40, 12_500)).toBe(10);
	});

	// §5.3 checkpoints, corroborated by namu.wiki:
	// Renowned III -> Crit Damage 10.5%, Heroic II -> Crit Damage 20%.
	it('reproduces the cited Critical Damage checkpoints by rank', () => {
		expect(areaValue('criticalDamage', 40, 4_000)).toBe(10.5);
		expect(areaValue('criticalDamage', 40, 6_000)).toBe(20);
	});

	it('clamps to the squares the board actually offers at that rank', () => {
		// Asking for 40 Boss Damage squares on a 16x14 board only gets you 13.
		expect(areaValue('bossDamage', 40, 3_000)).toBe(13);
		// And none at all before the outer grid exists.
		expect(areaValue('bossDamage', 40, 500)).toBe(0);
	});

	it('rejects a negative square count', () => {
		expect(() => areaValue('bossDamage', -1, 12_500)).toThrow(/>= 0/);
	});

	// The Ren capture reads IED +40% / Boss +40% / Normal +40% / Crit Damage
	// +20% / Crit Rate +12% at Legion 9083. Everything but Crit Rate is at the
	// 40-square cap; Crit Rate is 12 of 40 squares filled.
	it('reproduces the captured Ren board', () => {
		const legion = 9_083;
		expect(areaValue('ignoreDefense', 40, legion)).toBe(40);
		expect(areaValue('bossDamage', 40, legion)).toBe(40);
		expect(areaValue('normalDamage', 40, legion)).toBe(40);
		expect(areaValue('criticalDamage', 40, legion)).toBe(20);
		expect(areaValue('criticalRate', 12, legion)).toBe(12);
		expect(areaValue('luk', 5, legion)).toBe(25);
		expect(areaValue('maxHp', 6, legion)).toBe(1_500);
		expect(areaValue('maxMp', 1, legion)).toBe(250);
		expect(areaValue('att', 1, legion)).toBe(1);
		expect(areaValue('matt', 1, legion)).toBe(1);
	});

	it('has no Stance area and no plain Damage area', () => {
		// §5.2 flags AyumiLove for listing both. Encoded so nobody re-adds them.
		expect(LEGION_AREA_KEYS).not.toContain('stance');
		expect(LEGION_AREA_KEYS).not.toContain('damage');
		expect(LEGION_AREA_KEYS).toContain('normalDamage');
	});
});

/* -------------------------------------------------------------------------- */
/* Coverage budget — §2.1, §5.3                                                */
/* -------------------------------------------------------------------------- */

describe('coverage budget', () => {
	// StrategyWiki's cited anchor: Grand Master Union 1 with 36 Lv200 characters
	// = 36 attackers x 4 grids = 144 grids.
	it('reproduces the cited Legendary I / all-SS anchor of 144 squares', () => {
		expect(coverageBudget(8_000, 'SS', 0)).toBe(144);
	});

	it('tops out at 235 squares in GMS: 45 SSS members plus 2 event blocks', () => {
		expect(coverageBudget(12_500, 'SSS', EVENT_BLOCK_MAX)).toBe(235);
		expect(coverageBudget(12_500, 'SSS', 0)).toBe(225);
	});

	it('never counts more than 2 event blocks', () => {
		expect(coverageBudget(12_500, 'SSS', 9)).toBe(235);
	});

	it('is short of the 440-square board even at maximum', () => {
		expect(coverageBudget(12_500, 'SSS', EVENT_BLOCK_MAX)).toBeLessThan(440);
	});
});

/* -------------------------------------------------------------------------- */
/* Member effects — §4                                                         */
/* -------------------------------------------------------------------------- */

describe('member effects', () => {
	it('covers 53 GMS jobs, which is more than the 45 attacker slots', () => {
		expect(LEGION_JOBS_WITH_EFFECTS).toBe(53);
		expect(LEGION_JOBS_WITH_EFFECTS).toBeGreaterThan(LEGION_MAX_MEMBERS);
	});

	it('keys every effect by a real class id from classes.ts', () => {
		const known = new Set(listClasses().map((c) => c.id));
		for (const classId of Object.keys(LEGION_MEMBER_EFFECTS)) {
			expect(known, `${classId} is not in classes.ts`).toContain(classId);
		}
	});

	it('has an effect for every GMS class in classes.ts', () => {
		for (const cls of listClasses()) {
			expect(LEGION_MEMBER_EFFECTS[cls.id], `${cls.id} has no Legion effect`).toBeDefined();
		}
	});

	it('does not include removed or KMS-only classes', () => {
		// §4.7 Lethe is KMS-only; §4.9 Beast Tamer / Jett / Zen are removed.
		for (const gone of ['lethe', 'beast-tamer', 'jett', 'zen']) {
			expect(LEGION_MEMBER_EFFECTS[gone]).toBeUndefined();
		}
	});

	it('uses the 10/20/40/80/100 ladder for final stat effects', () => {
		expect(LEGION_MEMBER_EFFECTS.hero.values).toEqual([10, 20, 40, 80, 100]);
		expect(memberEffectValue('hero', 'SSS')).toBe(100);
		expect(memberEffectValue('hero', 'SS')).toBe(80);
		expect(memberEffectValue('bow-master', 'SSS')).toBe(100);
	});

	// The percent ladder is 1/2/3/**5**/6 — SS is 5, not 4. Not a typo.
	it('uses the irregular 1/2/3/5/6 ladder for the percent effects', () => {
		expect(LEGION_MEMBER_EFFECTS.shade.values).toEqual([1, 2, 3, 5, 6]);
		expect(memberEffectValue('shade', 'SS')).toBe(5);
		expect(memberEffectValue('demon-avenger', 'SS')).toBe(5);
		expect(memberEffectValue('lynn', 'SS')).toBe(5);
		// Marksman / Night Lord critical rate is the regular 1/2/3/4/5 ladder.
		expect(LEGION_MEMBER_EFFECTS.marksman.values).toEqual([1, 2, 3, 4, 5]);
	});

	it('marks STR/DEX/INT/LUK member effects as final stat', () => {
		expect(LEGION_MEMBER_EFFECTS.hero.finalStat).toBe(true);
		expect(LEGION_MEMBER_EFFECTS.xenon.finalStat).toBe(true);
		// Board STR is base stat; member STR is final. Different channels.
		expect(INNER_AREAS.str.note).toMatch(/IS multiplied/);
	});

	it('attributes the Demon Slayer / Demon Avenger effects the right way round', () => {
		// §4 flags that the commonly-cited attribution is backwards.
		expect(LEGION_MEMBER_EFFECTS['demon-avenger'].stat).toBe('bossDamage');
		expect(LEGION_MEMBER_EFFECTS['demon-slayer'].stat).toBe('statusResistance');
	});

	it('gives Ren movement speed, not a damage stat', () => {
		expect(LEGION_MEMBER_EFFECTS.ren.stat).toBe('moveSpeed');
		expect(memberEffectValue('ren', 'SSS')).toBe(10);
	});

	it('throws on an unknown class', () => {
		expect(() => memberEffectValue('not-a-class', 'SSS')).toThrow(/No Legion member effect/);
	});
});

/* -------------------------------------------------------------------------- */
/* Roster composition — §4's dedupe rule                                       */
/* -------------------------------------------------------------------------- */

describe('rosterEffects', () => {
	it('sums different jobs granting the same stat', () => {
		const { totals } = rosterEffects([
			{ classId: 'hero', level: 250 },
			{ classId: 'paladin', level: 250 },
			{ classId: 'kaiser', level: 250 }
		]);
		expect(totals.str).toBe(300);
	});

	it('counts a duplicate job once, keeping the higher rank', () => {
		const { totals, counted, ignored } = rosterEffects([
			{ classId: 'hero', level: 200 }, // SS -> 80
			{ classId: 'hero', level: 250 } // SSS -> 100
		]);
		expect(totals.str).toBe(100);
		expect(counted).toHaveLength(1);
		expect(counted[0]).toMatchObject({ classId: 'hero', rank: 'SSS', value: 100 });
		expect(ignored).toHaveLength(1);
		expect(ignored[0].reason).toMatch(/duplicate job/);
	});

	it('keeps the higher rank regardless of roster order', () => {
		const ascending = rosterEffects([
			{ classId: 'hero', level: 200 },
			{ classId: 'hero', level: 250 }
		]);
		const descending = rosterEffects([
			{ classId: 'hero', level: 250 },
			{ classId: 'hero', level: 200 }
		]);
		expect(ascending.totals.str).toBe(100);
		expect(descending.totals.str).toBe(100);
	});

	it('drops characters below the rank-B gate', () => {
		const { totals, ignored } = rosterEffects([{ classId: 'hero', level: 59 }]);
		expect(totals.str).toBeUndefined();
		expect(ignored[0].reason).toMatch(/below the rank-B level gate/);
	});

	it('applies the Zero level gate to Zero only', () => {
		// Level 129 Zero is below its own gate; a level 129 Hero is rank A.
		expect(rosterEffects([{ classId: 'zero', level: 129 }]).totals.expObtained).toBeUndefined();
		expect(rosterEffects([{ classId: 'zero', level: 130 }]).totals.expObtained).toBe(4);
		expect(rosterEffects([{ classId: 'hero', level: 129 }]).totals.str).toBe(20);
	});

	it('reports unknown classes rather than throwing', () => {
		const { totals, ignored } = rosterEffects([
			{ classId: 'lethe', level: 250 },
			{ classId: 'hero', level: 250 }
		]);
		expect(totals.str).toBe(100);
		expect(ignored).toEqual([
			{ classId: 'lethe', level: 250, reason: 'no Legion member effect for this class' }
		]);
	});

	// The Ren capture's member bonus list, read off three pages of tooltips.
	it('reproduces the captured Ren member bonuses for the legible rows', () => {
		const { totals } = rosterEffects([
			// STR +100 / +80 x4
			{ classId: 'hero', level: 272 },
			{ classId: 'paladin', level: 200 },
			{ classId: 'buccaneer', level: 200 },
			{ classId: 'kaiser', level: 200 },
			{ classId: 'adele', level: 200 },
			// DEX +100 / +80
			{ classId: 'bow-master', level: 263 },
			{ classId: 'wind-archer', level: 200 },
			// INT +100 / +80 x2
			{ classId: 'battle-mage', level: 260 },
			{ classId: 'bishop', level: 200 },
			{ classId: 'luminous', level: 200 },
			// LUK +100 x2
			{ classId: 'shadower', level: 250 },
			{ classId: 'night-walker', level: 250 },
			// Critical Damage +5% x3
			{ classId: 'shade', level: 200 },
			{ classId: 'hayato', level: 200 },
			{ classId: 'mo-xuan', level: 200 },
			// Critical Rate +4% x2
			{ classId: 'marksman', level: 200 },
			{ classId: 'night-lord', level: 200 },
			// Ignore Defense +5% x2
			{ classId: 'blaster', level: 200 },
			{ classId: 'lynn', level: 200 },
			// Buff Duration +15%, Cooldown -5%, Mesos +4%
			{ classId: 'mechanic', level: 140 },
			{ classId: 'mercedes', level: 200 },
			{ classId: 'phantom', level: 200 }
		]);

		expect(totals.str).toBe(100 + 80 * 4);
		expect(totals.dex).toBe(100 + 80);
		expect(totals.int).toBe(100 + 80 * 2);
		expect(totals.luk).toBe(100 * 2);
		expect(totals.criticalDamage).toBe(15);
		expect(totals.criticalRate).toBe(8);
		expect(totals.ignoreDefense).toBe(10);
		expect(totals.buffDuration).toBe(15);
		expect(totals.cooldownReduction).toBe(-5);
		expect(totals.mesosObtained).toBe(4);
	});
});

/* -------------------------------------------------------------------------- */
/* Forward compatibility                                                       */
/* -------------------------------------------------------------------------- */

describe('overdrive', () => {
	it('is not live in GMS as of 2026-09-06', () => {
		expect(OVERDRIVE_LIVE_IN_GMS).toBe(false);
	});

	it('carries the point value each rank would grant under the new model', () => {
		expect(CHARACTER_RANKS.map((r) => r.overdrivePoints)).toEqual([1, 2, 3, 4, 5]);
	});
});
