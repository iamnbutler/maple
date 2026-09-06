import { describe, expect, it } from 'vitest';

import * as calc from './index';

describe('calc', () => {
	it('exposes a module namespace', () => {
		expect(typeof calc).toBe('object');
	});
});
