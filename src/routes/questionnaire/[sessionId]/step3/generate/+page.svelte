<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { fade, scale } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { t } from 'svelte-i18n';

	const sessionId = $page.params.sessionId;
	let isGenerating = false;
	let showCard = false;

	onMount(() => {
		setTimeout(() => {
			showCard = true;
		}, 600); // longer delay for anticipation
	});

	async function handleGenerate() {
		isGenerating = true;
		await fetch(`/questionnaire/${sessionId}/step3/regenerate`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'regenerate' })
		});
		const urlParams = get(page).url.searchParams;
		const fromOnboarding = urlParams.get('from') === 'onboarding';
		const nextUrl = fromOnboarding
			? `/results/${sessionId}/generating?from=onboarding`
			: `/results/${sessionId}/generating`;
		goto(nextUrl);
	}
</script>

<svelte:head>
	<title>{$t('step3.generate.title')} - {$t('app.title')}</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6"
>
	{#if showCard}
		<div
			class="mx-auto w-2/3 max-w-3xl rounded-2xl bg-white p-8 text-center shadow-xl"
			in:scale={{ duration: 2000, start: 0.95 }}
		>
			<div class="flex flex-col items-center">
				<div class="mb-6 animate-bounce text-6xl" in:fade={{ duration: 2000 }}>{'🎉'}</div>
			</div>
			<h1 class="mb-6 text-3xl font-bold text-gray-800">{$t('step3.generate.congrats_heading')}</h1>
			<p class="mb-8 text-lg text-gray-700">
				{$t('step3.generate.congrats_text')}
			</p>
			<p class="text-md mb-12 text-gray-600">
				{$t('step3.generate.next_chapter')}
			</p>
			<div class="flex justify-center">
				<button
					class="flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-12 py-4 text-2xl font-bold text-white shadow-lg transition-all duration-200 hover:from-orange-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
					style="display: flex !important; visibility: visible !important; opacity: 1 !important;"
					on:click={handleGenerate}
					disabled={isGenerating}
					type="button"
				>
					{isGenerating ? $t('step3.generate.generating') : $t('step3.generate.generate_now')}
				</button>
			</div>
		</div>
	{/if}
</div>
