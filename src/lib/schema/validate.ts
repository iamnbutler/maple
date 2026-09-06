// Non-fatal consistency checks.
//
// These never reject a document: screenshots are lossy and a half-captured item
// is still worth storing. Every write endpoint returns the warnings alongside
// the saved character so the agent can decide whether to re-read a tooltip.
//
// `src/lib/calc/gear.ts` extends this set later with residual-based checks; keep
// this module free of calc imports so it stays usable from the API layer alone.

import { capabilities } from '$lib/data/items';
import type { Character } from './character';
import { CATEGORY_BY_SLOT, STAR_FORCEABLE_CATEGORIES, type Item, type Slot } from './item';
import { ADDITIVE_STAT_KEYS, type StatBlock } from './stats';

/** Component blocks of the tooltip's parenthesised decomposition. */
const COMPONENT_KEYS = ['flame', 'scroll', 'star'] as const;

/**
 * Warnings for a single item.
 *
 * 1. `total` disagrees with `base + flame + scroll + star` (only the component
 *    blocks that are present are summed — GMS classic merges scroll+star into
 *    one cyan number and leaves `star` absent, so requiring all four would make
 *    the check unreachable for most users).
 * 2. `starforce` missing on a star-forceable category (it is never readable from
 *    the tooltip, so it has to be confirmed by hand).
 * 3. `itemLevel` missing (SF / flame / potential tables are keyed on it).
 */
export function itemWarnings(slot: Slot, item: Item): string[] {
	const where = `equipment.${slot} (${item.name})`;
	const warnings: string[] = [];

	if (item.total && item.base) {
		const present = COMPONENT_KEYS.filter((key) => item[key] !== undefined);
		if (present.length > 0) {
			const parts = ['base', ...present];
			const blocks: StatBlock[] = [item.base, ...present.map((key) => item[key] as StatBlock)];

			for (const stat of ADDITIVE_STAT_KEYS) {
				const total = item.total[stat];
				if (total === undefined) continue;
				if (!blocks.some((block) => block[stat] !== undefined)) continue;

				const sum = blocks.reduce((acc, block) => acc + (block[stat] ?? 0), 0);
				if (sum !== total) {
					warnings.push(
						`${where}: total.${stat} is ${total} but ${parts.join('+')} sums to ${sum} — re-read the breakdown or drop the component blocks`
					);
				}
			}
		}
	}

	const category = item.category ?? CATEGORY_BY_SLOT[slot];
	// The category test alone is too coarse: rings are a star-forceable CATEGORY,
	// but 132 of the 184 level-100+ rings cannot take a single star (Ring of
	// Restraint, the whole skill-ring family, ...). Asking the user for a star
	// count on those is not just noise, it contradicts the catalogue's own
	// "cannot be star forced" reason. Consult the item before warning.
	if (item.starforce === undefined && STAR_FORCEABLE_CATEGORIES.includes(category)) {
		const caps = capabilities({ name: item.name, slot, category, itemLevel: item.itemLevel });
		if (caps.canStarforce) {
			warnings.push(
				`${where}: starforce is missing — it cannot be read from a screenshot, ask the user for the star count`
			);
		}
	}

	if (item.itemLevel === undefined) {
		warnings.push(
			`${where}: itemLevel is missing — star force, flame and potential tables cannot be applied`
		);
	}

	return warnings;
}

/** Warnings for a whole character document. */
export function characterWarnings(character: Character): string[] {
	const warnings: string[] = [];
	for (const [slot, item] of Object.entries(character.equipment ?? {})) {
		if (!item) continue;
		warnings.push(...itemWarnings(slot as Slot, item));
	}
	return warnings;
}
