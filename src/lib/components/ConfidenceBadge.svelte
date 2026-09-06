<script lang="ts">
	import type { Confidence } from '$lib/analysis/types';

	let {
		confidence,
		note,
		compact = false
	}: { confidence: Confidence; note?: string; compact?: boolean } = $props();

	const SHORT: Record<Confidence, string> = {
		exact: 'exact',
		sourced: 'sourced',
		estimated: 'est.',
		speculative: 'spec.'
	};
</script>

<span class="badge {confidence}" title={note ?? `confidence: ${confidence}`}>
	{compact ? SHORT[confidence] : confidence}
</span>

<style>
	.badge {
		display: inline-block;
		font-size: 10px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 0 4px;
		border-radius: 3px;
		border: 1px solid currentColor;
		line-height: 15px;
		white-space: nowrap;
		vertical-align: 1px;
	}
	.exact {
		color: var(--good);
	}
	.sourced {
		color: var(--info);
	}
	.estimated {
		color: var(--warn);
	}
	.speculative {
		color: var(--bad);
	}
</style>
