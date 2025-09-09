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
	let isSaving = false;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	// Removed showInspiration - now using consistent bullet point pattern

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
		}
	});

	function markAsChanged() {
		if (saveTimeout) clearTimeout(saveTimeout);
		isSaving = true;
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
			// Error occurred, but we don't need to display it
		}
		isSaving = false;
		setTimeout(() => {
			// Reset saving state
		}, 1200);
	}

	async function goToNext() {
		goto(`/questionnaire/${sessionId}/step3/generate`);
	}

	function goToBack() {
		goto(`/questionnaire/${sessionId}/step2`);
	}
</script>

<svelte:head>
	<title>{$t('step3.title')} - {$t('app.title')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
	<div class="mx-auto max-w-4xl p-6 md:p-8">
		<div class="mb-12 text-center">
			<div
				class="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
			>
				<svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
					></path>
				</svg>
			</div>
			<h1
				class="mb-4 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-4xl font-bold text-transparent"
			>
				{$t('step3.heading')}
			</h1>
			<p class="mx-auto max-w-2xl text-xl text-gray-600">
				{$t('step3.intro')}
			</p>
		</div>
		<div class="mb-8 flex min-h-[500px] flex-col space-y-8 rounded-2xl bg-white p-8 shadow-xl">

			<!-- Ikigai: What do you love? -->
			<div class="rounded-xl border-l-4 border-red-400 bg-red-50 p-6">
				<div class="mb-4 flex items-center">
					<div
						class="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-red-400 to-pink-500"
					>
						<span class="text-lg font-bold text-white">❤️</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">{$t('step3.love.title')}</h2>
				</div>
				<div class="mb-4 space-y-4">
					<div class="rounded-lg bg-red-50 p-4">
						<p class="mb-2 text-sm text-red-800">
							💡 <strong>{$t('step3.love.inspiration_text')}</strong>
						</p>
						<ul class="space-y-1 text-sm text-red-700">
							<li>• {$t('step3.love.inspiration_examples')}</li>
						</ul>
					</div>
					<textarea
						bind:value={ikigai_love}
						on:input={markAsChanged}
						placeholder={$t('step3.love.textarea_placeholder')}
						class="mb-2 min-h-[100px] w-full resize-y rounded-lg border-gray-300 p-4 shadow-sm focus:border-red-400 focus:ring-red-400"
					></textarea>
				</div>
			</div>

			<!-- Ikigai: What are you great at? -->
			<div class="rounded-xl border-l-4 border-blue-400 bg-blue-50 p-6">
				<div class="mb-4 flex items-center">
					<div
						class="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"
					>
						<span class="text-lg font-bold text-white">⭐</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">{$t('step3.good_at.title')}</h2>
				</div>
				<div class="mb-4 space-y-4">
					<div class="rounded-lg bg-blue-50 p-4">
						<p class="mb-2 text-sm text-blue-800">
							💡 <strong>{$t('step3.good_at.inspiration_text')}</strong>
						</p>
						<ul class="space-y-1 text-sm text-blue-700">
							<li>• {$t('step3.good_at.inspiration_examples')}</li>
						</ul>
					</div>
					<textarea
						bind:value={ikigai_good_at}
						on:input={markAsChanged}
						placeholder={$t('step3.good_at.textarea_placeholder')}
						class="mb-2 min-h-[100px] w-full resize-y rounded-lg border-gray-300 p-4 shadow-sm focus:border-blue-400 focus:ring-blue-400"
					></textarea>
				</div>
			</div>

			<!-- Ikigai: What do you care about? -->
			<div class="rounded-xl border-l-4 border-green-400 bg-green-50 p-6">
				<div class="mb-4 flex items-center">
					<div
						class="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-green-400 to-teal-500"
					>
						<span class="text-lg font-bold text-white">🌍</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">{$t('step3.care_about.title')}</h2>
				</div>
				<div class="mb-4 space-y-4">
					<div class="rounded-lg bg-green-50 p-4">
						<p class="mb-2 text-sm text-green-800">
							💡 <strong>{$t('step3.care_about.inspiration_text')}</strong>
						</p>
						<ul class="space-y-1 text-sm text-green-700">
							<li>• {$t('step3.care_about.inspiration_examples')}</li>
						</ul>
					</div>
					<textarea
						bind:value={ikigai_care_about}
						on:input={markAsChanged}
						placeholder={$t('step3.care_about.textarea_placeholder')}
						class="mb-2 min-h-[100px] w-full resize-y rounded-lg border-gray-300 p-4 shadow-sm focus:border-green-400 focus:ring-green-400"
					></textarea>
				</div>
			</div>

			<!-- Ikigai: What inspires you? -->
			<div class="rounded-xl border-l-4 border-orange-400 bg-orange-50 p-6">
				<div class="mb-4 flex items-center">
					<div
						class="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-orange-400 to-pink-500"
					>
						<span class="text-lg font-bold text-white">🚀</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">{$t('step3.inspires.title')}</h2>
				</div>
				<div class="mb-4 space-y-4">
					<div class="rounded-lg bg-orange-50 p-4">
						<p class="mb-2 text-sm text-orange-800">
							💡 <strong>{$t('step3.inspires.inspiration_text')}</strong>
						</p>
						<ul class="space-y-1 text-sm text-orange-700">
							<li>• {$t('step3.inspires.inspiration_examples')}</li>
						</ul>
					</div>
					<textarea
						bind:value={ikigai_inspires}
						on:input={markAsChanged}
						placeholder={$t('step3.inspires.textarea_placeholder')}
						class="mb-2 min-h-[100px] w-full resize-y rounded-lg border-gray-300 p-4 shadow-sm focus:border-orange-400 focus:ring-orange-400"
					></textarea>
				</div>
			</div>

			<!-- Ikigai: Who do you want to become? -->
			<div class="rounded-xl border-l-4 border-purple-400 bg-purple-50 p-6">
				<div class="mb-4 flex items-center">
					<div
						class="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-400 to-pink-500"
					>
						<span class="text-lg font-bold text-white">🎯</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">{$t('step3.want_to_be.title')}</h2>
				</div>
				<div class="mb-4 space-y-4">
					<div class="rounded-lg bg-purple-50 p-4">
						<p class="mb-2 text-sm text-purple-800">
							💡 <strong>{$t('step3.want_to_be.inspiration_text')}</strong>
						</p>
						<ul class="space-y-1 text-sm text-purple-700">
							<li>• {$t('step3.want_to_be.inspiration_examples')}</li>
						</ul>
					</div>
					<textarea
						bind:value={ikigai_want_to_be}
						on:input={markAsChanged}
						placeholder={$t('step3.want_to_be.textarea_placeholder')}
						class="mb-2 min-h-[100px] w-full resize-y rounded-lg border-gray-300 p-4 shadow-sm focus:border-purple-400 focus:ring-purple-400"
					></textarea>
				</div>
			</div>
		</div>
		<div class="mt-8 flex justify-between">
			<button
				on:click={goToBack}
				class="rounded-lg bg-gray-200 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-300"
			>
				{$t('buttons.back')}
			</button>
			<button
				on:click={goToNext}
				class="rounded-lg bg-gradient-to-r from-pink-600 to-orange-500 px-8 py-3 text-lg font-semibold text-white shadow-lg transition-colors hover:from-pink-700 hover:to-orange-600"
				disabled={isSaving}
			>
				{$t('buttons.next')}
			</button>
		</div>
	</div>
</div>
