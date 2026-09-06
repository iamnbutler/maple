import { describe, expect, it } from 'vitest';

import type { Character } from '$lib/schema';

import {
	generateHexaSkills,
	generateHexaStat,
	generateLegionArtifact,
	generateLegionBoard,
	generateLinks,
	generateVMatrix
} from './progression-candidates';

/**
 * The real Ren captured on 2026-09-06 (docs/capture/2026-09-06-lutoren.md),
 * trimmed to what these generators read. Using the live character rather than a
 * synthetic one keeps the generators honest: every number below came off a
 * screenshot.
 */
function ren(mutate: (character: Character) => void = () => {}): Character {
	const character = {
		id: 'lutoren',
		name: 'Lutoren',
		world: 'Kronos',
		classId: 'ren',
		level: 272,
		equipment: {},
		legion: {
			level: 9083,
			// Read off the Grid Bonuses list: IED/Boss/Normal at the 40-square cap,
			// Critical Damage +20% = 40 squares, Critical Rate +12% = 12 squares.
			board: {
				ignoreDefense: 40,
				bossDamage: 40,
				normalDamage: 40,
				criticalDamage: 40,
				criticalRate: 12,
				luk: 5,
				maxHp: 6,
				maxMp: 1,
				att: 1,
				matt: 1
			},
			artifact: {
				level: 39,
				effects: {
					bossDamage: 10,
					ignoreDefense: 10,
					buffDuration: 10,
					mesosObtained: 9,
					itemDropRate: 10,
					criticalDamage: 10,
					expObtained: 9,
					summonDuration: 10,
					finalAttackDamage: 9
				}
			}
		},
		hexa: {
			solErda: 1,
			solErdaFragments: 1129,
			// Three enhancement nodes sit at exactly 09 — one level below the
			// milestone. That is the pattern this whole module exists to surface.
			skills: [
				{ id: 'Origin', type: 'origin', level: 9 },
				{ id: 'Enhancement A', type: 'enhancement', level: 9 },
				{ id: 'Enhancement B', type: 'enhancement', level: 7 },
				{ id: 'Enhancement C', type: 'enhancement', level: 2 },
				{ id: 'Enhancement D', type: 'enhancement', level: 1 },
				{ id: 'Mastery A', type: 'mastery', level: 0 }
			],
			stat: [
				{
					main: { key: 'criticalDamage', level: 2 },
					additional: [
						{ key: 'attack', level: 10 },
						{ key: 'mainStat', level: 8 }
					]
				},
				{
					main: { key: 'attack', level: 6 },
					additional: [
						{ key: 'criticalDamage', level: 8 },
						{ key: 'mainStat', level: 6 }
					]
				}
			]
		},
		createdAt: '2026-09-06T00:00:00.000Z',
		updatedAt: '2026-09-06T00:00:00.000Z'
	} as unknown as Character;
	mutate(character);
	return character;
}

/* -------------------------------------------------------------------------- */
/* Links                                                                       */
/* -------------------------------------------------------------------------- */

describe('generateLinks', () => {
	it('says so rather than staying silent when no links are captured', () => {
		const { candidates, notes } = generateLinks(ren());
		expect(candidates).toEqual([]);
		expect(notes[0]).toMatch(/No link skills captured/);
	});

	it('proposes the next level of an under-levelled link', () => {
		const { candidates } = generateLinks(
			ren((c) => {
				c.links = [{ id: 'cygnus-blessing', level: 3 }];
			})
		);
		expect(candidates).toHaveLength(1);
		expect(candidates[0].label).toBe('Cygnus Blessing Lv3 → Lv4');
		// ATT is +2 per level on the Cygnus ladder.
		expect(candidates[0].delta.att).toBe(2);
		expect(candidates[0].cost.muleLevels).toBe(1);
		expect(candidates[0].cost.mesos).toBeUndefined();
	});

	it('offers nothing for a link already at its cap', () => {
		const { candidates } = generateLinks(
			ren((c) => {
				c.links = [{ id: 'light-wash', level: 3 }];
			})
		);
		expect(candidates).toEqual([]);
	});

	it('uses the self version for the character own class', () => {
		// Ren playing Ren gets Grounded Body's +5% Damage at Lv3; a Ren mule does
		// not. The mule version is pure damage reduction, so it would produce no
		// candidate at all.
		const { candidates } = generateLinks(
			ren((c) => {
				c.links = [{ id: 'grounded-body', level: 2 }];
			})
		);
		expect(candidates).toHaveLength(1);
		expect(candidates[0].delta.dmg).toBe(5);
		expect(candidates[0].notes?.join(' ')).toMatch(/self version/);
	});

	it('scales a conditional link by its uptime and flags it', () => {
		// Angelic Buster's headline +15% step is 10s on a 60s cooldown.
		const { candidates } = generateLinks(
			ren((c) => {
				c.links = [{ id: 'terms-and-conditions', level: 2 }];
			})
		);
		expect(candidates[0].delta.dmg).toBeCloseTo(15 / 6, 6);
		expect(candidates[0].notes?.join(' ')).toMatch(/Conditional/);
		// Duration over cooldown is arithmetic, so it stays 'sourced'.
		expect(candidates[0].confidence).toBe('sourced');
	});

	it('marks a guessed-uptime link as estimated', () => {
		const { candidates } = generateLinks(
			ren((c) => {
				c.links = [{ id: 'elementalism', level: 1 }];
			})
		);
		expect(candidates[0].confidence).toBe('estimated');
		expect(candidates[0].notes?.join(' ')).toMatch(/ESTIMATE/);
	});

	it('reports an unknown link id rather than throwing', () => {
		const { candidates, notes } = generateLinks(
			ren((c) => {
				c.links = [{ id: 'Cygnus Knights', level: 0 }];
			})
		);
		expect(candidates).toEqual([]);
		expect(notes.join(' ')).toMatch(/not in the link table/);
	});

	it('never prices a link in mesos', () => {
		const { candidates } = generateLinks(
			ren((c) => {
				c.links = [
					{ id: 'cygnus-blessing', level: 3 },
					{ id: 'light-wash', level: 1 }
				];
			})
		);
		expect(candidates.length).toBeGreaterThan(0);
		for (const candidate of candidates) {
			expect(candidate.cost.mesos).toBeUndefined();
			expect(candidate.feasibility).toBe('grind');
		}
	});
});

/* -------------------------------------------------------------------------- */
/* Legion board                                                                */
/* -------------------------------------------------------------------------- */

describe('generateLegionBoard', () => {
	it('offers nothing for an area already at the rank cap', () => {
		// Ren has Boss Damage, IED and Critical Damage all at 40/40.
		const { candidates } = generateLegionBoard(ren());
		const ids = candidates.map((c) => c.id);
		expect(ids.some((id) => id.startsWith('legion-board:bossDamage'))).toBe(false);
		expect(ids.some((id) => id.startsWith('legion-board:ignoreDefense'))).toBe(false);
		expect(ids.some((id) => id.startsWith('legion-board:criticalDamage'))).toBe(false);
	});

	it('proposes filling Critical Rate, which Ren has only 12 of 40 squares in', () => {
		const { candidates } = generateLegionBoard(ren());
		const critRate = candidates.find((c) => c.id.startsWith('legion-board:criticalRate'));
		expect(critRate).toBeDefined();
		expect(critRate?.label).toBe('Legion Critical Rate: 12 → 40 squares');
		expect(critRate?.delta.critRate).toBe(28);
		expect(critRate?.cost.legionSquares).toBe(28);
	});

	it('puts board stat in the base channel, not the final one', () => {
		// Board STR is "% applied"; the Legion MEMBER effect is the final one.
		const { candidates } = generateLegionBoard(
			ren((c) => {
				c.legion!.board = { str: 0 };
			})
		);
		const str = candidates.find((c) => c.id.startsWith('legion-board:str'));
		expect(str?.delta.mainFlat).toBe(75);
		expect(str?.delta.mainFinal).toBeUndefined();
	});

	it('caps an area at what the Legion rank actually offers', () => {
		const { candidates } = generateLegionBoard(
			ren((c) => {
				c.legion = { level: 3_000, board: {} }; // Renowned I: 13 outer squares
			})
		);
		const boss = candidates.find((c) => c.id.startsWith('legion-board:bossDamage'));
		expect(boss?.label).toBe('Legion Boss Damage: 0 → 13 squares');
		expect(boss?.delta.boss).toBe(13);
	});

	it('says so when there is no Legion at all', () => {
		expect(generateLegionBoard(ren((c) => (c.legion = { level: 100 }))).notes[0]).toMatch(
			/needs level 500/
		);
		expect(generateLegionBoard(ren((c) => (c.legion = undefined))).notes[0]).toMatch(
			/No Legion level captured/
		);
	});

	it('never prices a board area in mesos', () => {
		for (const candidate of generateLegionBoard(ren()).candidates) {
			expect(candidate.cost.mesos).toBeUndefined();
			expect(candidate.cost.legionSquares).toBeGreaterThan(0);
		}
	});
});

/* -------------------------------------------------------------------------- */
/* Legion Artifact                                                             */
/* -------------------------------------------------------------------------- */

describe('generateLegionArtifact', () => {
	it('offers to reassign the budget sitting in non-damage effects', () => {
		// Ren has 9 + 10 + 9 + 10 + 10 = 48 effect levels in mesos, drop, EXP,
		// buff duration and summon duration.
		const { candidates } = generateLegionArtifact(ren());
		const restat = candidates.filter((c) => c.id.includes(':restat:'));
		expect(restat.length).toBeGreaterThan(0);
		for (const candidate of restat) {
			expect(candidate.cost.artifactPoints).toBe(500);
			expect(candidate.cost.artifactExp).toBeUndefined();
			expect(candidate.feasibility).toBe('routine');
		}
	});

	it('warns that a reassignment gives up real income', () => {
		const { candidates } = generateLegionArtifact(ren());
		const restat = candidates.find((c) => c.id.includes(':restat:'));
		expect(restat?.notes?.join(' ')).toMatch(/boss-run loadout/);
	});

	it('prices the next level that actually buys budget', () => {
		const { candidates } = generateLegionArtifact(ren());
		const levelUp = candidates.find((c) => c.id.startsWith('legion-artifact:level:'));
		expect(levelUp?.label).toBe('Artifact Level 39 → 40');
		expect(levelUp?.cost.artifactExp).toBe(10_000);
		expect(levelUp?.detail).toMatch(/\+9 effect levels/);
	});

	it('skips the dead zone and prices 54 to 60 as a single step', () => {
		const { candidates } = generateLegionArtifact(
			ren((c) => {
				c.legion!.artifact = { level: 54, effects: { bossDamage: 5 } };
			})
		);
		const levelUp = candidates.find((c) => c.id.startsWith('legion-artifact:level:'));
		expect(levelUp?.label).toBe('Artifact Level 54 → 60');
		expect(levelUp?.cost.artifactExp).toBe(730_000);
		expect(levelUp?.detail).toMatch(/grant no budget at all/);
	});

	it('warns when the captured effects overspend the level budget', () => {
		const { notes } = generateLegionArtifact(
			ren((c) => {
				// Artifact Level 1 affords 12 effect levels; these spend 20.
				c.legion!.artifact = { level: 1, effects: { bossDamage: 10, ignoreDefense: 10 } };
			})
		);
		expect(notes.join(' ')).toMatch(/sum to 20 levels but Artifact Level 1 affords 12/);
	});

	it('says so when no artifact is captured', () => {
		expect(generateLegionArtifact(ren((c) => (c.legion = { level: 9083 }))).notes[0]).toMatch(
			/No Legion Artifact level captured/
		);
	});
});

/* -------------------------------------------------------------------------- */
/* V Matrix                                                                    */
/* -------------------------------------------------------------------------- */

describe('generateVMatrix', () => {
	it('proposes Lv40 and Lv60 on every bossing boost node', () => {
		const { candidates } = generateVMatrix(ren());
		// Ren has four primary boost nodes, each offering 40 and 60.
		expect(candidates).toHaveLength(8);
		expect(candidates.filter((c) => c.id.endsWith(':0-40'))).toHaveLength(4);
		expect(candidates.filter((c) => c.id.endsWith(':0-60'))).toHaveLength(4);
	});

	it('leaves the non-bossing nodes alone', () => {
		const { candidates } = generateVMatrix(ren());
		// Nodes 5 and 6 are the levelling/mobility ones.
		expect(candidates.some((c) => c.id.includes('boost-5'))).toBe(false);
		expect(candidates.some((c) => c.id.includes('boost-6'))).toBe(false);
	});

	it('carries the Lv40 IED milestone but not on the 40 to 60 step', () => {
		const { candidates } = generateVMatrix(
			ren((c) => {
				c.vMatrix = { boost: [{ id: 'Plum Blossom Sword: Storm', level: 40 }] };
			})
		);
		const storm = candidates.find((c) => c.id.startsWith('v-matrix:boost-1'));
		expect(storm?.label).toMatch(/Lv40 → Lv60/);
		expect(storm?.delta.iedAdd).toBeUndefined();
		expect(storm?.delta.fd).toBe(40); // 2% x 20 levels
	});

	it('prices Lv0 to Lv40 at 40 V Points and the rest at 2 a level', () => {
		const { candidates } = generateVMatrix(ren());
		const toForty = candidates.find((c) => c.id.endsWith(':0-40'));
		const toSixty = candidates.find((c) => c.id.endsWith(':0-60'));
		expect(toForty?.cost.vPoints).toBe(40);
		expect(toSixty?.cost.vPoints).toBe(80);
		expect(toForty?.cost.mesos).toBeUndefined();
	});

	it('marks skill-scoped final damage as estimated and says why', () => {
		for (const candidate of generateVMatrix(ren()).candidates) {
			expect(candidate.confidence).toBe('estimated');
			expect(candidate.notes?.join(' ')).toMatch(/applies only to the skills this node names/);
		}
	});

	it('says so for a class with no transcribed roster', () => {
		const { candidates, notes } = generateVMatrix(
			ren((c) => {
				c.classId = 'bishop';
			})
		);
		expect(candidates).toEqual([]);
		expect(notes[0]).toMatch(/only the five priority classes/);
	});

	it('says so below the unlock level', () => {
		expect(generateVMatrix(ren((c) => (c.level = 199))).notes[0]).toMatch(/unlocks at level 200/);
	});
});

/* -------------------------------------------------------------------------- */
/* HEXA                                                                        */
/* -------------------------------------------------------------------------- */

describe('generateHexaSkills', () => {
	it('prices to the next milestone, not the next level', () => {
		const { candidates } = generateHexaSkills(ren());
		const atNine = candidates.find((c) => c.id.startsWith('hexa-skill:Enhancement A'));
		expect(atNine?.label).toBe('HEXA Enhancement A Lv9 → Lv10');
		// One level of Final Damage, but the milestone makes it +6, not +1.
		expect(atNine?.delta.fd).toBe(6);
		expect(atNine?.detail).toMatch(/milestone/);
	});

	it('surfaces the 9 to 10 step as the best value on the board', () => {
		const { candidates } = generateHexaSkills(ren());
		const perPoint = (id: string) => {
			const c = candidates.find((x) => x.id.startsWith(id))!;
			return c.cost.solErdaFragments! / (c.delta.fd as number);
		};
		// A node at 9 buys FD far more cheaply than one at 1 or 2, because the
		// milestone lands in the very next level.
		expect(perPoint('hexa-skill:Enhancement A')).toBeLessThan(perPoint('hexa-skill:Enhancement D'));
	});

	it('only considers enhancement nodes', () => {
		const { candidates } = generateHexaSkills(ren());
		expect(candidates.every((c) => c.id.includes('Enhancement'))).toBe(true);
		expect(candidates.some((c) => c.id.includes('Origin'))).toBe(false);
	});

	it('flags a step the character cannot currently afford', () => {
		const { candidates } = generateHexaSkills(ren());
		// Ren holds 1 Sol Erda and 1129 fragments; a 9 to 10 step needs 8 and 150.
		const affordable = candidates.find((c) => c.feasibility === 'grind');
		expect(affordable?.cost.note).toMatch(/more than you currently hold/);
	});

	it('never prices a HEXA node in mesos', () => {
		for (const candidate of generateHexaSkills(ren()).candidates) {
			expect(candidate.cost.mesos).toBeUndefined();
			expect(candidate.cost.solErdaFragments).toBeGreaterThan(0);
		}
	});

	it('says so when nothing is captured or the character is too low', () => {
		expect(generateHexaSkills(ren((c) => (c.level = 259))).notes[0]).toMatch(
			/unlocks at level 260/
		);
		expect(generateHexaSkills(ren((c) => (c.hexa = {}))).notes[0]).toMatch(
			/No HEXA skill nodes captured/
		);
	});
});

describe('generateHexaStat', () => {
	it('offers nothing for cores already at 20/20', () => {
		// Both of Ren's captured cores are full.
		const { candidates } = generateHexaStat(ren());
		expect(candidates).toEqual([]);
	});

	it('weights the gain by which line the roll will actually level', () => {
		const { candidates } = generateHexaStat(
			ren((c) => {
				c.hexa!.stat = [
					{
						main: { key: 'bossDamage', level: 0 },
						additional: [
							{ key: 'attack', level: 0 },
							{ key: 'criticalDamage', level: 0 }
						]
					}
				];
			})
		);
		expect(candidates).toHaveLength(1);
		const candidate = candidates[0];
		// Main line at 0 -> 35% main, 32.5% each additional.
		// Boss damage base is 1 per level on the main line.
		expect(candidate.delta.boss).toBeCloseTo(1 * 0.35, 6);
		// Attack base is 5 on an additional line.
		expect(candidate.delta.att).toBeCloseTo(5 * 0.325, 6);
		// Critical damage base is 0.35 on an additional line.
		expect(candidate.delta.critDmg).toBeCloseTo(0.35 * 0.325, 6);
	});

	it('gives a capped line no weight at all', () => {
		const { candidates } = generateHexaStat(
			ren((c) => {
				c.hexa!.stat = [
					{
						main: { key: 'bossDamage', level: 0 },
						additional: [
							{ key: 'attack', level: 10 },
							{ key: 'criticalDamage', level: 5 }
						]
					}
				];
			})
		);
		// Attack is capped, so critical damage takes the whole 65%.
		expect(candidates[0].delta.att).toBeUndefined();
		expect(candidates[0].delta.critDmg).toBeCloseTo(0.35 * 0.65, 6);
	});

	it('prices the enhancement off the main line level and marks it estimated', () => {
		const { candidates } = generateHexaStat(
			ren((c) => {
				c.hexa!.stat = [
					{
						main: { key: 'bossDamage', level: 8 },
						additional: [
							{ key: 'attack', level: 5 },
							{ key: 'criticalDamage', level: 5 }
						]
					}
				];
			})
		);
		// Main line at 8 costs 40 fragments per enhancement.
		expect(candidates[0].cost.solErdaFragments).toBe(40);
		expect(candidates[0].confidence).toBe('estimated');
		expect(candidates[0].notes?.join(' ')).toMatch(/cannot choose which line levels/);
	});

	it('says so when no cores are captured', () => {
		expect(generateHexaStat(ren((c) => (c.hexa = {}))).notes[0]).toMatch(
			/No HEXA Stat cores captured/
		);
	});
});
