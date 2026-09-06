<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle,
		actions,
		children
	}: {
		title: string;
		subtitle?: string;
		actions?: Snippet;
		children: Snippet;
	} = $props();
</script>

<section class="section">
	<header>
		<h2>{title}</h2>
		{#if subtitle}<span class="subtitle">{subtitle}</span>{/if}
		<div class="spacer"></div>
		{#if actions}{@render actions()}{/if}
	</header>
	<div class="body">
		{@render children()}
	</div>
</section>

<style>
	.section {
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--panel);
		margin-bottom: 12px;
	}

	header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 10px;
		border-bottom: 1px solid var(--line);
		background: var(--panel-2);
		border-radius: var(--radius) var(--radius) 0 0;
		flex-wrap: wrap;
	}

	.subtitle {
		color: var(--text-faint);
		font-size: 11px;
	}

	.spacer {
		flex: 1;
	}

	.body {
		padding: 8px 10px 10px;
	}
</style>
