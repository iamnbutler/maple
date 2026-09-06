<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav>
	<a class="brand" href="/">maple</a>
	<span class="tag">progression tracker</span>
	<div class="spacer"></div>
	<a href="/api/docs">agent guide</a>
	<a href="/api/schema">schema</a>
	<a href="/api/characters">characters.json</a>
</nav>

<main>
	{@render children()}
</main>

<style>
	nav {
		display: flex;
		align-items: baseline;
		gap: 12px;
		padding: 6px 12px;
		border-bottom: 1px solid var(--line);
		background: var(--panel);
		font-size: 11px;
	}

	.brand {
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--text);
	}

	.tag {
		color: var(--text-faint);
	}

	.spacer {
		flex: 1;
	}

	main {
		padding: 12px;
		max-width: 1600px;
		margin: 0 auto;
	}
</style>
