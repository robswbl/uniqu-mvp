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
	let saveStatus = 'Ready';
	let expandedInstructions: { [key: string]: boolean } = {};

	function toggleInstructions(key: string) {
		expandedInstructions[key] = !expandedInstructions[key];
	}

	function autogrow(element: HTMLTextAreaElement) {
		element.style.height = 'auto';
		const newHeight = Math.max(element.scrollHeight, 120);
		element.style.height = `${newHeight}px`;
	}

	let timeoutId: ReturnType<typeof setTimeout>;
	async function saveProgress() {
		saveStatus = 'Saving...';
		clearTimeout(timeoutId);
		timeoutId = setTimeout(async () => {
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
				saveStatus = `Error: ${error.message}`;
			} else {
				saveStatus = `Saved at ${new Date().toLocaleTimeString()}`;
			}
		}, 1000);
	}

	async function proceedToStep3() {
		// Save current progress
		await saveProgress();

		// Navigate to step 3
		await goto(`/questionnaire/${sessionId}/final`);
	}

	async function goBack() {
		await goto(`/questionnaire/${sessionId}/cv`);
	}

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
			saveStatus = 'Loaded existing data.';
		}

		// Auto-resize all textareas on load
		setTimeout(() => {
			const textareas = document.querySelectorAll('textarea');
			textareas.forEach((textarea) => autogrow(textarea as HTMLTextAreaElement));
		}, 100);
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
	<!-- Progress Bar -->
	<div class="bg-white shadow-sm">
		<div class="mx-auto max-w-4xl p-4">
			<div class="mb-2 flex items-center justify-between text-sm text-gray-600">
				<span>{$t('ikigai.progress')}</span>
				<span class="rounded bg-gray-100 px-2 py-1 text-xs">{saveStatus}</span>
			</div>
			<div class="h-2 w-full rounded-full bg-gray-200">
				<div
					class="h-2 w-2/3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
				></div>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="mx-auto max-w-4xl p-4">
		<!-- Header -->
		<div class="mb-8 text-center">
			<h1 class="mb-4 text-4xl font-bold text-gray-800">
				{$t('ikigai.heading')}
			</h1>
			<p class="text-lg text-gray-600">
				{$t('ikigai.intro')}
			</p>
		</div>

		<!-- Ikigai Questions -->
		<div class="space-y-8">
			<!-- Love Question -->
			<div class="rounded-2xl bg-white p-8 shadow-xl">
				<div class="mb-6">
					<h2 class="text-2xl font-bold text-gray-800">{$t('ikigai.love_title')}</h2>
					<p class="mt-2 text-gray-600">{$t('ikigai.love_explainer')}</p>
				</div>

				<div class="mb-4">
					<button
						on:click={() => toggleInstructions('love')}
						class="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-800"
						type="button"
					>
						<span>{$t('ikigai.need_inspiration')}</span>
						<svg
							class="h-4 w-4 transition-transform"
							class:rotate-180={expandedInstructions.love}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					{#if expandedInstructions.love}
						<div class="mt-3 rounded-lg bg-purple-50 p-4">
							<p class="text-sm text-green-100">{$t('ikigai.love_inspiration')}</p>
							<p class="mt-1 text-xs text-gray-500 italic">{$t('ikigai.love_examples')}</p>
						</div>
					{/if}
				</div>

				<textarea
					bind:value={ikigai_love}
					on:input={(e) => {
						ikigai_love = e.currentTarget.value;
						saveProgress();
						autogrow(e.currentTarget);
					}}
					placeholder={$t('ikigai.love_placeholder')}
					class="w-full resize-none rounded-lg border border-gray-300 p-4 text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
					rows="4"
				></textarea>
			</div>

			<!-- Good At Question -->
			<div class="rounded-2xl bg-white p-8 shadow-xl">
				<div class="mb-6">
					<h2 class="text-2xl font-bold text-gray-800">{$t('ikigai.good_at_title')}</h2>
					<p class="mt-2 text-gray-600">{$t('ikigai.good_at_explainer')}</p>
				</div>

				<div class="mb-4">
					<button
						on:click={() => toggleInstructions('good_at')}
						class="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-800"
						type="button"
					>
						<span>{$t('ikigai.need_inspiration')}</span>
						<svg
							class="h-4 w-4 transition-transform"
							class:rotate-180={expandedInstructions.good_at}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					{#if expandedInstructions.good_at}
						<div class="mt-3 rounded-lg bg-purple-50 p-4">
							<p class="text-sm text-green-100">{$t('ikigai.good_at_inspiration')}</p>
							<p class="mt-1 text-xs text-gray-500 italic">{$t('ikigai.good_at_examples')}</p>
						</div>
					{/if}
				</div>

				<textarea
					bind:value={ikigai_good_at}
					on:input={(e) => {
						ikigai_good_at = e.currentTarget.value;
						saveProgress();
						autogrow(e.currentTarget);
					}}
					placeholder={$t('ikigai.good_at_placeholder')}
					class="w-full resize-none rounded-lg border border-gray-300 p-4 text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
					rows="4"
				></textarea>
			</div>

			<!-- Care About Question -->
			<div class="rounded-2xl bg-white p-8 shadow-xl">
				<div class="mb-6">
					<h2 class="text-2xl font-bold text-gray-800">{$t('ikigai.care_about_title')}</h2>
					<p class="mt-2 text-gray-600">{$t('ikigai.care_about_explainer')}</p>
				</div>

				<div class="mb-4">
					<button
						on:click={() => toggleInstructions('care_about')}
						class="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-800"
						type="button"
					>
						<span>{$t('ikigai.need_inspiration')}</span>
						<svg
							class="h-4 w-4 transition-transform"
							class:rotate-180={expandedInstructions.care_about}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					{#if expandedInstructions.care_about}
						<div class="mt-3 rounded-lg bg-purple-50 p-4">
							<p class="text-sm text-green-100">{$t('ikigai.care_about_inspiration')}</p>
							<p class="mt-1 text-xs text-gray-500 italic">{$t('ikigai.care_about_examples')}</p>
						</div>
					{/if}
				</div>

				<textarea
					bind:value={ikigai_care_about}
					on:input={(e) => {
						ikigai_care_about = e.currentTarget.value;
						saveProgress();
						autogrow(e.currentTarget);
					}}
					placeholder={$t('ikigai.care_about_placeholder')}
					class="w-full resize-none rounded-lg border border-gray-300 p-4 text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
					rows="4"
				></textarea>
			</div>

			<!-- Inspires Question -->
			<div class="rounded-2xl bg-white p-8 shadow-xl">
				<div class="mb-6">
					<h2 class="text-2xl font-bold text-gray-800">{$t('ikigai.inspires_title')}</h2>
					<p class="mt-2 text-gray-600">{$t('ikigai.inspires_explainer')}</p>
				</div>

				<div class="mb-4">
					<button
						on:click={() => toggleInstructions('inspires')}
						class="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-800"
						type="button"
					>
						<span>{$t('ikigai.need_inspiration')}</span>
						<svg
							class="h-4 w-4 transition-transform"
							class:rotate-180={expandedInstructions.inspires}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					{#if expandedInstructions.inspires}
						<div class="mt-3 rounded-lg bg-purple-50 p-4">
							<p class="text-sm text-green-100">{$t('ikigai.inspires_inspiration')}</p>
							<p class="mt-1 text-xs text-gray-500 italic">{$t('ikigai.inspires_examples')}</p>
						</div>
					{/if}
				</div>

				<textarea
					bind:value={ikigai_inspires}
					on:input={(e) => {
						ikigai_inspires = e.currentTarget.value;
						saveProgress();
						autogrow(e.currentTarget);
					}}
					placeholder={$t('ikigai.inspires_placeholder')}
					class="w-full resize-none rounded-lg border border-gray-300 p-4 text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
					rows="4"
				></textarea>
			</div>

			<!-- Want To Be Question -->
			<div class="rounded-2xl bg-white p-8 shadow-xl">
				<div class="mb-6">
					<h2 class="text-2xl font-bold text-gray-800">{$t('ikigai.want_to_be_title')}</h2>
					<p class="mt-2 text-gray-600">{$t('ikigai.want_to_be_explainer')}</p>
				</div>

				<div class="mb-4">
					<button
						on:click={() => toggleInstructions('want_to_be')}
						class="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-800"
						type="button"
					>
						<span>{$t('ikigai.need_inspiration')}</span>
						<svg
							class="h-4 w-4 transition-transform"
							class:rotate-180={expandedInstructions.want_to_be}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					{#if expandedInstructions.want_to_be}
						<div class="mt-3 rounded-lg bg-purple-50 p-4">
							<p class="text-sm text-green-100">{$t('ikigai.want_to_be_inspiration')}</p>
							<p class="mt-1 text-xs text-gray-500 italic">{$t('ikigai.want_to_be_examples')}</p>
						</div>
					{/if}
				</div>

				<textarea
					bind:value={ikigai_want_to_be}
					on:input={(e) => {
						ikigai_want_to_be = e.currentTarget.value;
						saveProgress();
						autogrow(e.currentTarget);
					}}
					placeholder={$t('ikigai.want_to_be_placeholder')}
					class="w-full resize-none rounded-lg border border-gray-300 p-4 text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
					rows="4"
				></textarea>
			</div>
		</div>

		<!-- Navigation Buttons -->
		<div class="mt-12 flex justify-between">
			<button
				on:click={goBack}
				class="rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 transition-colors hover:bg-gray-50"
				type="button"
			>
				{$t('ikigai.back')}
			</button>

			<button
				on:click={proceedToStep3}
				class="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 text-white transition-all hover:from-purple-700 hover:to-pink-700"
				type="button"
			>
				{$t('ikigai.continue')}
			</button>
		</div>
	</div>
</div>
