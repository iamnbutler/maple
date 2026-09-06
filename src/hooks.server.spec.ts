import { afterEach, describe, expect, it } from 'vitest';

import { handle } from './hooks.server';

/* eslint-disable @typescript-eslint/no-explicit-any */
function event(path: string, init: RequestInit & { token?: string } = {}) {
	const url = new URL(path, 'http://localhost:5173');
	const headers = new Headers(init.headers);
	if (init.token) headers.set('authorization', `Bearer ${init.token}`);
	return { url, request: new Request(url, { ...init, headers }) } as any;
}

const resolve = async () => new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } });

afterEach(() => {
	delete process.env.MAPLE_TOKEN;
});

describe('handle', () => {
	it('passes non-API requests straight through without CORS headers', async () => {
		const response = await handle({ event: event('/'), resolve });
		expect(response.headers.get('access-control-allow-origin')).toBeNull();
	});

	it('adds permissive CORS headers to API responses', async () => {
		const response = await handle({ event: event('/api/characters'), resolve });
		expect(response.headers.get('access-control-allow-origin')).toBe('*');
		expect(response.headers.get('access-control-allow-methods')).toContain('PATCH');
	});

	it('answers preflight with 204', async () => {
		const response = await handle({
			event: event('/api/characters', { method: 'OPTIONS' }),
			resolve
		});
		expect(response.status).toBe(204);
	});

	it('is open when MAPLE_TOKEN is unset', async () => {
		const response = await handle({ event: event('/api/characters'), resolve });
		expect(response.status).toBe(200);
	});

	it('401s an API request without the bearer token', async () => {
		process.env.MAPLE_TOKEN = 'secret';
		const response = await handle({ event: event('/api/characters'), resolve });
		expect(response.status).toBe(401);
		expect(await response.json()).toMatchObject({ error: expect.stringContaining('Unauthorized') });
	});

	it('401s a wrong token and 200s the right one', async () => {
		process.env.MAPLE_TOKEN = 'secret';
		const wrong = await handle({ event: event('/api/characters', { token: 'nope' }), resolve });
		expect(wrong.status).toBe(401);

		const right = await handle({ event: event('/api/characters', { token: 'secret' }), resolve });
		expect(right.status).toBe(200);
	});

	it('keeps /api/docs and /api/schema open when a token is set', async () => {
		process.env.MAPLE_TOKEN = 'secret';
		expect((await handle({ event: event('/api/docs'), resolve })).status).toBe(200);
		expect((await handle({ event: event('/api/schema?name=Item'), resolve })).status).toBe(200);
	});
});
