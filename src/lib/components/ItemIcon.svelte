<script lang="ts">
	import type { Item } from '$lib/schema';
	import { resolveIconUrl } from '$lib/ui/icons';

	let {
		item,
		size = 40,
		fallbackWidth,
		fallback = 'name'
	}: {
		item?: Item;
		size?: number;
		/** Width for the text fallback, when the tile has more room than the icon. */
		fallbackWidth?: number;
		/** What to draw when there is no icon: the item name, or nothing at all. */
		fallback?: 'name' | 'none';
	} = $props();

	const fbWidth = $derived(fallbackWidth ?? size);

	const src = $derived(resolveIconUrl(item));

	// Remember which URL failed rather than a bare boolean, so a different item
	// (or a catalogue that lands later) gets a fresh attempt.
	let broken = $state<string | null>(null);
	const showImage = $derived(Boolean(src) && broken !== src);
</script>

{#if showImage && src}
	<img
		class="icon"
		style:--size="{size}px"
		{src}
		alt={item?.name ?? ''}
		width={size}
		height={size}
		loading="lazy"
		decoding="async"
		onerror={() => (broken = src)}
	/>
{:else if fallback === 'name' && item}
	<span class="fallback" style:--fb="{fbWidth}px">{item.name}</span>
{/if}

<style>
	.icon {
		display: block;
		width: var(--size);
		height: var(--size);
		object-fit: contain;
		/* maplestory.io sprites are 40×40 pixel art — never smooth them. */
		image-rendering: pixelated;
	}

	/* No icon: the item's name, clamped. Small, but a slot must never look empty
	   just because the catalogue has no entry for what is in it. */
	.fallback {
		display: -webkit-box;
		-webkit-line-clamp: 4;
		line-clamp: 4;
		-webkit-box-orient: vertical;
		overflow: hidden;
		width: var(--fb);
		font-size: 8px;
		line-height: 1.1;
		text-align: center;
		overflow-wrap: anywhere;
		color: var(--text);
	}
</style>
