// Route tests for the three analysis endpoints, against a temp data dir —
// same harness shape as src/routes/api/api.spec.ts.

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { windArcherFixture } from '$lib/analysis/test-fixtures';
import { characters, charactersDir } from '$lib/store';

import { POST as postAnalyze } from './+server';
import { GET as getAnalysis } from '../characters/[id]/analysis/+server';
import { POST as postWhatIf } from '../characters/[id]/what-if/+server';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Handler = (event: any) => Response | Promise<Response>;

async function call(
	handler: Handler,
	{
		params = {},
		body,
		method = 'GET',
		path = '/api'
	}: { params?: Record<string, string>; body?: unknown; method?: string; path?: string } = {}
): Promise<{ status: number; json: any }> {
	const url = new URL(path, 'http://localhost:5173');
	const request = new Request(url, {
		method: body === undefined ? method : method === 'GET' ? 'POST' : method,
		...(body === undefined
			? {}
			: {
					headers: { 'content-type': 'application/json' },
					body: typeof body === 'string' ? body : JSON.stringify(body)
				})
	});
	const response = await handler({ params, request, url });
	const text = await response.text();
	let json: any = null;
	try {
		json = JSON.parse(text);
	} catch {
		json = null;
	}
	return { status: response.status, json };
}

const fixture = windArcherFixture();
const id = fixture.id;

let root: string;

beforeAll(async () => {
	root = await mkdtemp(join(tmpdir(), 'maple-analysis-'));
	process.env.MAPLE_DATA_DIR = root;
});

afterAll(async () => {
	delete process.env.MAPLE_DATA_DIR;
	await rm(root, { recursive: true, force: true });
});

beforeEach(async () => {
	await rm(charactersDir(), { recursive: true, force: true });
	await characters.put(id, windArcherFixture());
});

describe('GET /api/characters/:id/analysis', () => {
	it('returns a full analysis', async () => {
		const { status, json } = await call(getAnalysis, {
			params: { id },
			path: `/api/characters/${id}/analysis`
		});

		expect(status).toBe(200);
		expect(json.target.id).toBe('grandis');
		expect(json.summary.name).toBe('Zephyra');
		expect(json.summary.damageIndex).toBeGreaterThan(0);
		expect(json.calibration.checksums).toHaveLength(3);
		expect(json.upgrades.length).toBeGreaterThan(0);
		expect(json.statWorth).toHaveLength(12);
		expect(json.input.classId).toBe('wind-archer');
		expect(typeof json.generatedAt).toBe('string');
	});

	it('honours target, topN and kinds', async () => {
		const { status, json } = await call(getAnalysis, {
			params: { id },
			path: `/api/characters/${id}/analysis?target=arcane&topN=4&kinds=symbol,hyper-stat`
		});

		expect(status).toBe(200);
		expect(json.target).toMatchObject({ id: 'arcane', pdr: 3, level: 255 });
		expect(json.upgrades).toHaveLength(4);
		for (const upgrade of json.upgrades) expect(['symbol', 'hyper-stat']).toContain(upgrade.kind);

		const unlimited = await call(getAnalysis, {
			params: { id },
			path: `/api/characters/${id}/analysis?kinds=symbol,hyper-stat`
		});
		expect(new Set(unlimited.json.upgrades.map((u: any) => u.kind))).toEqual(
			new Set(['symbol', 'hyper-stat'])
		);
	});

	it('includes the boss board, uncalibrated, and honours includeEarly', async () => {
		const plain = await call(getAnalysis, {
			params: { id },
			path: `/api/characters/${id}/analysis`
		});
		expect(plain.json.bossBoard).toBeDefined();
		// No per-class DPM anchor is sourced yet (design §9) — say so, do not guess.
		expect(plain.json.bossBoard.calibrated).toBe(false);
		const baseRows = plain.json.bossBoard.rows.length;

		const early = await call(getAnalysis, {
			params: { id },
			path: `/api/characters/${id}/analysis?includeEarly=true`
		});
		expect(early.json.bossBoard.rows.length).toBeGreaterThanOrEqual(baseRows);

		const without = await call(getAnalysis, {
			params: { id },
			path: `/api/characters/${id}/analysis?bossBoard=false`
		});
		expect(without.json.bossBoard).toBeUndefined();
	});

	it('resolves a boss id as a target, converting PDR to a decimal', async () => {
		const { status, json } = await call(getAnalysis, {
			params: { id },
			path: `/api/characters/${id}/analysis?target=hard-lucid`
		});
		expect(status).toBe(200);
		expect(json.target.kind).toBe('boss');
		expect(json.target.pdr).toBeLessThan(5);
		expect(json.target.arcaneReq).toBeGreaterThan(0);
	});

	it('409s a character with no stat window, with a helpful message', async () => {
		const bare = windArcherFixture();
		delete bare.statWindow;
		await characters.put(id, bare);

		const { status, json } = await call(getAnalysis, {
			params: { id },
			path: `/api/characters/${id}/analysis`
		});
		expect(status).toBe(409);
		expect(json.error).toContain('stat window');
		expect(json.error).toContain('/stat-window');
	});

	it('404s a missing character', async () => {
		const { status, json } = await call(getAnalysis, {
			params: { id: 'ghost' },
			path: '/api/characters/ghost/analysis'
		});
		expect(status).toBe(404);
		expect(json.error).toContain('No character');
	});

	it('400s an unknown target and an unknown kind', async () => {
		const badTarget = await call(getAnalysis, {
			params: { id },
			path: `/api/characters/${id}/analysis?target=not-a-boss`
		});
		expect(badTarget.status).toBe(400);
		expect(badTarget.json.error).toContain('Unknown target');

		const badKind = await call(getAnalysis, {
			params: { id },
			path: `/api/characters/${id}/analysis?kinds=starforce,nope`
		});
		expect(badKind.status).toBe(400);
		expect(badKind.json.error).toContain('nope');

		const badTopN = await call(getAnalysis, {
			params: { id },
			path: `/api/characters/${id}/analysis?topN=-3`
		});
		expect(badTopN.status).toBe(400);
	});
});

describe('POST /api/characters/:id/what-if', () => {
	it('returns the joint gain plus each delta alone', async () => {
		const { status, json } = await call(postWhatIf, {
			params: { id },
			method: 'POST',
			body: { deltas: [{ att: 30 }, { iedAdd: [40] }], target: 'grandis' }
		});

		expect(status).toBe(200);
		expect(json.target.id).toBe('grandis');
		expect(json.after).toBeGreaterThan(json.before);
		expect(json.marginal).toHaveLength(2);
		const summed = json.marginal.reduce((t: number, m: any) => t + m.gainPercent, 0);
		expect(json.gainPercent).not.toBeCloseTo(summed, 3);
	});

	it('400s a body with no deltas array', async () => {
		const { status, json } = await call(postWhatIf, {
			params: { id },
			method: 'POST',
			body: { target: 'grandis' }
		});
		expect(status).toBe(400);
		expect(json.error).toContain('deltas');
	});

	it('400s an unknown Delta field and a non-array IED source', async () => {
		const typo = await call(postWhatIf, {
			params: { id },
			method: 'POST',
			body: { deltas: [{ bossDamage: 10 }] }
		});
		expect(typo.status).toBe(400);
		expect(typo.json.error).toContain('bossDamage');

		const scalarIed = await call(postWhatIf, {
			params: { id },
			method: 'POST',
			body: { deltas: [{ iedAdd: 40 }] }
		});
		expect(scalarIed.status).toBe(400);
		expect(scalarIed.json.error).toContain('compose');
	});

	it('404s a missing character', async () => {
		const { status } = await call(postWhatIf, {
			params: { id: 'ghost' },
			method: 'POST',
			body: { deltas: [] }
		});
		expect(status).toBe(404);
	});
});

describe('POST /api/analyze', () => {
	it('analyses a character that was never saved', async () => {
		await rm(charactersDir(), { recursive: true, force: true });

		const { status, json } = await call(postAnalyze, {
			method: 'POST',
			body: { character: windArcherFixture(), target: 'arcane', topN: 3 }
		});

		expect(status).toBe(200);
		expect(json.target.id).toBe('arcane');
		expect(json.upgrades).toHaveLength(3);
		expect(json.summary.characterId).toBe(id);
	});

	it('fills in the store-managed timestamps', async () => {
		const character = windArcherFixture() as Record<string, unknown>;
		delete character.createdAt;
		delete character.updatedAt;

		const { status, json } = await call(postAnalyze, {
			method: 'POST',
			body: { character }
		});
		expect(status).toBe(200);
		expect(json.summary.level).toBe(275);
	});

	it('400s a body with no character', async () => {
		const { status, json } = await call(postAnalyze, {
			method: 'POST',
			body: { target: 'arcane' }
		});
		expect(status).toBe(400);
		expect(json.error).toContain('character');
	});

	it('400s an invalid character document with issue paths', async () => {
		const { status, json } = await call(postAnalyze, {
			method: 'POST',
			body: { character: { id: 'x', name: 'X' } }
		});
		expect(status).toBe(400);
		expect(json.issues.length).toBeGreaterThan(0);
	});

	it('409s a character with no stat window', async () => {
		const character = windArcherFixture() as Record<string, unknown>;
		delete character.statWindow;

		const { status, json } = await call(postAnalyze, { method: 'POST', body: { character } });
		expect(status).toBe(409);
		expect(json.error).toContain('stat window');
	});
});
