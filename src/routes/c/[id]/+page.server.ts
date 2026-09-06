// The character page: document + analysis at the selected target.
//
// The analysis endpoint is written by the engine and may not exist yet, so a
// non-200 is captured and rendered inline instead of failing the page.
// `?demo=1` swaps in the fixture from `$lib/ui/fixtures` for eyeballing the UI.

import { error } from '@sveltejs/kit';

import type { Analysis } from '$lib/analysis/types';
import { BOSSES, BOSS_ORDER, getBoss } from '$lib/data/bosses';
import { tryGetClass } from '$lib/data/classes';
import type { Character } from '$lib/schema';
import { humanize } from '$lib/ui/format';
import { DEMO_CHARACTER, demoAnalysis } from '$lib/ui/fixtures';
import { withIconUrls } from '$lib/ui/icons.server';

import type { PageServerLoad } from './$types';

export interface TargetOption {
	id: string;
	label: string;
	kind: 'preset' | 'boss';
}

export interface AnalysisError {
	status: number;
	message: string;
}

const PRESETS: TargetOption[] = [
	{ id: 'grandis', label: 'Grandis — 380% PDR, lv 285', kind: 'preset' },
	{ id: 'arcane', label: 'Arcane River — 300% PDR, lv 255', kind: 'preset' }
];

function targetOptions(): TargetOption[] {
	const bosses = BOSS_ORDER.map((id) => getBoss(id))
		.filter((b): b is (typeof BOSSES)[number] => Boolean(b))
		.map((b) => ({
			id: b.id,
			label: `${humanize(b.difficulty)} ${b.bossName}${b.level ? ` — lv ${b.level}` : ''}`,
			kind: 'boss' as const
		}));
	return [...PRESETS, ...bosses];
}

async function loadAnalysis(
	fetch: typeof globalThis.fetch,
	id: string,
	target: string
): Promise<{ analysis: Analysis | null; analysisError: AnalysisError | null }> {
	try {
		// `includeEarly=1` always: the boss board's early-tier rows are hidden by a
		// client-side toggle (persisted per character in localStorage), so the data
		// has to be here for the toggle to be instant.
		const res = await fetch(
			`/api/characters/${encodeURIComponent(id)}/analysis?target=${encodeURIComponent(target)}&includeEarly=1`
		);

		if (!res.ok) {
			let message = `GET /analysis returned ${res.status}`;
			if ((res.headers.get('content-type') ?? '').includes('json')) {
				const body = (await res.json().catch(() => null)) as { error?: string } | null;
				if (body?.error) message = body.error;
			} else if (res.status === 404) {
				message = 'the analysis endpoint does not exist yet (the engine is still being built)';
			}
			return { analysis: null, analysisError: { status: res.status, message } };
		}

		return { analysis: (await res.json()) as Analysis, analysisError: null };
	} catch (e) {
		return {
			analysis: null,
			analysisError: { status: 0, message: e instanceof Error ? e.message : String(e) }
		};
	}
}

export const load: PageServerLoad = async ({ params, url, fetch }) => {
	const target = url.searchParams.get('target') ?? 'grandis';
	const demo = url.searchParams.has('demo');
	const targets = targetOptions();

	if (demo) {
		return {
			character: withIconUrls(DEMO_CHARACTER),
			className: tryGetClass(DEMO_CHARACTER.classId)?.name ?? DEMO_CHARACTER.classId,
			analysis: demoAnalysis(target),
			analysisError: null as AnalysisError | null,
			demo: true,
			target,
			targets
		};
	}

	const res = await fetch(`/api/characters/${encodeURIComponent(params.id)}`);
	if (res.status === 404) error(404, `No character "${params.id}"`);
	if (!res.ok) error(res.status, `GET /api/characters/${params.id} returned ${res.status}`);

	const character = (await res.json()) as Character;
	const { analysis, analysisError } = await loadAnalysis(fetch, params.id, target);

	return {
		// Sprite URLs are resolved here so the 1.15 MB item catalogue never has to
		// reach the browser — see `$lib/ui/icons.server`.
		character: withIconUrls(character),
		className: tryGetClass(character.classId)?.name ?? character.classId,
		analysis,
		analysisError,
		demo: false,
		target,
		targets
	};
};
