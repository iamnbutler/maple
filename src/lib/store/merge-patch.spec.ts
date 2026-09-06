import { describe, expect, it } from 'vitest';

import { applyMergePatch } from './merge-patch';

describe('applyMergePatch — RFC 7396 §3 examples', () => {
	const cases: [unknown, unknown, unknown][] = [
		[{ a: 'b' }, { a: 'c' }, { a: 'c' }],
		[{ a: 'b' }, { b: 'c' }, { a: 'b', b: 'c' }],
		[{ a: 'b' }, { a: null }, {}],
		[{ a: 'b', b: 'c' }, { a: null }, { b: 'c' }],
		[{ a: ['b'] }, { a: 'c' }, { a: 'c' }],
		[{ a: 'c' }, { a: ['b'] }, { a: ['b'] }],
		[{ a: { b: 'c' } }, { a: { b: 'd', c: null } }, { a: { b: 'd' } }],
		[{ a: [{ b: 'c' }] }, { a: [1] }, { a: [1] }],
		[
			['a', 'b'],
			['c', 'd'],
			['c', 'd']
		],
		[{ a: 'b' }, ['c'], ['c']],
		[{ a: 'b' }, null, null],
		[{ a: 'foo' }, 'bar', 'bar'],
		[null, { a: 'b' }, { a: 'b' }],
		[{ a: 'foo' }, {}, { a: 'foo' }],
		[{ e: null }, { a: 1 }, { e: null, a: 1 }],
		[[1, 2], { a: 'b', c: null }, { a: 'b' }],
		[{}, { a: { bb: { ccc: null } } }, { a: { bb: {} } }]
	];

	it.each(cases)('patches %j with %j', (target, patch, expected) => {
		expect(applyMergePatch(target, patch)).toEqual(expected);
	});

	it('does not mutate its inputs', () => {
		const target = { a: { b: 'c' }, keep: 1 };
		const patch = { a: { b: 'd' } };
		const result = applyMergePatch(target, patch) as Record<string, unknown>;

		expect(target).toEqual({ a: { b: 'c' }, keep: 1 });
		expect(result).toEqual({ a: { b: 'd' }, keep: 1 });
	});

	it('deletes a nested equipment slot', () => {
		const character = { equipment: { hat: { name: 'Hat' }, cape: { name: 'Cape' } } };
		expect(applyMergePatch(character, { equipment: { hat: null } })).toEqual({
			equipment: { cape: { name: 'Cape' } }
		});
	});
});
