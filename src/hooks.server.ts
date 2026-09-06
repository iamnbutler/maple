// Server hooks: optional bearer auth and permissive CORS for `/api/*`.
//
// This is a local, single-user tool. CORS is wide open on purpose so an agent
// (or a browser devtools console) can call the API from anywhere on the box.
// Set `MAPLE_TOKEN` to require `Authorization: Bearer <token>`; `/api/docs` and
// `/api/schema` stay open so an agent can bootstrap itself.

import type { Handle } from '@sveltejs/kit';

const PUBLIC_API_PATHS = new Set(['/api/docs', '/api/schema']);

const CORS_HEADERS: Record<string, string> = {
	'access-control-allow-origin': '*',
	'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
	'access-control-allow-headers': 'Authorization, Content-Type',
	'access-control-max-age': '86400'
};

function isApi(pathname: string): boolean {
	return pathname === '/api' || pathname.startsWith('/api/');
}

function requiresToken(pathname: string): boolean {
	return !PUBLIC_API_PATHS.has(pathname.replace(/\/+$/, '') || pathname);
}

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	if (!isApi(pathname)) return resolve(event);

	// Preflight never carries credentials; answer it before the token check.
	if (event.request.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: CORS_HEADERS });
	}

	const token = process.env.MAPLE_TOKEN;
	if (token && requiresToken(pathname)) {
		const provided = event.request.headers.get('authorization') ?? '';
		if (provided !== `Bearer ${token}`) {
			return new Response(
				JSON.stringify({ error: 'Unauthorized: send Authorization: Bearer <MAPLE_TOKEN>' }),
				{
					status: 401,
					headers: { 'content-type': 'application/json', ...CORS_HEADERS }
				}
			);
		}
	}

	const response = await resolve(event);
	for (const [key, value] of Object.entries(CORS_HEADERS)) response.headers.set(key, value);
	return response;
};
