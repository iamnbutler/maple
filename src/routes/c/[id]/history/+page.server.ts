// Snapshot history. `Snapshot.summary` is deliberately `unknown` in the store —
// the engine decides what it writes — so everything is probed defensively and
// the page charts whatever it finds.

import { error } from '@sveltejs/kit';

import type { Character } from '$lib/schema';
import type { HistoryPoint } from '$lib/ui/types';

import type { PageServerLoad } from './$types';

/** Newest N snapshots to fetch bodies for; older ones are still listed. */
const MAX_BODIES = 200;

function num(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Accepts a bare number or a `Sourced<number>`. */
function sourced(value: unknown): number | undefined {
	if (typeof value === 'number') return num(value);
	if (value && typeof value === 'object' && 'value' in value) {
		return num((value as { value: unknown }).value);
	}
	return undefined;
}

function point(ts: string, snapshot: unknown): HistoryPoint | null {
	if (!snapshot || typeof snapshot !== 'object') return null;
	const { at, character, summary } = snapshot as {
		at?: string;
		character?: Character;
		summary?: unknown;
	};
	if (!character) return null;

	const s = (summary ?? {}) as Record<string, unknown>;
	return {
		ts,
		at: at ?? ts,
		level: character.level,
		equipped: Object.keys(character.equipment ?? {}).length,
		damageIndex: num(s.damageIndex),
		damageIndexArcane: num(s.damageIndexArcane),
		damageIndexGrandis: num(s.damageIndexGrandis),
		combatPower: sourced(s.combatPower)
	};
}

export const load: PageServerLoad = async ({ params, fetch }) => {
	const id = encodeURIComponent(params.id);

	const [charRes, listRes] = await Promise.all([
		fetch(`/api/characters/${id}`),
		fetch(`/api/characters/${id}/history`)
	]);

	if (charRes.status === 404) error(404, `No character "${params.id}"`);
	if (!charRes.ok) error(charRes.status, `GET /api/characters/${params.id} failed`);
	if (!listRes.ok) error(listRes.status, `GET /api/characters/${params.id}/history failed`);

	const character = (await charRes.json()) as Character;
	const { snapshots = [] } = (await listRes.json()) as { snapshots?: { ts: string }[] };

	const wanted = snapshots.slice(-MAX_BODIES);
	const points = (
		await Promise.all(
			wanted.map(async (ref) => {
				const res = await fetch(`/api/characters/${id}/history/${encodeURIComponent(ref.ts)}`);
				if (!res.ok) return null;
				return point(ref.ts, await res.json().catch(() => null));
			})
		)
	).filter((p): p is HistoryPoint => p !== null);

	return {
		character,
		points,
		total: snapshots.length,
		truncated: snapshots.length > wanted.length
	};
};
