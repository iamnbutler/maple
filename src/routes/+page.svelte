<script lang="ts">
	import { untrack } from 'svelte';

	import { goto, invalidateAll } from '$app/navigation';

	import Section from '$lib/components/Section.svelte';
	import { int, since, timestamp } from '$lib/ui/format';

	let { data } = $props();

	const classNames = $derived(new Map(data.classes.map((c) => [c.id, c.name])));

	const jobGroups = $derived.by(() => {
		const groups = new Map<string, { id: string; name: string }[]>();
		for (const c of data.classes) {
			const list = groups.get(c.jobType);
			if (list) list.push(c);
			else groups.set(c.jobType, [c]);
		}
		return [...groups.entries()];
	});

	let name = $state('');
	let classId = $state(untrack(() => data.classes[0]?.id ?? ''));
	let level = $state(200);
	let world = $state('Kronos');
	let busy = $state(false);
	let error = $state<string | null>(null);
	let issues = $state<{ path?: string; message?: string }[]>([]);

	const CURL = `curl -X POST localhost:5173/api/characters -H 'content-type: application/json' -d '{"name":"YourIGN","classId":"hero","level":287,"world":"Kronos"}'`;

	async function create(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = null;
		issues = [];
		try {
			const res = await fetch('/api/characters', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name, classId, level, world })
			});
			const payload = (await res.json().catch(() => null)) as {
				character?: { id?: string };
				error?: string;
				issues?: { path?: string; message?: string }[];
			} | null;

			if (!res.ok || !payload?.character?.id) {
				error = payload?.error ?? `HTTP ${res.status}`;
				issues = payload?.issues ?? [];
				return;
			}

			name = '';
			await invalidateAll();
			await goto(`/c/${payload.character.id}`);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>maple — characters</title></svelte:head>

{#if data.error}
	<div class="msg bad">{data.error}</div>
{/if}

<Section title="Characters" subtitle="{data.characters.length} tracked">
	{#if data.characters.length}
		<table>
			<thead>
				<tr>
					<th>IGN</th>
					<th>Class</th>
					<th class="right">Level</th>
					<th>World</th>
					<th class="right">Equipped</th>
					<th>Stat window</th>
					<th>Updated</th>
				</tr>
			</thead>
			<tbody>
				{#each data.characters as c (c.id)}
					<tr>
						<td><a href="/c/{c.id}">{c.name}</a> <span class="id">{c.id}</span></td>
						<td>{classNames.get(c.classId) ?? c.classId}</td>
						<td class="right num">{c.level}</td>
						<td>{c.world}</td>
						<td class="right num">{int(Object.keys(c.equipment ?? {}).length)}</td>
						<td class="num dim">
							{#if c.statWindow}
								{since(c.statWindow.capturedAt)}
							{:else}
								<span class="warn">none</span>
							{/if}
						</td>
						<td class="num dim" title={timestamp(c.updatedAt)}>{since(c.updatedAt)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<div class="empty">
			<p>
				No characters yet. This tracker has no game API — characters are created and kept up to date
				by an <strong>external agent</strong> that reads screenshots and writes to the REST API.
				Point it at <a href="/api/docs">/api/docs</a> for the extraction guide and
				<a href="/api/schema">/api/schema</a> for the JSON Schema.
			</p>
			<p class="dim">Bootstrap one from the shell:</p>
			<pre>{CURL}</pre>
			<p class="dim">…or fill in the form below and let the agent flesh it out.</p>
		</div>
	{/if}
</Section>

<Section title="New character" subtitle="POST /api/characters">
	<form onsubmit={create}>
		<label>
			<span>IGN</span>
			<input bind:value={name} required placeholder="Demoheroic" />
		</label>
		<label>
			<span>Class</span>
			<select bind:value={classId}>
				{#each jobGroups as [jobType, list] (jobType)}
					<optgroup label={jobType}>
						{#each list as c (c.id)}
							<option value={c.id}>{c.name}</option>
						{/each}
					</optgroup>
				{/each}
			</select>
		</label>
		<label>
			<span>Level</span>
			<input class="num" type="number" min="1" max="300" bind:value={level} />
		</label>
		<label>
			<span>World</span>
			<input bind:value={world} required />
		</label>
		<button type="submit" disabled={busy || !name}>{busy ? 'Creating…' : 'Create'}</button>
	</form>

	{#if error}
		<div class="msg bad">
			{error}
			{#if issues.length}
				<ul>
					{#each issues as issue, i (i)}
						<li><code>{issue.path ?? '(root)'}</code> {issue.message}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</Section>

<style>
	.id {
		color: var(--text-faint);
		font-size: 10px;
		margin-left: 6px;
	}

	.dim {
		color: var(--text-dim);
	}

	.warn {
		color: var(--warn);
	}

	.empty p {
		margin: 0 0 8px;
		max-width: 76ch;
	}

	.empty pre {
		margin: 0 0 8px;
		padding: 6px 8px;
		background: var(--panel-2);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		font-family: var(--mono);
		font-size: 11px;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-all;
	}

	form {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		flex-wrap: wrap;
	}

	form label {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 10px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	form input[type='number'] {
		width: 70px;
	}

	.msg {
		margin-top: 8px;
		padding: 5px 7px;
		border-radius: var(--radius);
		font-size: 11px;
		border: 1px solid var(--bad);
		color: var(--bad);
		background: #ff6b6b12;
	}

	.msg ul {
		margin: 4px 0 0;
		padding-left: 16px;
	}
</style>
