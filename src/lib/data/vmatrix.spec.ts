import { describe, expect, it } from 'vitest';

import {
	BOOST_NODE_LEVEL_COST,
	BOOST_NODE_LV40_IED_PERCENT,
	BOOST_NODES,
	COMMON_NODES,
	COMMON_NODE_IDS,
	HEXA_BOOST_NODE_GATE,
	HEXA_MASTERY_NODE_GATE,
	JOB_NODES,
	REMOVED_MECHANICS,
	REN_GRANDIS_BLESSING_FD_PERCENT,
	SKILL_NODE_LEVEL_COST,
	SPECIAL_NODE_30_DAY_COST,
	SPECIAL_NODE_7_DAY_COST,
	UNSOURCED_ITEM_NAMES,
	UNVERIFIED_FD_BY_JOB_TIER,
	V_MATRIX_UNLOCK_LEVEL,
	V_NODE_TYPES,
	V_POINT_COST_TO_MAX,
	boostNodeFinalDamage,
	commonNodeValue,
	composeBoostNodeFd,
	tryCommonNodeValue,
	vPointCost,
	vPointsToMaxAll
} from './vmatrix';

/* -------------------------------------------------------------------------- */
/* Taxonomy — vmatrix.md §1                                                    */
/* -------------------------------------------------------------------------- */

describe('node taxonomy', () => {
	it('gives every character 4 job nodes, 6 boost nodes and 1 special slot', () => {
		expect(V_NODE_TYPES.job.count).toBe(4);
		expect(V_NODE_TYPES.boost.count).toBe(6);
		expect(V_NODE_TYPES.special.count).toBe(1);
		expect(V_NODE_TYPES.common.count).toBe('varies');
	});

	it('caps job and common nodes at 30 and boost nodes at 60', () => {
		expect(V_NODE_TYPES.job.maxLevel).toBe(30);
		expect(V_NODE_TYPES.common.maxLevel).toBe(30);
		expect(V_NODE_TYPES.boost.maxLevel).toBe(60);
	});

	it('starts job nodes at level 1 and boost/common nodes at 0', () => {
		expect(V_NODE_TYPES.job.startLevel).toBe(1);
		expect(V_NODE_TYPES.boost.startLevel).toBe(0);
		expect(V_NODE_TYPES.common.startLevel).toBe(0);
	});

	it('unlocks at 5th job and is not level-gated past that', () => {
		expect(V_MATRIX_UNLOCK_LEVEL).toBe(200);
	});

	it('names the two HEXA gates', () => {
		expect(HEXA_BOOST_NODE_GATE).toEqual({ nodeType: 'job', level: 25 });
		expect(HEXA_MASTERY_NODE_GATE).toEqual({ nodeType: 'boost', level: 40 });
	});
});

/* -------------------------------------------------------------------------- */
/* Cost curves — §5.3                                                          */
/* -------------------------------------------------------------------------- */

describe('cost curves', () => {
	it('matches the wiki cost module for skill nodes: 7, then 4/6/9 by decade', () => {
		expect(SKILL_NODE_LEVEL_COST).toHaveLength(30);
		expect(SKILL_NODE_LEVEL_COST[0]).toBe(7);
		expect(SKILL_NODE_LEVEL_COST.slice(1, 10).every((c) => c === 4)).toBe(true);
		expect(SKILL_NODE_LEVEL_COST.slice(10, 20).every((c) => c === 6)).toBe(true);
		expect(SKILL_NODE_LEVEL_COST.slice(20, 30).every((c) => c === 9)).toBe(true);
	});

	it('matches the wiki cost module for boost nodes: 1 through Lv40, then 2', () => {
		expect(BOOST_NODE_LEVEL_COST).toHaveLength(60);
		expect(BOOST_NODE_LEVEL_COST.slice(0, 40).every((c) => c === 1)).toBe(true);
		expect(BOOST_NODE_LEVEL_COST.slice(40, 60).every((c) => c === 2)).toBe(true);
	});

	it('totals 193 for a common node from locked to max', () => {
		expect(vPointCost('common', 0, 30)).toBe(193);
		expect(V_POINT_COST_TO_MAX.common).toBe(193);
	});

	it('totals 186 for a job node, whose 7-point unlock is pre-paid', () => {
		expect(vPointCost('job', 1, 30)).toBe(186);
		expect(V_POINT_COST_TO_MAX.job).toBe(186);
	});

	it('totals 80 for a boost node from 0 to 60', () => {
		expect(vPointCost('boost', 0, 60)).toBe(80);
		expect(V_POINT_COST_TO_MAX.boost).toBe(80);
	});

	it('prices the two HEXA gates', () => {
		// Boost node to Lv40 is 40 points — 1 per level all the way.
		expect(vPointCost('boost', 0, 40)).toBe(40);
		// Job node from its starting level 1 to Lv25.
		expect(vPointCost('job', 1, 25)).toBe(141);
	});

	it('reproduces the cited decade cumulatives', () => {
		expect(vPointCost('common', 0, 1)).toBe(7);
		expect(vPointCost('common', 0, 10)).toBe(43);
		expect(vPointCost('common', 0, 20)).toBe(103);
	});

	it('returns 0 for a non-upgrade and rejects out-of-range levels', () => {
		expect(vPointCost('boost', 40, 40)).toBe(0);
		expect(vPointCost('boost', 50, 40)).toBe(0);
		expect(() => vPointCost('boost', 0, 61)).toThrow(/run 0-60/);
		expect(() => vPointCost('job', -1, 10)).toThrow(/run 0-30/);
	});

	it('has no cost curve for special nodes, which are not levelled', () => {
		expect(() => vPointCost('special', 0, 1)).toThrow(/not levelled/);
	});

	it('prices a whole matrix at roughly 4,800 V Points', () => {
		// 4 x 186 + 6 x 80 + 19 x 193.
		expect(vPointsToMaxAll(19)).toBe(744 + 480 + 3_667);
		expect(vPointsToMaxAll(19)).toBe(4_891);
	});

	it('shows common nodes are the dominant sink', () => {
		const common = 19 * V_POINT_COST_TO_MAX.common;
		expect(common / vPointsToMaxAll(19)).toBeGreaterThan(0.7);
	});
});

/* -------------------------------------------------------------------------- */
/* Boost nodes — §2                                                            */
/* -------------------------------------------------------------------------- */

describe('boost nodes', () => {
	it('reproduces the 2.2x multiplier for a 4th-job skill at Lv60', () => {
		// formulas.md line 249's figure, now correctly scoped to 4th job / Hyper.
		expect(boostNodeFinalDamage(2, 60)).toBe(120);
		expect(1 + boostNodeFinalDamage(2, 60) / 100).toBeCloseTo(2.2, 10);
	});

	it('gives a much larger multiplier for the lower-tier skills', () => {
		expect(boostNodeFinalDamage(7, 60)).toBe(420); // x5.20
		expect(boostNodeFinalDamage(5, 60)).toBe(300); // x4.00
		expect(boostNodeFinalDamage(3, 60)).toBe(180); // x2.80
	});

	it('is zero at level 0 and rejects out-of-range levels', () => {
		expect(boostNodeFinalDamage(2, 0)).toBe(0);
		expect(() => boostNodeFinalDamage(2, 61)).toThrow(/run 0-60/);
		expect(() => boostNodeFinalDamage(2, -1)).toThrow(/run 0-60/);
	});

	it('composes multiplicatively with existing final damage', () => {
		// 100% FD plus a 120% boost node is 340%, not 220%.
		expect(composeBoostNodeFd(100, 120)).toBeCloseTo(340, 10);
		expect(composeBoostNodeFd(0, 120)).toBeCloseTo(120, 10);
	});

	it('grants +20% IED at Lv40 on every node', () => {
		expect(BOOST_NODE_LV40_IED_PERCENT).toBe(20);
	});

	it('keeps the job-tier ladder marked unverified', () => {
		expect(UNVERIFIED_FD_BY_JOB_TIER).toEqual({ 1: 7, 2: 5, 3: 3, 4: 2, hyper: 2 });
	});
});

describe('the five priority classes', () => {
	const PRIORITY = ['ren', 'hero', 'wind-archer', 'battle-mage', 'night-walker'] as const;

	it('has a six-node boost roster for each', () => {
		for (const classId of PRIORITY) {
			expect(BOOST_NODES[classId], classId).toHaveLength(6);
			expect(
				BOOST_NODES[classId].map((n) => n.index),
				classId
			).toEqual([1, 2, 3, 4, 5, 6]);
		}
	});

	it('has four job nodes for each', () => {
		for (const classId of PRIORITY) {
			expect(JOB_NODES[classId], classId).toHaveLength(4);
		}
	});

	it('gives each a bossing set of primary nodes', () => {
		for (const classId of PRIORITY) {
			const primary = BOOST_NODES[classId].filter((n) => n.priority === 'primary');
			expect(primary.length, classId).toBeGreaterThanOrEqual(4);
		}
	});

	it('prices every primary bossing skill at 2% or 3%', () => {
		// The 5% and 7% skills are all levelling/mobility, and they sit on the
		// non-bossing nodes in every one of the five rosters.
		for (const classId of PRIORITY) {
			const primary = BOOST_NODES[classId]
				.filter((n) => n.priority === 'primary')
				.flatMap((n) => n.skills);
			for (const skill of primary) {
				expect(skill.fdPerLevel, `${classId} ${skill.skill}`).toBeLessThanOrEqual(3);
			}
		}
	});

	it('records the per-skill exceptions to the job-tier pattern', () => {
		// Battle Mage's Condemnation is a 1st-job skill at 2%, not 7%.
		const condemnation = BOOST_NODES['battle-mage']
			.flatMap((n) => n.skills)
			.find((s) => s.skill === 'Condemnation');
		expect(condemnation?.fdPerLevel).toBe(2);
		// Night Walker's Shadow Bat, likewise.
		const shadowBat = BOOST_NODES['night-walker']
			.flatMap((n) => n.skills)
			.find((s) => s.skill === 'Shadow Bat');
		expect(shadowBat?.fdPerLevel).toBe(2);
	});

	it('flags the Hero node-2 conflict rather than hiding it', () => {
		const node2 = BOOST_NODES.hero.find((n) => n.index === 2);
		expect(node2?.note).toMatch(/CONFLICT/);
	});
});

describe("Ren's boost nodes", () => {
	const ren = BOOST_NODES.ren;

	it('has six nodes, four of them bossing', () => {
		expect(ren).toHaveLength(6);
		expect(ren.filter((n) => n.priority === 'primary')).toHaveLength(4);
		expect(ren.map((n) => n.index)).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it('prices every bossing skill at 2%, which is why 2% is the number that matters', () => {
		const bossing = ren.filter((n) => n.priority === 'primary').flatMap((n) => n.skills);
		// Raining Blossoms is the one 3% skill inside a primary node.
		const rates = new Set(bossing.map((s) => s.fdPerLevel));
		expect([...rates].sort()).toEqual([2, 3]);
		// Nodes 1-4 carry nine boosted skills; eight are 2% and only Raining
		// Blossoms is 3%.
		expect(bossing).toHaveLength(9);
		expect(bossing.filter((s) => s.fdPerLevel === 2)).toHaveLength(8);
		expect(bossing.filter((s) => s.fdPerLevel === 3)).toHaveLength(1);
	});

	it('keeps the wiki per-skill value over the job-tier rule for Spirit Strike', () => {
		// 2nd job would predict 5%; the wiki says 2%, and the wiki wins.
		const spiritStrike = ren
			.flatMap((n) => n.skills)
			.find((s) => s.skill.includes('Spirit Strike'));
		expect(spiritStrike?.fdPerLevel).toBe(2);
		expect(spiritStrike?.fdPerLevel).not.toBe(UNVERIFIED_FD_BY_JOB_TIER[2]);
	});

	it('carries the 7% and 5% low-tier skills only on the non-bossing nodes', () => {
		const other = ren.filter((n) => n.priority === 'other').flatMap((s) => s.skills);
		expect(other.map((s) => s.fdPerLevel).sort()).toEqual([3, 5, 7]);
	});

	it('groups three Final Imugi techniques under one boost', () => {
		const node3 = ren.find((n) => n.index === 3);
		expect(node3?.skills).toHaveLength(3);
		expect(node3?.skills.every((s) => s.skill.startsWith('Final Imugi Spirit Sword'))).toBe(true);
	});

	it('lists four job nodes', () => {
		expect(JOB_NODES.ren).toHaveLength(4);
	});
});

/* -------------------------------------------------------------------------- */
/* Common nodes — §4                                                           */
/* -------------------------------------------------------------------------- */

describe('common nodes', () => {
	it('scales the linear passives one per level', () => {
		expect(commonNodeValue('rope-lift', 1)).toBe(1);
		expect(commonNodeValue('rope-lift', 30)).toBe(30);
		expect(commonNodeValue('blink', 30)).toBe(30);
		expect(commonNodeValue('impenetrable-skin', 30)).toBe(30);
		expect(commonNodeValue('last-resort', 30)).toBe(30);
	});

	it('scales the Decent passives in steps of five levels', () => {
		// +1 at Lv1-5, +2 at Lv6-10 ... +6 at Lv26-30.
		expect(commonNodeValue('decent-sharp-eyes', 1)).toBe(1);
		expect(commonNodeValue('decent-sharp-eyes', 5)).toBe(1);
		expect(commonNodeValue('decent-sharp-eyes', 6)).toBe(2);
		expect(commonNodeValue('decent-sharp-eyes', 15)).toBe(3);
		expect(commonNodeValue('decent-sharp-eyes', 25)).toBe(5);
		expect(commonNodeValue('decent-sharp-eyes', 26)).toBe(6);
		expect(commonNodeValue('decent-sharp-eyes', 30)).toBe(6);
	});

	it('gives 0 at level 0 and rejects out-of-range levels', () => {
		expect(commonNodeValue('blink', 0)).toBe(0);
		expect(() => commonNodeValue('blink', 31)).toThrow(/run 0-30/);
		expect(() => commonNodeValue('nope', 1)).toThrow(/Unknown common node/);
	});

	// The honesty rule: the research publishes only Lv1 and Lv30 for these, so
	// the module refuses to invent the curve between them.
	it('refuses to interpolate an anchors-only node', () => {
		expect(() => commonNodeValue('weapon-aura', 15)).toThrow(/not sourced/);
		expect(() => commonNodeValue('grandis-goddesss-blessing', 15)).toThrow(/not sourced/);
		expect(tryCommonNodeValue('weapon-aura', 15)).toBeUndefined();
		expect(tryCommonNodeValue('blink', 15)).toBe(15);
	});

	it('carries the cited endpoints for the big faction buffs', () => {
		// Ren reads the ANIMA column, not Nova's 6 -> 35.
		expect(COMMON_NODES['grandis-goddesss-blessing'].valueAtLv1).toBe(11);
		expect(COMMON_NODES['grandis-goddesss-blessing'].valueAtLv30).toBe(40);
		expect(COMMON_NODES['transcendent-cygnuss-blessing'].valueAtLv30).toBe(72);
		expect(COMMON_NODES['empress-cygnuss-blessing'].valueAtLv30).toBe(61);
		expect(COMMON_NODES['maple-world-goddesss-blessing'].valueAtLv30).toBe(20);
	});

	it('carries the cited endpoints for the branch buffs', () => {
		expect(COMMON_NODES['weapon-aura'].valueAtLv30).toBe(6); // FD +6%
		expect(COMMON_NODES['mana-overload'].valueAtLv30).toBe(8); // FD +8%
		expect(COMMON_NODES['vicious-shot'].valueAtLv30).toBe(50); // 50% of crit rate
	});

	it('keeps the flat Ren-only Grandis final damage separate from the node curve', () => {
		// +15% FD at EVERY node level — levelling the node buys only the %Damage.
		expect(REN_GRANDIS_BLESSING_FD_PERCENT).toBe(15);
		expect(COMMON_NODES['grandis-goddesss-blessing'].note).toMatch(/does NOT scale/);
	});

	it('flags the two nodes the research says to verify in-game', () => {
		expect(COMMON_NODES['decent-advanced-blessing'].note).toMatch(/verify in-game/);
	});

	it('caps every common node at 30', () => {
		for (const id of COMMON_NODE_IDS) {
			expect(COMMON_NODES[id].maxLevel, id).toBe(30);
		}
	});
});

/* -------------------------------------------------------------------------- */
/* Special nodes and stale sources — §6, §8                                    */
/* -------------------------------------------------------------------------- */

describe('special nodes', () => {
	it('prices 7 and 30 days', () => {
		expect(SPECIAL_NODE_7_DAY_COST).toBe(14);
		expect(SPECIAL_NODE_30_DAY_COST).toBe(48);
	});

	it('picks the 30-day price consistent with the stated 1.6 points per day', () => {
		expect(SPECIAL_NODE_30_DAY_COST / 30).toBeCloseTo(1.6, 10);
	});
});

describe('the v269 rework', () => {
	it('records what was removed, so a stale source can be spotted', () => {
		const joined = REMOVED_MECHANICS.join(' ');
		expect(joined).toMatch(/Node slots/);
		expect(joined).toMatch(/Matrix Points/);
		expect(joined).toMatch(/Node Shards/);
		expect(joined).toMatch(/trios/);
		expect(joined).toMatch(/V Points from character level/);
	});

	it('records the item names no source supports', () => {
		expect(UNSOURCED_ITEM_NAMES).toContain('Perfect Node Stone');
		expect(UNSOURCED_ITEM_NAMES).toContain('Powerful Nodestone');
	});
});
