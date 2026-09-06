// Upgrade-capability rules, and where each one comes from.
//
// `catalogue.json` records, per item, a list of RULE IDS. This module is the
// single place that turns an id into prose a user can read and into the
// citation that justifies it. Keeping the prose here (rather than repeating it
// 5,000 times in the JSON) is what keeps the catalogue under 2 MB.
//
// EVERY rule below is traceable to `docs/research/formulas.md` §4A/§4B, which
// in turn cites the original public source. The URLs are repeated inline so a
// reviewer never has to leave this file.

/** Every rule id the catalogue can attach to an entry. */
export const RULE_IDS = [
	'liberated-weapon-fixed-star',
	'destiny-stage-ambiguous',
	'sealed-liberation-weapon',
	'no-upgrade-slots',
	'exclusive-scroll-only',
	'superior-equipment',
	'flame-ineligible-slot',
	'flame-eligible-exception',
	'potential-ineligible-slot',
	'potential-badge-exception',
	'bonus-potential-not-in-heroic',
	'approximate-name-match',
	'unknown-item'
] as const;

export type RuleId = (typeof RULE_IDS)[number];

export interface RuleDoc {
	/** One sentence a user can read next to a suppressed candidate. */
	reason: string;
	/** Research section this was transcribed from. */
	research: string;
	/** Original public sources. */
	sources: readonly string[];
}

export const RULES: Record<RuleId, RuleDoc> = {
	'liberated-weapon-fixed-star': {
		reason:
			'Liberated Genesis and Destiny weapons are granted at a fixed 22★ and cannot be star ' +
			'forced at all — the stars come with the weapon and cannot be raised or lowered.',
		research: 'formulas.md §4A §1.2 "Fixed-star / non-star-forceable items" and §4B §5',
		sources: [
			'https://maplestorywiki.net/w/Genesis_Weapon',
			'https://maplestorywiki.net/w/Destiny_Weapon',
			'https://orangemushroom.net/2025/03/20/kms-ver-1-2-401-maplestory-next-destiny-weapon-star-force-reorganization/'
		]
	},
	'destiny-stage-ambiguous': {
		reason:
			'Destiny weapons come in two transcendence stages that share one item name: Stage 1 is ' +
			'a fixed 22★ and not enhanceable, Stage 2 is 22★ and CAN be enhanced to 25★. The ' +
			'tracker cannot tell them apart from the tooltip name, so it assumes the conservative ' +
			'Stage 1 and offers no star force candidate.',
		research: 'formulas.md §4B §5 "Genesis Weapon and Destiny Weapon"',
		sources: ['https://maplestorywiki.net/w/Destiny_Weapon']
	},
	'sealed-liberation-weapon': {
		reason:
			'A Sealed Genesis weapon is the pre-liberation quest weapon. It has no upgrade slots ' +
			'and takes no star force; liberating it grants the Genesis weapon at a fixed 22★.',
		research: 'formulas.md §4B §5 "Genesis Weapon and Destiny Weapon"',
		sources: ['https://maplestorywiki.net/w/Genesis_Weapon']
	},
	'no-upgrade-slots': {
		reason:
			'This item has no upgrade slots at all, and equipment with no upgrade slots cannot be ' +
			'star forced.',
		research: 'formulas.md §4A §1.2 "Fixed-star / non-star-forceable items"',
		sources: [
			'https://maplestorywiki.net/w/Star_Force_Enhancement',
			'https://github.com/masonym/masonym.dev/blob/main/src/lib/equip/starforce.js'
		]
	},
	'exclusive-scroll-only': {
		reason:
			'This event ring has upgrade slots, but they only accept its own exclusive enhancement ' +
			'currency (Vengeful Stones, Cosmos Atoms, the Awake Ring Exclusive Enhancement Scroll). ' +
			'It takes no star force and stays at 0★.',
		research: 'GMS wiki item pages; the tuc>0 exception to the no-upgrade-slots screen',
		sources: [
			'https://maplestorywiki.net/w/Vengeful_Ring',
			'https://maplestorywiki.net/w/Cosmos_Ring',
			'https://maplestorywiki.net/w/Awake_Ring'
		]
	},
	'superior-equipment': {
		reason:
			'Superior (Tyrant / Nova / Elite Heliseum) gear uses its own star force table, caps far ' +
			'below 30★, still loses a star on failure and triggers Chance Time.',
		research: 'formulas.md §4A §1.2 "Exceptions" and §1.4 "Superior equipment"',
		sources: [
			'https://maplestorywiki.net/w/Star_Force_Enhancement',
			'https://maplestorywiki.net/w/Star_Force_Enhancement/Stat_Tables'
		]
	},
	'flame-ineligible-slot': {
		reason:
			'This equipment type can never receive bonus stats (flames): secondary weapons and ' +
			'shields (incl. Katara), emblems, badges, medals, rings, androids and android/mechanical ' +
			'hearts, shoulders and totems are all excluded. (Pocket items are NOT excluded — they ' +
			'do take flames.)',
		research: 'formulas.md §4A §2.1 "Cannot receive bonus stats at all"',
		sources: [
			'https://maplestorywiki.net/w/Bonus_Stats',
			'https://www.whackybeanz.com/guides/flames',
			'https://strategywiki.org/wiki/MapleStory/Bonus_Stats'
		]
	},
	'flame-eligible-exception': {
		reason:
			'This item is one of the three named exceptions to its slot being flame-ineligible ' +
			'(Immortal Legacy, Scarlet Shoulder, Ancient Slate Replica).',
		research: 'formulas.md §4A §2.1',
		sources: ['https://maplestorywiki.net/w/Bonus_Stats']
	},
	'potential-ineligible-slot': {
		reason:
			'This equipment type never receives potential: medals, badges, pocket items, androids ' +
			'and totems are excluded (android HEARTS can, and are modelled as the heart slot).',
		research: 'formulas.md §4A §3.1 "Never gets potential"',
		sources: [
			'https://maplestorywiki.net/w/Potential',
			'https://strategywiki.org/wiki/MapleStory/Potential_System'
		]
	},
	'potential-badge-exception': {
		reason:
			'Ghost Ship Exorcist, the Sengoku Hakase Badge and Shackles of Resentment are the only ' +
			'badges that take potential.',
		research: 'formulas.md §4A §3.1',
		sources: ['https://maplestorywiki.net/w/Potential']
	},
	'bonus-potential-not-in-heroic': {
		reason:
			'Bonus Potential can only be obtained in Regular/Interactive worlds; it does not exist ' +
			'in Heroic/Reboot, which is the only world scope this tracker models.',
		research: 'formulas.md §4A §3.1 "System summary"',
		sources: ['https://maplestorywiki.net/w/Potential']
	},
	'approximate-name-match': {
		reason:
			'The exact item name is not in the v270 GMS catalogue, so capabilities were resolved ' +
			'from the closest matching catalogue items in the same slot. Check the spelling if a ' +
			'suggestion looks wrong.',
		research: 'src/lib/data/items/index.ts — documented approximate-name fallback',
		sources: []
	},
	'unknown-item': {
		reason:
			'This item name is not in the v270 GMS catalogue, so its capabilities were assumed from ' +
			'its slot alone. Item-specific restrictions could not be checked — treat any suggestion ' +
			'for it with care, and check the name spelling.',
		research: 'src/lib/data/items/index.ts — documented permissive fallback',
		sources: []
	}
};

/** `{ ruleId: reason }` for a list of rule ids, in the order given. */
export function reasonsFor(ids: readonly string[]): Record<string, string> {
	const out: Record<string, string> = {};
	for (const id of ids) {
		const rule = RULES[id as RuleId];
		out[id] = rule ? rule.reason : `unknown capability rule "${id}"`;
	}
	return out;
}
