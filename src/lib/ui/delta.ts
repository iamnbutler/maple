// Human-readable rendering of a `Delta` from the calc contract.
//
// Upgrades carry their own `label`; this is for the stat-worth table and for
// showing an upgrade's underlying change when the label is terse.

import type { Delta } from '$lib/calc/types';

function signed(n: number, digits = 0): string {
	const body = Number.isInteger(n) ? String(n) : n.toFixed(digits || 2);
	return n >= 0 ? `+${body}` : body;
}

/** Each non-empty channel of a delta as a short phrase, in a stable order. */
export function deltaParts(delta: Delta): string[] {
	const parts: string[] = [];
	const push = (value: number | undefined, render: (n: number) => string) => {
		if (value !== undefined && value !== 0) parts.push(render(value));
	};

	push(delta.mainFlat, (n) => `${signed(n)} main stat`);
	push(delta.mainFinal, (n) => `${signed(n)} final main stat`);
	push(delta.mainPct, (n) => `${signed(n)}% main stat`);
	push(delta.subFlat, (n) => `${signed(n)} sub stat`);
	push(delta.subFinal, (n) => `${signed(n)} final sub stat`);
	push(delta.subPct, (n) => `${signed(n)}% sub stat`);
	push(delta.allStatPct, (n) => `${signed(n)}% all stat`);
	push(delta.att, (n) => `${signed(n)} ATT`);
	push(delta.attPct, (n) => `${signed(n)}% ATT`);
	push(delta.dmg, (n) => `${signed(n)}% dmg`);
	push(delta.boss, (n) => `${signed(n)}% boss`);
	push(delta.fd, (n) => `${signed(n)}% final dmg`);
	push(delta.critDmg, (n) => `${signed(n)}% crit dmg`);
	push(delta.critRate, (n) => `${signed(n)}% crit rate`);
	push(delta.arcane, (n) => `${signed(n)} arcane force`);
	push(delta.sacred, (n) => `${signed(n)} sacred force`);

	for (const ied of delta.iedAdd ?? []) parts.push(`+${ied}% IED line`);
	for (const ied of delta.iedRemove ?? []) parts.push(`−${ied}% IED line`);

	return parts;
}

/** One-line form, e.g. `"+1 ATT"` or `"+10 main stat, +1% boss"`. */
export function describeDelta(delta: Delta): string {
	const parts = deltaParts(delta);
	return parts.length ? parts.join(', ') : 'no change';
}
