<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		value,
		sub,
		strong = false,
		badge
	}: {
		label: string;
		value: string;
		sub?: string;
		strong?: boolean;
		badge?: Snippet;
	} = $props();
</script>

<div class="metric" class:strong>
	<div class="label">
		{label}
		{#if badge}{@render badge()}{/if}
	</div>
	<div class="value num">{value}</div>
	{#if sub}<div class="sub num">{sub}</div>{/if}
</div>

<style>
	.metric {
		padding: 4px 12px 4px 0;
		min-width: 0;
	}

	.label {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 10px;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-faint);
		white-space: nowrap;
	}

	.value {
		font-size: 15px;
		line-height: 1.25;
		white-space: nowrap;
	}

	.strong .value {
		font-size: 20px;
		color: var(--accent);
	}

	.sub {
		font-size: 11px;
		color: var(--text-dim);
		white-space: nowrap;
	}
</style>
