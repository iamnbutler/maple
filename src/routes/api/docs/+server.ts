// The extraction guide an external agent follows. Served as raw markdown so it
// can be piped straight into a prompt.

import guide from '$lib/docs/agent-guide.md?raw';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = () =>
	new Response(guide, {
		headers: {
			'content-type': 'text/markdown; charset=utf-8',
			'cache-control': 'no-cache'
		}
	});
