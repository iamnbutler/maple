// Candidate upgrades from the four progression systems: link skills, the Legion
// board and Artifact, the V Matrix and the HEXA Matrix.
//
// These live apart from `candidates.ts` because they differ from it in one
// structural way: NOTHING here costs mesos. A link skill costs levels on another
// character, a board area costs squares you can only earn by levelling mules, a
// V Matrix node costs Nodestones and a HEXA node costs Sol Erda. None of those
// convert to mesos, so `rank.ts` cannot put them on the meso ladder and they
// carry their own currency instead (see `UpgradeCost`).
//
// The honesty rule that shapes everything below: a V Matrix boost node and a
// HEXA enhancement node grant **skill-scoped** Final Damage — it applies to the
// one skill the node names, not to the character. `CalcInput` has a single
// global `finalDamagePercent`, so applying a skill-scoped boost to it assumes
// that skill carries the whole rotation. That assumption is defensible for a
// class's primary bossing skill and plainly false for its mobbing skills, so
// candidates built on it are `estimated`, never `sourced`, and say so.

import type { Delta } from '$lib/calc/types';
import { getClass, type ClassDef } from '$lib/data/classes';
import * as hexa from '$lib/data/hexa';
import * as legion from '$lib/data/legion';
import * as artifact from '$lib/data/legion-artifact';
import * as links from '$lib/data/links';
import * as vmatrix from '$lib/data/vmatrix';
import type { Character } from '$lib/schema';

import type { CandidateResult, UpgradeCandidate } from './candidates';

type FourStat = 'str' | 'dex' | 'int' | 'luk';

function mainStatOf(cls: ClassDef): FourStat | undefined {
	const key = cls.primary[0];
	return key === 'hp' ? undefined : (key as FourStat);
}

function subStatOf(cls: ClassDef): FourStat | undefined {
	const key = cls.secondary[0];
	return key === 'hp' || key === undefined ? undefined : (key as FourStat);
}

/** True when a delta would move the damage number at all. */
function isEmpty(delta: Delta): boolean {
	return Object.values(delta).every(
		(value) => value === undefined || (Array.isArray(value) ? value.length === 0 : value === 0)
	);
}

/* -------------------------------------------------------------------------- */
/* Link skills                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Turn a link skill's effect into a `Delta`.
 *
 * `allStatFlat` goes to the "% not applied" channel because
 * `links.LINK_FLAT_STAT_CHANNEL` is `'unverified'` and under-crediting an
 * upgrade is the safer error for a ranking engine.
 */
function linkDelta(effect: links.LinkEffect, cls: ClassDef): Delta {
	const delta: Delta = {};
	const main = mainStatOf(cls);
	const sub = subStatOf(cls);

	if (effect.damagePercent) delta.dmg = effect.damagePercent;
	if (effect.bossDamagePercent) delta.boss = effect.bossDamagePercent;
	if (effect.criticalRatePercent) delta.critRate = effect.criticalRatePercent;
	if (effect.criticalDamagePercent) delta.critDmg = effect.criticalDamagePercent;
	if (effect.allStatPercent) delta.allStatPct = effect.allStatPercent;
	if (effect.attack) delta.att = effect.attack;
	if (effect.ignoreDefensePercent) delta.iedAdd = [effect.ignoreDefensePercent];
	if (effect.allStatFlat) {
		if (main) delta.mainFinal = effect.allStatFlat;
		if (sub) delta.subFinal = effect.allStatFlat;
	}
	return delta;
}

/**
 * One candidate per link skill that is not yet at its cap: what the NEXT level
 * is worth, and what levelling it costs in mule levels.
 *
 * The cost is deliberately expressed in `muleLevels`, not days or mesos. Taking
 * a faction link up one level means taking one contributing character from
 * Lv120 to Lv210 (or from nothing to Lv120), and there is no honest exchange
 * rate between that and a star force click.
 */
export function generateLinks(character: Character): CandidateResult {
	const cls = getClass(character.classId);
	const candidates: UpgradeCandidate[] = [];
	const notes: string[] = [];

	if (!character.links || character.links.length === 0) {
		return {
			candidates,
			notes: ['No link skills captured, so no link upgrades were considered.']
		};
	}

	const ownLink = links.linkSkillForClass(character.classId);

	for (const equipped of character.links) {
		const spec = links.LINK_SKILLS[equipped.id];
		if (!spec) {
			notes.push(`Link "${equipped.id}" is not in the link table; skipped.`);
			continue;
		}
		if (equipped.level >= spec.maxLevel) continue;

		const forSelf = ownLink?.id === spec.id;
		const to = equipped.level + 1;
		const before = links.effectiveLinkEffect(spec.id, equipped.level, forSelf);
		const after = links.effectiveLinkEffect(spec.id, to, forSelf);

		// The gain is the difference between the two levels, not the whole effect.
		const gain: links.LinkEffect = {};
		for (const key of new Set([...Object.keys(before), ...Object.keys(after)]) as Set<
			keyof links.LinkEffect
		>) {
			const change = (after[key] ?? 0) - (before[key] ?? 0);
			if (change !== 0) gain[key] = change;
		}

		const delta = linkDelta(gain, cls);
		if (isEmpty(delta)) continue;

		const candidateNotes: string[] = [];
		if (spec.condition) {
			candidateNotes.push(
				`Conditional: ${spec.condition.note}. Scaled to ${Math.round(spec.condition.assumedUptime * 100)}% uptime` +
					(spec.condition.uptimeIsArithmetic
						? ' (duration over cooldown).'
						: ' — an ESTIMATE, not a sourced figure.')
			);
		}
		if (forSelf && spec.self) {
			candidateNotes.push(`You play ${cls.name}, so this uses the self version, not the mule one.`);
		}
		if (spec.note) candidateNotes.push(spec.note);

		candidates.push({
			id: `link:${spec.id}:${equipped.level}-${to}`,
			kind: 'link',
			label: `${spec.name} Lv${equipped.level} → Lv${to}`,
			detail: spec.faction
				? `Faction link — each unique ${spec.faction} class contributes up to 3 levels.`
				: undefined,
			delta,
			cost: {
				muleLevels: 1,
				note: spec.faction
					? `needs another ${spec.faction} character levelled (Lv120 for its 2nd level, Lv210 for its 3rd)`
					: 'needs the contributing character levelled to 120, then 210'
			},
			// Uptime-scaled links are a model, not a table lookup.
			confidence: spec.condition && !spec.condition.uptimeIsArithmetic ? 'estimated' : 'sourced',
			feasibility: 'grind',
			notes: candidateNotes.length > 0 ? candidateNotes : undefined
		});
	}

	return { candidates, notes };
}

/* -------------------------------------------------------------------------- */
/* Legion board                                                                */
/* -------------------------------------------------------------------------- */

/** Board-area value into a `Delta`. Board stat is BASE stat — it IS %-multiplied. */
function boardDelta(area: legion.LegionAreaKey, value: number, cls: ClassDef): Delta {
	const main = mainStatOf(cls);
	const sub = subStatOf(cls);
	switch (area) {
		case 'bossDamage':
			return { boss: value };
		case 'criticalDamage':
			return { critDmg: value };
		case 'criticalRate':
			return { critRate: value };
		case 'ignoreDefense':
			return { iedAdd: [value] };
		case 'att':
			return cls.usesMagicAttack ? {} : { att: value };
		case 'matt':
			return cls.usesMagicAttack ? { att: value } : {};
		case 'str':
		case 'dex':
		case 'int':
		case 'luk':
			// Board stat is "% applied" — mainFlat, NOT mainFinal. Member effects
			// are the ones that go to the final channel.
			if (area === main) return { mainFlat: value };
			if (area === sub) return { subFlat: value };
			return {};
		default:
			return {};
	}
}

/**
 * One candidate per damage-relevant board area that is not yet full: what
 * filling it to the cap your Legion Rank allows is worth.
 *
 * Filling to the cap rather than +1 square, because a square is not an action —
 * you do not buy squares, you earn them by levelling mules and then choose where
 * they go. The real decision is "which area do I point my next piece at", and
 * that is a question about whole areas.
 */
export function generateLegionBoard(character: Character): CandidateResult {
	const cls = getClass(character.classId);
	const candidates: UpgradeCandidate[] = [];
	const notes: string[] = [];

	const legionLevel = character.legion?.level;
	if (legionLevel === undefined) {
		return { candidates, notes: ['No Legion level captured, so the board was not considered.'] };
	}
	if (legionLevel < legion.LEGION_MIN_LEVEL) {
		return { candidates, notes: [`A Legion needs level ${legion.LEGION_MIN_LEVEL} to exist.`] };
	}

	const board = character.legion?.board;

	// ABSENT IS NOT ZERO — same rule as the V Matrix generator. Treating an
	// uncaptured board as empty proposes filling Boss Damage from 0 to 40 squares
	// for +40% boss damage, which tops the board and is fiction for anyone whose
	// Legion is already built.
	if (!board || Object.keys(board).length === 0) {
		return {
			candidates,
			notes: [
				'No Legion board squares captured, so no board upgrades were considered. ' +
					'An uncaptured area is not an empty area.'
			]
		};
	}

	const rank = legion.legionRankAt(legionLevel);
	const budget = legion.coverageBudget(legionLevel);
	const filled = Object.values(board).reduce((sum, squares) => sum + (squares ?? 0), 0);
	const spare = Math.max(0, budget - filled);

	for (const area of legion.LEGION_AREA_KEYS) {
		const capacity = legion.areaCapacity(area, legionLevel);
		const current = board[area] ?? 0;
		if (current >= capacity) continue;

		const gained =
			legion.areaValue(area, capacity, legionLevel) - legion.areaValue(area, current, legionLevel);
		const delta = boardDelta(area, gained, cls);
		if (isEmpty(delta)) continue;

		const squares = capacity - current;
		const spec = legion.LEGION_AREAS[area];

		candidates.push({
			id: `legion-board:${area}:${current}-${capacity}`,
			kind: 'legion-board',
			label: `Legion ${spec.label}: ${current} → ${capacity} squares`,
			detail: `+${gained}${spec.unit === 'percent' ? '%' : ''} ${spec.label}.`,
			delta,
			cost: {
				legionSquares: squares,
				note:
					`${squares} squares at ${spec.perSquare}${spec.unit === 'percent' ? '%' : ''} each. ` +
					`${rank?.label} gives about ${budget} squares of coverage in total` +
					(filled > 0 ? `, of which ${filled} are placed and ~${spare} are spare.` : '.')
			},
			// The per-square values are sourced; what is not is whether the pieces
			// you own can actually be packed to reach the area.
			confidence: 'sourced',
			feasibility: spare >= squares ? 'routine' : 'grind',
			notes: [
				'Pieces must chain back to the four centre squares, so reaching an outer area also costs squares spent traversing the inner grid. Exact packing needs a solver.'
			]
		});
	}

	return { candidates, notes };
}

/* -------------------------------------------------------------------------- */
/* Legion Artifact                                                             */
/* -------------------------------------------------------------------------- */

function artifactDelta(key: artifact.ArtifactEffectKey, value: number, cls: ClassDef): Delta {
	const main = mainStatOf(cls);
	const sub = subStatOf(cls);
	switch (key) {
		case 'bossDamage':
			return { boss: value };
		case 'damage':
			return { dmg: value };
		case 'criticalDamage':
			return { critDmg: value };
		case 'criticalRate':
			return { critRate: value };
		case 'ignoreDefense':
			return { iedAdd: [value] };
		case 'attack':
			return { att: value };
		case 'allStat': {
			const delta: Delta = {};
			if (main) delta.mainFlat = value;
			if (sub) delta.subFlat = value;
			return delta;
		}
		default:
			return {};
	}
}

/**
 * Two kinds of Artifact action, because the system has exactly two.
 *
 * 1. **Reassign** — move existing budget between effects for 500 Artifact
 *    Points per crystal touched. Instant, costs no EXP, and is very often the
 *    right move (swap Mesos and Item Drop into Boss Damage and IED before a
 *    boss run). This is a first-class action, not a footnote.
 * 2. **Level up** — pay Artifact EXP for more budget. Lumpy: every x10 level is
 *    a +9 cliff and levels 55-59 grant nothing at all.
 */
export function generateLegionArtifact(character: Character): CandidateResult {
	const cls = getClass(character.classId);
	const candidates: UpgradeCandidate[] = [];
	const notes: string[] = [];

	const level = character.legion?.artifact?.level;
	if (level === undefined || level < 1) {
		return { candidates, notes: ['No Legion Artifact level captured.'] };
	}

	const effects = (character.legion?.artifact?.effects ?? {}) as Partial<
		Record<artifact.ArtifactEffectKey, number>
	>;
	const spent = Object.values(effects).reduce((sum, value) => sum + (value ?? 0), 0);
	const budget = artifact.effectLevelBudget(level);

	// (1) Reassignment. Only worth proposing when something non-damage is holding
	// budget that a damage effect could use.
	const wasted = artifact.ARTIFACT_EFFECT_KEYS.filter(
		(key) => !artifact.ARTIFACT_EFFECTS[key].damageRelevant && (effects[key] ?? 0) > 0
	);
	if (wasted.length > 0) {
		const freed = wasted.reduce((sum, key) => sum + (effects[key] ?? 0), 0);
		for (const key of artifact.ARTIFACT_EFFECT_KEYS) {
			if (!artifact.ARTIFACT_EFFECTS[key].damageRelevant) continue;
			const current = effects[key] ?? 0;
			if (current >= artifact.ARTIFACT_MAX_EFFECT_LEVEL) continue;

			const to = Math.min(artifact.ARTIFACT_MAX_EFFECT_LEVEL, current + freed);
			const gained = artifact.artifactEffectDelta(key, current, to);
			const delta = artifactDelta(key, gained, cls);
			if (isEmpty(delta)) continue;

			const spec = artifact.ARTIFACT_EFFECTS[key];
			candidates.push({
				id: `legion-artifact:restat:${key}:${current}-${to}`,
				kind: 'legion-artifact',
				label: `Artifact ${spec.label} Lv${current} → Lv${to} (reassign)`,
				detail:
					`Move the ${freed} effect levels currently in ` +
					`${wasted.map((k) => artifact.ARTIFACT_EFFECTS[k].label).join(', ')} into ${spec.label}.`,
				delta,
				cost: {
					artifactPoints: artifact.ARTIFACT_RESTAT_COST_POINTS,
					note: `${artifact.ARTIFACT_RESTAT_COST_POINTS} Artifact Points per crystal restatted; no EXP, instant`
				},
				confidence: 'sourced',
				feasibility: 'routine',
				notes: [
					'This gives up the reassigned stats entirely — mesos, drop rate and EXP are worth real income. Consider it a boss-run loadout rather than a permanent change.'
				]
			});
		}
	}

	// (2) Levelling, priced at the next level that actually buys budget.
	const next = artifact.nextMeaningfulLevel(level);
	if (next) {
		const target = artifact.ARTIFACT_EFFECT_KEYS.find(
			(key) =>
				artifact.ARTIFACT_EFFECTS[key].damageRelevant &&
				(effects[key] ?? 0) < artifact.ARTIFACT_MAX_EFFECT_LEVEL
		);
		if (target) {
			const current = effects[target] ?? 0;
			const to = Math.min(artifact.ARTIFACT_MAX_EFFECT_LEVEL, current + next.budgetGained);
			const gained = artifact.artifactEffectDelta(target, current, to);
			const delta = artifactDelta(target, gained, cls);
			const spec = artifact.ARTIFACT_EFFECTS[target];

			if (!isEmpty(delta)) {
				const ceilingDays = artifact.artifactDaysBetween(level, next.level, 14_500);
				candidates.push({
					id: `legion-artifact:level:${level}-${next.level}`,
					kind: 'legion-artifact',
					label: `Artifact Level ${level} → ${next.level}`,
					detail:
						`+${next.budgetGained} effect levels, shown here spent on ${spec.label}. ` +
						(next.level > level + 1
							? `Levels ${level + 1}-${next.level - 1} grant no budget at all, so this is one step, not ${next.level - level}.`
							: ''),
					delta,
					cost: {
						artifactExp: next.exp,
						days: ceilingDays,
						note: `${next.exp.toLocaleString()} Artifact EXP — about ${Math.round(ceilingDays)} days at the 14,500/week ceiling (2,000 normal + the top three boss missions)`
					},
					confidence: 'sourced',
					feasibility: 'grind',
					notes: [
						'The Artifact is a multi-year track: Lv39 to Lv60 is ~570 days even at maximum weekly income.'
					]
				});
			}
		}
	}

	if (spent > budget) {
		notes.push(
			`Captured Artifact effects sum to ${spent} levels but Artifact Level ${level} affords ${budget} — re-read the Artifact Bonuses panel.`
		);
	}

	return { candidates, notes };
}

/* -------------------------------------------------------------------------- */
/* V Matrix                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Boost nodes only, and only the ones covering the bossing rotation.
 *
 * The two things being proposed are the two that matter: **Lv40**, which is
 * where the +20% IED milestone lands and where the HEXA Mastery gate opens, and
 * **Lv60**, which is the rest of the Final Damage. Below Lv40 one V Point buys
 * 2% Final Damage on a bossing skill, which is the cheapest damage anywhere in
 * the game.
 *
 * ⚠️ The Final Damage is SKILL-SCOPED. Applying it to the character's single
 * global FD assumes the boosted skill carries the rotation, so these are
 * `estimated`.
 */
export function generateVMatrix(character: Character): CandidateResult {
	const candidates: UpgradeCandidate[] = [];
	const notes: string[] = [];

	if (character.level < vmatrix.V_MATRIX_UNLOCK_LEVEL) {
		return {
			candidates,
			notes: [`The V Matrix unlocks at level ${vmatrix.V_MATRIX_UNLOCK_LEVEL}.`]
		};
	}

	const roster = vmatrix.BOOST_NODES[character.classId];
	if (!roster) {
		return {
			candidates,
			notes: [
				`No V Matrix boost-node roster transcribed for ${character.classId}; only the five priority classes are covered.`
			]
		};
	}

	const captured = new Map(
		(character.vMatrix?.boost ?? []).map((node) => [node.id, node.level] as const)
	);

	// ABSENT IS NOT ZERO.
	//
	// Treating uncaptured boost nodes as level 0 proposes a 0 → 60 jump worth
	// +120% Final Damage, which lands at the very top of the board and is pure
	// fiction — the real Ren has all six nodes at 60/60 and no upgrade available
	// at all. A note the user might not read is no defence against a candidate
	// ranked first, so generate nothing.
	if (captured.size === 0) {
		return {
			candidates,
			notes: [
				'No V Matrix boost node levels captured, so no V Matrix upgrades were considered. ' +
					'Capture them before trusting the board: an uncaptured node is not a level-0 node.'
			]
		};
	}

	for (const node of roster) {
		if (node.priority !== 'primary') continue;

		// A node covering several skills grants each of them Final Damage at ITS
		// OWN rate, so there is no single number. Take the LOWEST rate in the
		// node: without a rotation model we cannot know which skill carries the
		// damage, and understating an upgrade is the safer error.
		const lowest = node.skills.reduce((a, b) => (b.fdPerLevel < a.fdPerLevel ? b : a));
		const highest = node.skills.reduce((a, b) => (b.fdPerLevel > a.fdPerLevel ? b : a));
		const level = captured.get(node.skills[0].skill) ?? captured.get(String(node.index));
		if (level === undefined) {
			notes.push(`Boost Node ${node.index} (${node.skills[0].skill}) was not captured; skipped.`);
			continue;
		}

		for (const to of [40, 60] as const) {
			if (level >= to) continue;

			const fdGain =
				vmatrix.boostNodeFinalDamage(lowest.fdPerLevel, to) -
				vmatrix.boostNodeFinalDamage(lowest.fdPerLevel, level);

			const delta: Delta = { fd: fdGain };
			// The +20% IED milestone at Lv40 is real and is not skill-scoped in
			// practice, because every bossing node grants it.
			if (level < 40 && to >= 40) delta.iedAdd = [vmatrix.BOOST_NODE_LV40_IED_PERCENT];

			candidates.push({
				id: `v-matrix:boost-${node.index}:${level}-${to}`,
				kind: 'v-matrix',
				label: `Boost Node ${node.index} (${node.skills[0].skill}) Lv${level} → Lv${to}`,
				detail:
					`+${fdGain}% Final Damage on ${node.skills.map((s) => s.skill).join(', ')}` +
					(level < 40 && to >= 40
						? `, plus the Lv40 milestone's +${vmatrix.BOOST_NODE_LV40_IED_PERCENT}% Ignored Enemy DEF and the HEXA Mastery gate.`
						: '.'),
				delta,
				cost: {
					vPoints: vmatrix.vPointCost('boost', level, to),
					note:
						to === 40
							? '1 V Point per level to Lv40 — the cheapest damage in the game'
							: '2 V Points per level past Lv40'
				},
				// Skill-scoped FD applied to a global FD term.
				confidence: 'estimated',
				feasibility: 'routine',
				notes: [
					'Boost node Final Damage applies only to the skills this node names. Treated here as if that skill carries the rotation, which overstates it for anything but a primary bossing skill.',
					...(highest.fdPerLevel !== lowest.fdPerLevel
						? [
								`This node covers skills at ${lowest.fdPerLevel}%-${highest.fdPerLevel}% Final Damage per level; the lower figure is used.`
							]
						: [])
				]
			});
		}
	}

	return { candidates, notes };
}

/* -------------------------------------------------------------------------- */
/* HEXA Matrix                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * HEXA enhancement nodes, priced to the next MILESTONE rather than the next
 * level.
 *
 * This is the whole reason the generator exists. Final Damage steps +1 per level
 * except at 10, 20 and 30, where it jumps +6, +6 and +11 — so a node sitting at
 * 9 looks like a bad deal one level ahead and is actually the second-cheapest
 * damage in the system. The captured Ren has three nodes sitting at exactly 09.
 */
export function generateHexaSkills(character: Character): CandidateResult {
	const candidates: UpgradeCandidate[] = [];
	const notes: string[] = [];

	if (character.level < hexa.HEXA_UNLOCK_LEVEL) {
		return { candidates, notes: [`The HEXA Matrix unlocks at level ${hexa.HEXA_UNLOCK_LEVEL}.`] };
	}

	const nodes = character.hexa?.skills ?? [];
	if (nodes.length === 0) {
		return { candidates, notes: ['No HEXA skill nodes captured.'] };
	}

	const fragments = character.hexa?.solErdaFragments;
	const erda = character.hexa?.solErda;

	for (const node of nodes) {
		if (node.type !== 'enhancement') continue;
		const next = hexa.costToNextMilestone(node.type, node.level);
		if (!next || next.finalDamageGained <= 0) continue;

		const affordable =
			(fragments === undefined || fragments >= next.cost.fragments) &&
			(erda === undefined || erda >= next.cost.solErda);

		candidates.push({
			id: `hexa-skill:${node.id}:${node.level}-${next.level}`,
			kind: 'hexa-skill',
			label: `HEXA ${node.id} Lv${node.level} → Lv${next.level}`,
			detail:
				`+${next.finalDamageGained}% Final Damage. Level ${next.level} is a milestone: the step into it is worth ` +
				`${next.level === 30 ? '+11' : '+6'} percentage points on its own.`,
			delta: { fd: next.finalDamageGained },
			cost: {
				solErda: next.cost.solErda,
				solErdaFragments: next.cost.fragments,
				note:
					`${next.cost.solErda} Sol Erda and ${next.cost.fragments.toLocaleString()} fragments` +
					(affordable ? '' : ' — more than you currently hold') +
					`; ${Math.round(next.cost.fragments / next.finalDamageGained)} fragments per point of Final Damage`
			},
			confidence: 'estimated',
			feasibility: affordable ? 'routine' : 'grind',
			notes: [
				'HEXA boost node Final Damage applies only to the one 5th-job skill the node names, and is treated here as if that skill carries the rotation.'
			]
		});
	}

	return { candidates, notes };
}

/**
 * HEXA Stat enhancement.
 *
 * Priced in EXPECTED fragments, because the cost is a random variable: every
 * enhancement levels *some* line, and which one is decided by a roll whose
 * distribution depends on the main line's level. So the gain is an expectation
 * too — the weighted average over which line moves.
 */
export function generateHexaStat(character: Character): CandidateResult {
	const cls = getClass(character.classId);
	const candidates: UpgradeCandidate[] = [];
	const notes: string[] = [];

	if (character.level < hexa.HEXA_UNLOCK_LEVEL) {
		return { candidates, notes: [] };
	}

	const cores = character.hexa?.stat ?? [];
	if (cores.length === 0) {
		return { candidates, notes: ['No HEXA Stat cores captured.'] };
	}

	cores.forEach((core, index) => {
		const level = hexa.hexaStatCoreLevel(core as hexa.HexaStatCore);
		if (level >= hexa.HEXA_STAT_NODE_MAX_LEVEL) return;

		const chances = hexa.enhancementChances(core as hexa.HexaStatCore);
		const lines = [
			{ line: core.main, chance: chances.main, kind: 'main' as const },
			{ line: core.additional[0], chance: chances.additional[0], kind: 'additional' as const },
			{ line: core.additional[1], chance: chances.additional[1], kind: 'additional' as const }
		];

		// Expected gain: each line's own gain, weighted by its chance of being
		// the one that levels.
		const expected: Delta = {};
		const addTo = (delta: Delta, weight: number) => {
			for (const [key, value] of Object.entries(delta) as [keyof Delta, number][]) {
				if (typeof value !== 'number') continue;
				(expected[key] as number | undefined) = ((expected[key] as number) ?? 0) + value * weight;
			}
		};

		let iedExpected = 0;
		for (const { line, chance, kind } of lines) {
			if (chance === 0 || line.level >= hexa.HEXA_STAT_LINE_MAX_LEVEL) continue;
			const gain =
				hexa.hexaStatValue(line.key as hexa.HexaStatKey, line.level + 1, kind) -
				hexa.hexaStatValue(line.key as hexa.HexaStatKey, line.level, kind);
			const weight = chance / 100;

			if (line.key === 'ignoreDefense') {
				iedExpected += gain * weight;
				continue;
			}
			addTo(hexaStatDelta(line.key as hexa.HexaStatKey, gain, cls), weight);
		}
		if (iedExpected > 0) expected.iedAdd = [iedExpected];

		if (isEmpty(expected)) return;

		const cost = hexa.enhancementCost(core as hexa.HexaStatCore);
		candidates.push({
			id: `hexa-stat:core-${index + 1}:${level}-${level + 1}`,
			kind: 'hexa-stat',
			label: `HEXA Stat core ${index + 1}: enhance (${level}/20)`,
			detail:
				`Expected value of one enhancement. It always levels a line; which one is a roll of ` +
				`${chances.main}% main / ${chances.additional[0]}% / ${chances.additional[1]}%.`,
			delta: expected,
			cost: {
				solErdaFragments: cost,
				note: `${cost} fragments per enhancement at main line Lv${core.main.level}; a full 0→20 core averages about ${hexa.EXPECTED_FRAGMENTS_PER_STAT_CORE}`
			},
			// An expectation over a random outcome is a model, not a lookup.
			confidence: 'estimated',
			feasibility: 'routine',
			notes: [
				'You cannot choose which line levels. This is the probability-weighted average outcome, not what you will get.'
			]
		});
	});

	return { candidates, notes };
}

function hexaStatDelta(key: hexa.HexaStatKey, value: number, cls: ClassDef): Delta {
	const main = mainStatOf(cls);
	const sub = subStatOf(cls);
	switch (key) {
		case 'bossDamage':
			return { boss: value };
		case 'damage':
			return { dmg: value };
		case 'criticalDamage':
			return { critDmg: value };
		case 'attack':
			return { att: value };
		case 'mainStat': {
			// HEXA Stat is a "% not applied" final stat, like hyper stats.
			const delta: Delta = {};
			if (main) delta.mainFinal = value;
			else if (sub) delta.subFinal = value;
			return delta;
		}
		default:
			return {};
	}
}
