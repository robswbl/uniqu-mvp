<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { t } from 'svelte-i18n';

	const sessionId = $page.params.sessionId;

	let ikigai_love = '';
	let ikigai_good_at = '';
	let ikigai_care_about = '';
	let ikigai_inspires = '';
	let ikigai_want_to_be = '';
	let saveStatus = '';
	let isSaving = false;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let showInspiration = {
		love: false,
		good_at: false,
		care_about: false,
		inspires: false,
		want_to_be: false
	};

	onMount(async () => {
		const { data } = await supabase
			.from('questionnaire_sessions')
			.select('ikigai_love, ikigai_good_at, ikigai_care_about, ikigai_inspires, ikigai_want_to_be')
			.eq('id', sessionId)
			.single();

		if (data) {
			ikigai_love = data.ikigai_love || '';
			ikigai_good_at = data.ikigai_good_at || '';
			ikigai_care_about = data.ikigai_care_about || '';
			ikigai_inspires = data.ikigai_inspires || '';
			ikigai_want_to_be = data.ikigai_want_to_be || '';
			saveStatus = $t('step3.loaded_existing_data');
		}
	});

	function markAsChanged() {
		if (saveTimeout) clearTimeout(saveTimeout);
		isSaving = true;
		saveStatus = $t('step3.saving');
		saveTimeout = setTimeout(saveProgress, 600);
	}

	async function saveProgress() {
		const { error } = await supabase
			.from('questionnaire_sessions')
			.update({
				ikigai_love,
				ikigai_good_at,
				ikigai_care_about,
				ikigai_inspires,
				ikigai_want_to_be
			})
			.eq('id', sessionId);
		if (error) {
			saveStatus = $t('step3.error_saving');
		} else {
			saveStatus = $t('step3.saved');
		}
		isSaving = false;
		setTimeout(() => saveStatus = '', 1200);
	}

	async function goToNext() {
		goto(`/questionnaire/${sessionId}/final`);
	}

	function goToBack() {
		goto(`/questionnaire/${sessionId}/step2`);
	}
</script>

<svelte:head>
	<title>{$t('step3.title')} - {$t('app.title')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
	<div class="max-w-4xl mx-auto p-6 md:p-8">
		<div class="text-center mb-12">
			<div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-6">
				<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
				</svg>
			</div>
			<h1 class="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
				{$t('step3.heading')}
			</h1>
			<p class="text-xl text-gray-600 max-w-2xl mx-auto">
				{$t('step3.intro')}
			</p>
		</div>
		<div class="bg-white rounded-2xl shadow-xl p-8 mb-8 flex flex-col min-h-[500px] space-y-8">
			{#if saveStatus}
				<span class="absolute top-4 right-4 text-sm text-gray-500">{saveStatus}</span>
			{/if}

			<!-- Ikigai: What do you love? -->
			<div class="bg-red-50 rounded-xl p-6 border-l-4 border-red-400">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">❤️</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">{$t('step3.love.title')}</h2>
				</div>
				<button type="button" class="text-sm text-red-700 underline mb-2" on:click={() => showInspiration.love = !showInspiration.love}>
					{showInspiration.love ? $t('step3.love.hide_inspiration') : $t('step3.love.show_inspiration')}
				</button>
				{#if showInspiration.love}
					<div class="p-4 bg-red-50 rounded-lg border border-red-200 space-y-3 mb-2">
						<p class="text-gray-600 text-sm">{$t('step3.love.inspiration_text')}</p>
						<p class="text-gray-500 text-xs italic">{$t('step3.love.inspiration_examples')}</p>
					</div>
				{/if}
				<textarea
					bind:value={ikigai_love}
					on:input={markAsChanged}
					placeholder={$t('step3.love.textarea_placeholder')}
					class="w-full rounded-lg border-gray-300 shadow-sm focus:border-red-400 focus:ring-red-400 resize-none overflow-hidden min-h-[100px] p-4 mb-2"
				></textarea>
			</div>

			<!-- Ikigai: What are you great at? -->
			<div class="bg-blue-50 rounded-xl p-6 border-l-4 border-blue-400">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">⭐</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">{$t('step3.good_at.title')}</h2>
				</div>
				<button type="button" class="text-sm text-blue-700 underline mb-2" on:click={() => showInspiration.good_at = !showInspiration.good_at}>
					{showInspiration.good_at ? $t('step3.good_at.hide_inspiration') : $t('step3.good_at.show_inspiration')}
				</button>
				{#if showInspiration.good_at}
					<div class="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3 mb-2">
						<p class="text-gray-600 text-sm">{$t('step3.good_at.inspiration_text')}</p>
						<p class="text-gray-500 text-xs italic">{$t('step3.good_at.inspiration_examples')}</p>
					</div>
				{/if}
				<textarea
					bind:value={ikigai_good_at}
					on:input={markAsChanged}
					placeholder={$t('step3.good_at.textarea_placeholder')}
					class="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-400 focus:ring-blue-400 resize-none overflow-hidden min-h-[100px] p-4 mb-2"
				></textarea>
			</div>

			<!-- Ikigai: What do you care about? -->
			<div class="bg-green-50 rounded-xl p-6 border-l-4 border-green-400">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-gradient-to-r from-green-400 to-teal-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">🌍</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">{$t('step3.care_about.title')}</h2>
				</div>
				<button type="button" class="text-sm text-green-700 underline mb-2" on:click={() => showInspiration.care_about = !showInspiration.care_about}>
					{showInspiration.care_about ? $t('step3.care_about.hide_inspiration') : $t('step3.care_about.show_inspiration')}
				</button>
				{#if showInspiration.care_about}
					<div class="p-4 bg-green-50 rounded-lg border border-green-200 space-y-3 mb-2">
						<p class="text-gray-600 text-sm">{$t('step3.care_about.inspiration_text')}</p>
						<p class="text-gray-500 text-xs italic">{$t('step3.care_about.inspiration_examples')}</p>
					</div>
				{/if}
				<textarea
					bind:value={ikigai_care_about}
					on:input={markAsChanged}
					placeholder={$t('step3.care_about.textarea_placeholder')}
					class="w-full rounded-lg border-gray-300 shadow-sm focus:border-green-400 focus:ring-green-400 resize-none overflow-hidden min-h-[100px] p-4 mb-2"
				></textarea>
			</div>

			<!-- Ikigai: What inspires you? -->
			<div class="bg-orange-50 rounded-xl p-6 border-l-4 border-orange-400">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">🚀</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">{$t('step3.inspires.title')}</h2>
				</div>
				<button type="button" class="text-sm text-orange-700 underline mb-2" on:click={() => showInspiration.inspires = !showInspiration.inspires}>
					{showInspiration.inspires ? $t('step3.inspires.hide_inspiration') : $t('step3.inspires.show_inspiration')}
				</button>
				{#if showInspiration.inspires}
					<div class="p-4 bg-orange-50 rounded-lg border border-orange-200 space-y-3 mb-2">
						<p class="text-gray-600 text-sm">{$t('step3.inspires.inspiration_text')}</p>
						<p class="text-gray-500 text-xs italic">{$t('step3.inspires.inspiration_examples')}</p>
					</div>
				{/if}
				<textarea
					bind:value={ikigai_inspires}
					on:input={markAsChanged}
					placeholder={$t('step3.inspires.textarea_placeholder')}
					class="w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-400 focus:ring-orange-400 resize-none overflow-hidden min-h-[100px] p-4 mb-2"
				></textarea>
			</div>

			<!-- Ikigai: Who do you want to become? -->
			<div class="bg-purple-50 rounded-xl p-6 border-l-4 border-purple-400">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">🎯</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">{$t('step3.want_to_be.title')}</h2>
				</div>
				<button type="button" class="text-sm text-purple-700 underline mb-2" on:click={() => showInspiration.want_to_be = !showInspiration.want_to_be}>
					{showInspiration.want_to_be ? $t('step3.want_to_be.hide_inspiration') : $t('step3.want_to_be.show_inspiration')}
				</button>
				{#if showInspiration.want_to_be}
					<div class="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-3 mb-2">
						<p class="text-gray-600 text-sm">{$t('step3.want_to_be.inspiration_text')}</p>
						<p class="text-gray-500 text-xs italic">{$t('step3.want_to_be.inspiration_examples')}</p>
					</div>
				{/if}
				<textarea
					bind:value={ikigai_want_to_be}
					on:input={markAsChanged}
					placeholder={$t('step3.want_to_be.textarea_placeholder')}
					class="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-400 focus:ring-purple-400 resize-none overflow-hidden min-h-[100px] p-4 mb-2"
				></textarea>
			</div>
		</div>
		<div class="flex justify-between mt-8">
			<button on:click={goToBack} class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
				{$t('buttons.back')}
			</button>
			<button
				on:click={goToNext}
				class="px-8 py-3 bg-gradient-to-r from-pink-600 to-orange-500 text-white font-semibold rounded-lg shadow-lg hover:from-pink-700 hover:to-orange-600 transition-colors text-lg"
				disabled={isSaving}
			>
				{$t('buttons.next')}
			</button>
		</div>
	</div>
</div> 